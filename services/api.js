import axios from 'axios';

const requestCache = new Map();

export async function fetchCached(key, fetchFn) {
    if (requestCache.has(key)) {
        return requestCache.get(key);
    }

    const promise = fetchFn();
    requestCache.set(key, promise);

    const result = await promise;
    return result;
}

const BASE_URL = 'https://api.jikan.moe/v4';

// --- Queue system and Request Locks to prevent 429s ---
let requestQueue = Promise.resolve();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const enqueueRequest = (task, delayMs = 500) => {
    // Chain the new task to the end of the existing queue
    const nextRequest = requestQueue.then(async () => {
        await delay(delayMs);
        return task();
    });

    // Update queue, catching errors so the queue doesn't stick
    requestQueue = nextRequest.catch(() => { });

    return nextRequest;
};

export const fetchMediaPage = async (type = 'anime', page = 1) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchMediaPage_${type}_${page}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}?page=${page}&limit=20&order_by=popularity`));
            return response.data.data;
        } catch (error) {
            console.error('API Fetch Error:', error);
            return [];
        }
    });
};

/**
 * Fetch media based on various parameters.
 */
export const fetchMediaBatch = async (type = 'anime', page = 1, options = {}) => {
    return enqueueRequest(async () => {
        try {
            let url = `${BASE_URL}/${type}`;
            const params = new URLSearchParams({
                page: page.toString(),
                limit: options.limit ? options.limit.toString() : '25'
            });

            // Handle "Top" endpoints (e.g., Top Airing, Top Upcoming)
            if (options.endpoint === 'top') {
                url = `${BASE_URL}/top/${type}`;
                if (options.filter) params.append('filter', options.filter);
                if (options.subtype) params.append('type', options.subtype); // e.g. 'movie', 'tv', 'manga', 'novel'
            }
            // Handle "Season" endpoints
            else if (options.endpoint === 'season') {
                if (options.year && options.season) {
                    url = `${BASE_URL}/seasons/${options.year}/${options.season}`;
                } else {
                    url = `${BASE_URL}/seasons/now`;
                }
            }
            // Handle Standard Search/Filter
            else {
                if (options.q) params.append('q', options.q);
                if (options.genres) params.append('genres', options.genres);
                if (options.producers) params.append('producers', options.producers);
                if (options.magazines) params.append('magazines', options.magazines);
                if (options.explicit_genres) params.append('genres', options.explicit_genres);

                // Default sort if not "Top"
                if (!options.q) {
                    params.append('order_by', 'popularity');
                }
            }

            const fullUrl = `${url}?${params.toString()}`;

            const key = `fetchMediaBatch_${type}_${page}_${params.toString()}`;
            const response = await fetchCached(key, () => axios.get(fullUrl));

            return {
                data: response.data.data || [],
                hasNextPage: response.data.pagination?.has_next_page || false,
                lastVisiblePage: response.data.pagination?.last_visible_page || 1,
                nextStartPage: page + 1
            };
        } catch (error) {
            console.error('API Batch Fetch Error:', error.message);
            return { data: [], hasNextPage: false, nextStartPage: page };
        }
    }, 500); // Slightly longer delay base for batch
};

// Response Caching and Active Request Locks
const cache = {
    genres: { anime: null, manga: null },
    producers: { anime: null, manga: null },
    topMedia: { anime: null, manga: null },
    seasonal: null,
    recommendations: { anime: {}, manga: {} }
};

// Store active promises so concurrent identical requests await the same promise
const activeRequests = {};

/**
 * Helper to manage caching and locking for simple endpoints
 */
const fetchWithLock = async (cacheKey, lockKey, url, delayMs = 500) => {
    // 1. Check strict cache
    if (cacheKey && cacheKey !== null) return cacheKey;

    // 2. Check if identical request is already in flight right now
    if (activeRequests[lockKey]) return activeRequests[lockKey];

    // 3. Create new request, lock it, enqueue it
    const reqPromise = enqueueRequest(async () => {
        try {
            const key = `fetchWithLock_${lockKey}`;
            const response = await fetchCached(key, () => axios.get(url));
            const data = response.data.data || [];
            return data;
        } catch (error) {
            console.error(`Error fetching ${lockKey}:`, error.message);
            return [];
        } finally {
            // Clean up lock when done
            delete activeRequests[lockKey];
        }
    }, delayMs);

    activeRequests[lockKey] = reqPromise;
    const finalData = await reqPromise;

    return finalData;
}


export const fetchGenres = async (type = 'anime') => {
    const lockKey = `genres_${type}`;
    const data = await fetchWithLock(cache.genres[type], lockKey, `${BASE_URL}/genres/${type}`);
    if (data.length > 0) cache.genres[type] = data;
    return data;
};

export const fetchProducers = async (type = 'anime') => {
    const lockKey = `producers_${type}`;
    const endpoint = type === 'anime' ? 'producers' : 'magazines';
    const orderBy = type === 'anime' ? 'favorites' : 'count';
    const url = `${BASE_URL}/${endpoint}?order_by=${orderBy}&sort=desc&limit=20`;

    const data = await fetchWithLock(cache.producers[type], lockKey, url);
    if (data.length > 0) cache.producers[type] = data;
    return data;
}

export const searchMedia = async (type = 'anime', query) => {
    return enqueueRequest(async () => {
        try {
            const key = `searchMedia_${type}_${query}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}?q=${query}&limit=20`));
            return response.data.data;
        } catch (error) {
            console.error('Search Error:', error);
            return [];
        }
    });
};

export const fetchMediaById = async (type = 'anime', id) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchMediaById_${type}_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}/${id}/full`));
            return response.data.data;
        } catch (error) {
            console.error('Fetch By ID Error:', error.message);
            return null;
        }
    });
};

