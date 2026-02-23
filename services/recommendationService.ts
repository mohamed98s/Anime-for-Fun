import { mediaService } from './mediaService';

// 1. ENGINE SESSION
let session = {
    mediaMode: null as string | null,
    optionsStr: null as string | null, // To track if filters changed
    globalPool: [] as any[],
    excludedIds: new Set<number>(), // library + recorded swipes
    recentHistory: [] as number[],
    recentHistorySet: new Set<number>(),
    nextPage: 1,
    hasNextPage: true,
};

const TARGET_POOL_SIZE = 80;
const MAX_PAGES_PER_FETCH = 10;
const HISTORY_LIMIT = 20;

let fetchLock = false;

const initSessionIfNeeded = (mode: string, options: any, library: any[]) => {
    const optsStr = JSON.stringify(options || {});
    if (session.mediaMode !== mode || session.optionsStr !== optsStr) {
        // Mode or filters changed -> Destroy session
        session = {
            mediaMode: mode,
            optionsStr: optsStr,
            globalPool: [],
            excludedIds: new Set(library.map(l => l.mal_id)),
            recentHistory: [],
            recentHistorySet: new Set(),
            nextPage: 1,
            hasNextPage: true,
        };
    } else {
        // Keep updated with library changes
        library.forEach(l => session.excludedIds.add(l.mal_id));
    }
};

const expandPool = async (mode: string, options: any) => {
    if (fetchLock || !session.hasNextPage) return;
    fetchLock = true;
    try {
        let pagesFetched = 0;
        let validItemsInPool = session.globalPool.filter(a => !session.excludedIds.has(a.mal_id)).length;

        while (validItemsInPool < TARGET_POOL_SIZE && session.hasNextPage && pagesFetched < MAX_PAGES_PER_FETCH) {
            const res = await mediaService.getMediaBatch(mode, session.nextPage, { ...options, limit: 25 });
            pagesFetched++;

            if (res.data && res.data.length > 0) {
                // Filter library items DURING insertion
                const newItems = res.data.filter((item: any) => !session.excludedIds.has(item.mal_id));

                // Append and deduplicate natively
                const combined = [...session.globalPool, ...newItems];
                session.globalPool = Array.from(new Map(combined.map((item: any) => [item.mal_id, item])).values());

                validItemsInPool = session.globalPool.filter(a => !session.excludedIds.has(a.mal_id)).length;

                if (res.hasNextPage) {
                    session.nextPage += 1;
                } else {
                    session.hasNextPage = false;
                }
            } else {
                session.hasNextPage = false;
            }
        }
    } catch (e) {
        console.error('[RecommendationService] Expand Pool Error', e);
    } finally {
        fetchLock = false;
    }
};

const getCandidatePool = () => {
    return session.globalPool.filter(a => !session.excludedIds.has(a.mal_id) && !session.recentHistorySet.has(a.mal_id));
};

export const recommendationService = {
    initializeSession: async (mode: string, options: any, library: any[]) => {
        initSessionIfNeeded(mode, options, library);
        if (session.globalPool.length === 0 && session.hasNextPage) {
            await expandPool(mode, options);
        }
    },

    getNextBatch: async (mode: string, options: any, library: any[], count: number) => {
        initSessionIfNeeded(mode, options, library);

        let candidatePool = getCandidatePool();

        if (candidatePool.length < 20 && session.hasNextPage) {
            await expandPool(mode, options);
            candidatePool = getCandidatePool();
        }

        if (candidatePool.length === 0) {
            if (session.globalPool.length > 0) {
                // Clear history queue strictly
                session.recentHistory = [];
                session.recentHistorySet.clear();
                candidatePool = session.globalPool.filter(a => !session.excludedIds.has(a.mal_id));
            }

            if (candidatePool.length === 0) {
                return []; // Exhausted possibilities
            }
        }

        // Exact random selection: shuffle(candidatePool) take N
        const shuffled = [...candidatePool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    },

    recordSwipe: (animeId: number) => {
        session.excludedIds.add(animeId);

        session.recentHistory.push(animeId);
        session.recentHistorySet.add(animeId);

        if (session.recentHistory.length > HISTORY_LIMIT) {
            const oldest = session.recentHistory.shift();
            if (oldest) {
                session.recentHistorySet.delete(oldest);
            }
        }
    },

    triggerBackgroundRefill: async (mode: string, options: any) => {
        const candidatePool = getCandidatePool();
        if (candidatePool.length < 20 && session.hasNextPage) {
            await expandPool(mode, options);
        }
    },

    getNextRecommendation: async (mode: string, options: any, library: any[]) => {
        const batch = await recommendationService.getNextBatch(mode, options, library, 1);
        if (batch && batch.length > 0) {
            const item = batch[0];
            recommendationService.recordSwipe(item.mal_id);
            return item;
        }
        return null; // Ensure null if nothing found
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
        session.excludedIds.clear();
        session.recentHistory = [];
        session.recentHistorySet.clear();
        session.nextPage = 1;
        session.hasNextPage = true;
    }
};
