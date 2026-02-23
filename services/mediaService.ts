import { fetchMediaBatch, fetchGenres, fetchProducers } from './api';

const sessionCache = {};
const activeRequests = {};

export const mediaService = {
    getGenres: async (mode) => {
        const cacheKey = `genres_${mode}`;
        if (sessionCache[cacheKey]) return sessionCache[cacheKey];
        if (activeRequests[cacheKey]) return activeRequests[cacheKey];

        const req = fetchGenres(mode).then(res => {
            sessionCache[cacheKey] = res;
            delete activeRequests[cacheKey];
            return res;
        });
        activeRequests[cacheKey] = req;
        return req;
    },

    getProducers: async (mode) => {
        const cacheKey = `producers_${mode}`;
        if (sessionCache[cacheKey]) return sessionCache[cacheKey];
        if (activeRequests[cacheKey]) return activeRequests[cacheKey];

        const req = fetchProducers(mode).then(res => {
            sessionCache[cacheKey] = res;
            delete activeRequests[cacheKey];
            return res;
        });
        activeRequests[cacheKey] = req;
        return req;
    },

    getMediaBatch: async (mode, page, options) => {
        // Create strict determinant cache key
        const optsString = JSON.stringify(options || {});
        const cacheKey = `batch_${mode}_${page}_${optsString}`;

        if (sessionCache[cacheKey]) return sessionCache[cacheKey];
        if (activeRequests[cacheKey]) return activeRequests[cacheKey];

        const req = fetchMediaBatch(mode, page, options).then(res => {
            if (!res) res = { data: [], hasNextPage: false };
            if (!res.data || !Array.isArray(res.data)) res.data = [];

            // Ignore null/invalid entries
            const validData = res.data.filter(item => item && item.mal_id);

            // Deduplicate by mal_id
            const uniqueMap = new Map();
            validData.forEach(item => uniqueMap.set(item.mal_id, item));
            res.data = Array.from(uniqueMap.values());

            sessionCache[cacheKey] = res;
            delete activeRequests[cacheKey];
            return res;
        }).catch(err => {
            console.error('[MediaService]', err);
            delete activeRequests[cacheKey];
            return { data: [], hasNextPage: false };
        });
        activeRequests[cacheKey] = req;
        return req;
    },

    clearCache: () => {
        for (let key in sessionCache) delete sessionCache[key];
    }
};