export const fetchMediaCharacters = async (type = 'anime', id) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchMediaCharacters_${type}_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}/${id}/characters`));
            return response.data.data;
        } catch (error) {
            console.error('Fetch Characters Error:', error.message);
            return [];
        }
    });
};

export const fetchMediaDetailsRecommendations = async (type = 'anime', id) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchMediaDetailsRecommendations_${type}_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}/${id}/recommendations`));
            return response.data.data;
        } catch (error) {
            console.error('Fetch Details Recs Error:', error.message);
            return [];
        }
    });
};

export const fetchTopMedia = async (type = 'anime', limit = 5) => {
    if (limit === 5 && cache.topMedia[type]) return cache.topMedia[type];

    return enqueueRequest(async () => {
        try {
            const key = `fetchTopMedia_${type}_${limit}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/top/${type}?filter=bypopularity&limit=${limit}`));
            const data = response.data.data || [];
            if (limit === 5 && data.length > 0) cache.topMedia[type] = data;
            return data;
        } catch (error) {
            console.error('Fetch Top Error:', error);
            return [];
        }
    });
}

export const fetchRecommendations = async (type = 'anime', id) => {
    if (!id) return [];
    if (cache.recommendations[type][id]) return cache.recommendations[type][id];

    return enqueueRequest(async () => {
        try {
            const key = `fetchRecommendations_${type}_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}/${id}/recommendations`));
            const data = response.data.data.map(item => item.entry).slice(0, 10);
            if (data.length > 0) cache.recommendations[type][id] = data;
            return data;
        } catch (error) {
            console.error('Recs Error:', error);
            return [];
        }
    }, 500);
}

export const fetchSeasonalAnime = async () => {
    if (cache.seasonal) return cache.seasonal;

    try {
        let allData = [];
        let page = 1;
        let hasNextPage = true;

        // Fetch all schedule pages to achieve parity with MAL (includes continuing previous seasons)
        while (hasNextPage) {
            const responseData = await enqueueRequest(async () => {
                const key = `fetchSeasonalAnime_schedules_${page}`;
                const res = await fetchCached(key, () => axios.get(`${BASE_URL}/schedules?page=${page}`));
                return res.data;
            }, 600); // 600ms delay safely stays under the 3 req/sec Jikan rate limit globally

            const data = responseData.data || [];
            allData = [...allData, ...data];

            hasNextPage = responseData.pagination?.has_next_page || false;
            page++;
        }

        // Deduplicate the massive fetched array by mal_id (Pagination shifting sometimes sends ghosts)
        const uniqueData = Array.from(new Map(allData.map(item => [item.mal_id, item])).values());

        const nullBroadcasts = uniqueData.filter(item => !item.broadcast?.day);
        console.log(`[AiringSync] Total Schedule Anime Fetched: ${uniqueData.length}`);
        console.log(`[AiringSync] Anime with broadcast.day === null or unassigned: ${nullBroadcasts.length}`);

        if (uniqueData.length > 0) cache.seasonal = uniqueData;
        return uniqueData;
    } catch (error) {
        console.error('Seasonal Error:', error);
        return [];
    }
};

