import { fetchMediaBatch, fetchGenres, fetchProducers, fetchMediaById, fetchMediaCharacters, fetchCharacterById, fetchMangaPictures, fetchAnimeImdbImages, fetchParentalGuide, fetchMediaDetailsRecommendations } from './api';
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

    getCharacterById: async (id) => {
        return queryClient.fetchQuery({
            queryKey: ['characterById', id],
            queryFn: () => fetchCharacterById(id),
        });
    },

    getMangaPictures: async (id) => {
        return queryClient.fetchQuery({
            queryKey: ['mangaPictures', id],
            queryFn: () => fetchMangaPictures(id),
        });
    },

    getAnimeImdbImages: async (title) => {
        return queryClient.fetchQuery({
            queryKey: ['animeImdbImages', title],
            queryFn: () => fetchAnimeImdbImages(title),
        });
    },

    getParentalGuide: async (title) => {
        return queryClient.fetchQuery({
            queryKey: ['parentalGuide', title],
            queryFn: () => fetchParentalGuide(title),
        });
    },

    getMediaDetailsRecommendations: async (mode, id, genreIds) => {
        return queryClient.fetchQuery({
            queryKey: ['mediaDetailsRecommendations', mode, id, genreIds],
            queryFn: async () => {
                try {
                    // Layer 1: Attempt standard recommendations
                    const standardRecs = await fetchMediaDetailsRecommendations(mode, id);
                    if (standardRecs && standardRecs.length > 0) {
                        return standardRecs;
                    }
                } catch (error) {
                    console.warn(`Standard recommendations failed for ${mode} ${id}. Falling back to genres.`);
                }

                // Layer 2: Fallback to Advanced Search matching genres
                if (!genreIds) return [];

                try {
                    const fallbackBatch = await fetchMediaBatch(mode, 1, { genres: genreIds, order_by: 'popularity', sort: 'desc' });
                    if (fallbackBatch && fallbackBatch.data) {
                        // Filter out the active media ID, take the top 10, and map to { entry: item } standard layout
                        const fallbackRecs = fallbackBatch.data
                            .filter(item => item.mal_id !== id)
                            .slice(0, 10)
                            .map(item => ({ entry: item }));
                        return fallbackRecs;
                    }
                } catch (error) {
                    console.error('Fallback recommendations failed:', error);
                }

                return [];
            },
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
