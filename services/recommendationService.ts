import { mediaService } from './mediaService';
import { getDB } from './databaseService';

// We track the last fetched page strings to broadly avoid instant repetition in a single session
const fetchedPages = new Set<string>();

/**
 * Returns a list of all mal_ids currently stored in the user's SQLite library
 */
const getExcludedLibraryIds = async (): Promise<Set<number>> => {
    try {
        const db = await getDB();
        const rows = await db.getAllAsync('SELECT mal_id FROM library_media;');
        return new Set(rows.map((r: any) => r.mal_id));
    } catch (e) {
        console.error('[RecommendationService] Failed to load SQLite exclusion list.', e);
        return new Set();
    }
};

/**
 * Fetches exactly one Random Page from the API dynamically bounded by the endpoint's true length.
 */
const fetchRandomPage = async (mode: string, options: any): Promise<any[]> => {
    let maxPages = 200; // Safe upper bound default
    let page1Data = null;

    try {
        // 1. Fetch Page 1 securely to determine absolute true pagination bounds.
        // Because TanStack caches this, 99% of loops will hit RAM for 0ms network latency!
        const firstPageRes = await mediaService.getMediaBatch(mode, 1, { ...options, limit: 25 });
        if (firstPageRes) {
            maxPages = firstPageRes.lastVisiblePage || 1;
            page1Data = firstPageRes.data || [];
        }
    } catch (e) {
        console.warn(`[RecommendationService] Failed to dynamically scope ${mode} max pages. Proceeding with safe subset.`);
    }

    // Fast-path: If there's only 1 page mathematically existing, don't even roll the dice!
    if (maxPages <= 1 && page1Data) {
        return page1Data;
    }

    // 2. Generate a secure random bounded sequence capped at MaxPages (or 200 hard max)
    const safeMax = Math.min(maxPages, 200);
    let randomPage = Math.floor(Math.random() * safeMax) + 1;

    // Fast-path: If the dice hit 1, we already have the memory buffer ready
    if (randomPage === 1 && page1Data) {
        return page1Data;
    }

    // 3. Prevent duplicate back-to-back fetching
    let pageKey = `${mode}-${JSON.stringify(options)}-${randomPage}`;
    if (fetchedPages.has(pageKey)) {
        // Safely bump the page, overflowing back to 1 if we hit the ceiling
        randomPage = randomPage >= safeMax ? 1 : randomPage + 1;
        pageKey = `${mode}-${JSON.stringify(options)}-${randomPage}`;
        if (randomPage === 1 && page1Data) return page1Data; // fast path collision
    }

    fetchedPages.add(pageKey);
    // Keep history ring buffer lean
    if (fetchedPages.size > 50) {
        const firstArr = Array.from(fetchedPages);
        fetchedPages.delete(firstArr[0]);
    }

    // 4. Fire the precise clamped Jikan fetch
    try {
        const res = await mediaService.getMediaBatch(mode, randomPage, { ...options, limit: 25 });
        return res?.data || [];
    } catch (e) {
        console.error('[RecommendationService] Random Page Fetch Failed.', e);
        return [];
    }
};

export const recommendationService = {
    /**
     * Replaces `initializeSession` and `getNextBatch`. 
     * Simply returns a small, locally-shuffled array of strictly valid items.
     */
    getNextBatch: async (mode: string, options: any, library: any[] = [], count: number = 10): Promise<any[]> => {
        // 1. Get the SQLite Database exclusion list
        const excludedIds = await getExcludedLibraryIds();

        // 2. Add any context-level library items just in case (e.g. recent UI swipes)
        library.forEach(l => excludedIds.add(l.mal_id));

        let validCandidates: any[] = [];
        let attempts = 0;

        // 3. Fetch random pages until we have enough valid new items, or we hit a max retry cap
        while (validCandidates.length < count && attempts < 3) {
            attempts++;
            const rawPageItems = await fetchRandomPage(mode, options);

            // Filter strictly against the SQLite / Context sets
            const newItems = rawPageItems.filter(item => !excludedIds.has(item.mal_id));
            validCandidates = [...validCandidates, ...newItems];
        }

        // 4. Securely shuffle the final valid candidate array locally
        const shuffled = [...validCandidates].sort(() => 0.5 - Math.random());

        // 5. Slice and return the requested buffer amount (usually 10-15 cards max)
        return shuffled.slice(0, count);
    },

    recordSwipe: async (animeId: number) => {
        // The swiper relies on `addToLibrary` to permanently record "Plan to Watch" items in SQLite.
        // We do not need a JS memory `recentHistory` anymore because we enforce Random Pages + Shuffling!
        // This function is kept for backward API interface compatibility if needed later.
    },

    triggerBackgroundRefill: async (mode: string, options: any) => {
        // The background refill is now fully managed by the Controller hook `useEndlessSwiper`.
        // This relies purely on `getNextBatch` executing when `currentIndex > buffer.length - 3`
    },

    getNextRecommendation: async (mode: string, options: any, library: any[]) => {
        const batch = await recommendationService.getNextBatch(mode, options, library, 1);
        if (batch && batch.length > 0) {
            return batch[0];
        }
        return null;
    },

    getRandomRecommendation: async (mode: string, genresToUse: any[], selectedMap: any, logicToUse: string, library: any[]) => {
        const activeGenres = genresToUse.filter(g => selectedMap[g.mal_id]);
        if (activeGenres.length === 0) return null;

        let options: any = { limit: 25 };

        if (logicToUse === 'OR') {
            const isAllSelected = activeGenres.length === genresToUse.length;
            if (!isAllSelected) {
                const randomGenre = activeGenres[Math.floor(Math.random() * activeGenres.length)];
                options.genres = randomGenre.mal_id.toString();
            }
        } else {
            const combinedIds = activeGenres.map(g => g.mal_id).join(',');
            options.genres = combinedIds;
        }

        return await recommendationService.getNextRecommendation(mode, options, library);
    },

    resetSessionCaches: () => {
        // We only clear the strict page seed history.
        // Because there is no longer a massive stateful buffer, memory leaks are permanently eliminated here.
        fetchedPages.clear();
    }
};
