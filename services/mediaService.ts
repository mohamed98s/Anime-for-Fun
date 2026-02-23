import { fetchMediaBatch, fetchGenres, fetchProducers, fetchMediaById, fetchMediaCharacters, fetchMediaDetailsRecommendations } from './api';
import { QueryClient } from '@tanstack/react-query';

// Standalone QueryClient for usage outside of React components
// (Adheres to the same robust exponential backoff configured in App.js)
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 1000 * 60 * 5,
        },
    },
});

export const mediaService = {
    getGenres: async (mode) => {
        return queryClient.fetchQuery({
            queryKey: ['genres', mode],
            queryFn: () => fetchGenres(mode),
        });
    },

    getProducers: async (mode) => {
        return queryClient.fetchQuery({
            queryKey: ['producers', mode],
            queryFn: () => fetchProducers(mode),
        });
    },

    getMediaById: async (mode, id) => {
        return queryClient.fetchQuery({
            queryKey: ['mediaById', mode, id],
            queryFn: () => fetchMediaById(mode, id),
        });
    },

    getMediaCharacters: async (mode, id) => {
        return queryClient.fetchQuery({
            queryKey: ['mediaCharacters', mode, id],
            queryFn: () => fetchMediaCharacters(mode, id),
        });
    },

    getMediaDetailsRecommendations: async (mode, id) => {
        return queryClient.fetchQuery({
            queryKey: ['mediaDetailsRecommendations', mode, id],
            queryFn: () => fetchMediaDetailsRecommendations(mode, id),
        });
    },

    getMediaBatch: async (mode, page, options) => {
        const queryKey = ['mediaBatch', mode, page, options];

        try {
            const res = await queryClient.fetchQuery({
                queryKey,
                queryFn: async () => {
                    let result = await fetchMediaBatch(mode, page, options);
                    if (!result) result = { data: [], hasNextPage: false };
                    if (!result.data || !Array.isArray(result.data)) result.data = [];

                    // Ignore null/invalid entries natively before caching
                    const validData = result.data.filter(item => item && item.mal_id);

                    // Deduplicate by mal_id
                    const uniqueMap = new Map();
                    validData.forEach(item => uniqueMap.set(item.mal_id, item));
                    result.data = Array.from(uniqueMap.values());

                    return result;
                },
            });
            return res;
        } catch (err) {
            console.error('[MediaService]', err);
            return { data: [], hasNextPage: false };
        }
    },

    clearCache: () => {
        queryClient.clear();
    }
};
