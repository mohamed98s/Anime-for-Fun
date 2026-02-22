import { mediaService } from './mediaService';

// Module-level state for global endless tracking
const recentHistoryQueue = [];
const recentHistorySet = new Set();
const HISTORY_LIMIT = 40;

const globalPools = new Map();
const poolPageTracker = new Map();

const getPoolKey = (mode, options) => {
    return `${mode}_${JSON.stringify(options || {})}`;
};

const fetchMoreIntoPool = async (mode, options, poolKey) => {
    let pool = globalPools.get(poolKey) || [];
    let page = poolPageTracker.get(poolKey) || 1;

    const res = await mediaService.getMediaBatch(mode, page, { ...options, limit: 25 });
    if (res.data && res.data.length > 0) {
        pool.push(...res.data);
        // Deduplicate pool by mal_id
        pool = Array.from(new Map(pool.map(item => [item.mal_id, item])).values());
        globalPools.set(poolKey, pool);

        if (res.hasNextPage) {
            poolPageTracker.set(poolKey, page + 1);
        } else {
            poolPageTracker.set(poolKey, -1);
        }
        return true;
    }
    poolPageTracker.set(poolKey, -1);
    return false;
};

export const recommendationService = {
    getEndlessRecommendations: async (mode, options, library, count = 1) => {
        const poolKey = getPoolKey(mode, options);

        // Ensure pool exists
        if (!globalPools.has(poolKey)) {
            globalPools.set(poolKey, []);
            poolPageTracker.set(poolKey, 1);
            await fetchMoreIntoPool(mode, options, poolKey);
        }

        const librarySet = new Set(library.map(l => l.mal_id));
        const results = [];

        for (let i = 0; i < count; i++) {
            let pool = globalPools.get(poolKey);
            let candidatePool = pool.filter(a => !librarySet.has(a.mal_id) && !recentHistorySet.has(a.mal_id));

            // Auto-expand pool if candidates are low and the API has more pages
            while (candidatePool.length < 10 && poolPageTracker.get(poolKey) !== -1) {
                const fetched = await fetchMoreIntoPool(mode, options, poolKey);
                if (!fetched) break;
                pool = globalPools.get(poolKey);
                candidatePool = pool.filter(a => !librarySet.has(a.mal_id) && !recentHistorySet.has(a.mal_id));
            }

            // Pool exhausted logic (Reset history to loop smoothly)
            if (candidatePool.length === 0) {
                recentHistoryQueue.length = 0;
                recentHistorySet.clear();
                candidatePool = pool.filter(a => !librarySet.has(a.mal_id));

                if (candidatePool.length === 0) {
                    break; // Everything is exclusively in the Library
                }
            }

            // Select natively random candidate
            const selectedAnime = candidatePool[Math.floor(Math.random() * candidatePool.length)];
            results.push(selectedAnime);

            // Push to history buffer
            recentHistoryQueue.push(selectedAnime.mal_id);
            recentHistorySet.add(selectedAnime.mal_id);

            // Trim history to limit
            if (recentHistoryQueue.length > HISTORY_LIMIT) {
                const oldest = recentHistoryQueue.shift();
                recentHistorySet.delete(oldest);
            }
        }

        return results;
    },

    getRandomRecommendation: async (mode, genresToUse, selectedMap, logicToUse, library) => {
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

        // Defer implicitly back to the master Endless Engine
        const results = await recommendationService.getEndlessRecommendations(mode, options, library, 1);
        return results.length > 0 ? results[0] : null;
    }
};
