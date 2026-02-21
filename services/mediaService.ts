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
            sessionCache[cacheKey] = res;
            delete activeRequests[cacheKey];
            return res;
        });
        activeRequests[cacheKey] = req;
        return req;
    },

    clearCache: () => {
        for (let key in sessionCache) delete sessionCache[key];
    }
};
