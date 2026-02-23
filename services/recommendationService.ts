import { mediaService } from './mediaService';

// 1. ENGINE SESSION
let session = {
    mediaMode: null as string | null,
    optionsStr: null as string | null, // To track if filters changed
    globalPool: [] as any[],
    librarySet: new Set<number>(),
    recentHistoryQueue: [] as number[],
    recentHistorySet: new Set<number>(),
    nextPage: 1,
    hasNextPage: true,
};

const HISTORY_LIMIT = 40;
let fetchLock = false;

const initSessionIfNeeded = (mode: string, options: any, library: any[]) => {
    const optsStr = JSON.stringify(options || {});
    if (session.mediaMode !== mode || session.optionsStr !== optsStr) {
        // Mode or filters changed -> Destroy session
        session = {
            mediaMode: mode,
            optionsStr: optsStr,
            globalPool: [],
            librarySet: new Set(library.map(l => l.mal_id)),
            recentHistoryQueue: [],
            recentHistorySet: new Set(),
            nextPage: 1,
            hasNextPage: true, // Assuming true to start fetching
        };
    } else {
        // Keep updated with library changes
        session.librarySet = new Set(library.map(l => l.mal_id));
    }
};

const expandPool = async (mode: string, options: any) => {
    if (fetchLock || !session.hasNextPage) return;
    fetchLock = true;
    try {
        const res = await mediaService.getMediaBatch(mode, session.nextPage, { ...options, limit: 25 });
        if (res.data && res.data.length > 0) {
            // Filter library items DURING insertion
            const newItems = res.data.filter((item: any) => !session.librarySet.has(item.mal_id));

            // Append and deduplicate
            const combined = [...session.globalPool, ...newItems];
            session.globalPool = Array.from(new Map(combined.map((item: any) => [item.mal_id, item])).values());

            if (res.hasNextPage) {
                session.nextPage += 1;
            } else {
                session.hasNextPage = false;
            }
        } else {
            session.hasNextPage = false;
        }
    } catch (e) {
        console.error(e);
    } finally {
        fetchLock = false;
    }
};

export const recommendationService = {
    getNextRecommendation: async (mode: string, options: any, library: any[]) => {
        initSessionIfNeeded(mode, options, library);

        // 2. ADAPTIVE EXPANSION
        let candidatePool = session.globalPool.filter(a => !session.librarySet.has(a.mal_id) && !session.recentHistorySet.has(a.mal_id));

        while (candidatePool.length < 20 && session.hasNextPage) {
            await expandPool(mode, options);
            candidatePool = session.globalPool.filter(a => !session.librarySet.has(a.mal_id) && !session.recentHistorySet.has(a.mal_id));
        }

        // 3. RANDOM ALGORITHM
        if (candidatePool.length === 0) {
            if (session.globalPool.length > 0) {
                // If we have items in global pool but candidate pool is empty (all in history)
                // Clear history queue strictly
                session.recentHistoryQueue = [];
                session.recentHistorySet.clear();
                candidatePool = session.globalPool.filter(a => !session.librarySet.has(a.mal_id));
            }

            if (candidatePool.length === 0) {
                return null; // Exhausted absolute possibilities
            }
        }

        const randomIndex = Math.floor(Math.random() * candidatePool.length);
        const selectedAnime = candidatePool[randomIndex];

        if (!selectedAnime) return null;

        session.recentHistoryQueue.push(selectedAnime.mal_id);
        session.recentHistorySet.add(selectedAnime.mal_id);

        if (session.recentHistoryQueue.length > HISTORY_LIMIT) {
            const oldest = session.recentHistoryQueue.shift();
            if (oldest) {
                session.recentHistorySet.delete(oldest);
            }
        }

        return selectedAnime;
    },

    getEndlessRecommendations: async (mode: string, options: any, library: any[], count = 1) => {
        const results = [];
        for (let i = 0; i < count; i++) {
            const rec = await recommendationService.getNextRecommendation(mode, options, library);
            if (rec) results.push(rec);
        }
        return results;
    },

    getRandomRecommendation: async (mode: string, genresToUse: any[], selectedMap: any, logicToUse: string, library: any[]) => {
        const activeGenres = genresToUse.filter(g => selectedMap[g.mal_id]);
        if (activeGenres.length === 0) return null;

        const isAllSelected = activeGenres.length === genresToUse.length;
        let options: any = { limit: 25 };

        if (logicToUse === 'OR') {
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
        session.mediaMode = null;
        session.optionsStr = null;
        session.globalPool = [];
        session.librarySet.clear();
        session.recentHistoryQueue = [];
        session.recentHistorySet.clear();
        session.nextPage = 1;
        session.hasNextPage = true;
    }
};
