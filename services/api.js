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

// --- Global Content Sanitizer ---
// Explicitly purge "Kids" demographic (MAL ID: 15) from all list payloads to strictly maintain target audience indexing.
const filterKidsContent = (dataArray) => {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.filter(item => {
        const hasKidsTag = (arr) => arr?.some(tag => tag.mal_id === 15 || tag.name?.toLowerCase() === 'kids');
        if (hasKidsTag(item.genres) || hasKidsTag(item.themes) || hasKidsTag(item.demographics)) {
            return false;
        }
        return true;
    });
};

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
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}?page=${page}&limit=20&order_by=popularity&genres_exclude=15`));
            return filterKidsContent(response.data.data);
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

            // Append safe parameters natively supported by generic query filters
            if (options.endpoint !== 'top' && options.endpoint !== 'season') {
                params.append('genres_exclude', '15');
            }

            const fullUrl = `${url}?${params.toString()}`;

            const key = `fetchMediaBatch_${type}_${page}_${params.toString()}`;
            const response = await fetchCached(key, () => axios.get(fullUrl));

            return {
                data: filterKidsContent(response.data.data || []),
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
    // Aggressively strip Kids genre (mal_id 15 / explicit Kids title) globally
    const filteredGenres = data.filter(g => g.mal_id !== 15 && g.name?.toLowerCase() !== 'kids');
    if (filteredGenres.length > 0) cache.genres[type] = filteredGenres;
    return filteredGenres;
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
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}?q=${query}&limit=20&sfw=true&genres_exclude=15`));
            return filterKidsContent(response.data.data);
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
            const data = response.data.data;
            // Strict ID-level validation shutting down direct links to Kids content
            if (data && filterKidsContent([data]).length === 0) {
                console.log(`[Sanitizer] Blocked direct fetch to Kids demographic media: ${id}`);
                return null;
            }
            return data;
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

export const fetchCharacterById = async (id) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchCharacterById_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/characters/${id}/full`));
            return response.data.data;
        } catch (error) {
            console.error('Fetch Character By ID Error:', error.message);
            return null;
        }
    });
};

export const fetchMangaPictures = async (id) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchMangaPictures_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/manga/${id}/pictures`));

            // Map strictly to react-native-image-viewing expected format [{ uri: url }]
            if (!response.data || !response.data.data) return [];
            return response.data.data.map(img => ({ uri: img.jpg.image_url || img.jpg.large_image_url }));
        } catch (error) {
            console.error('Fetch Manga Pictures Error:', error.message);
            return [];
        }
    });
};

export const fetchAnimeImdbImages = async (title) => {
    if (!title) return [];
    return enqueueRequest(async () => {
        try {
            // Strip Season 2, (TV), Part 2, The Movie, 2nd Season, etc natively
            const sanitizedTitle = title.replace(/\(TV\)|\(Movie\)|Season \d+|Part \d+|\d+(st|nd|rd|th) Season|The Movie/gi, '').trim();
            console.log("1. Sanitized Title:", sanitizedTitle);

            const key = `fetchAnimeImdbImages_${sanitizedTitle}`;

            const response = await fetchCached(key, async () => {
                const searchUrl = `https://api.imdbapi.dev/search/titles?query=${encodeURIComponent(sanitizedTitle)}&limit=1`;
                console.log("2. Search URL:", searchUrl);

                const searchRes = await axios.get(searchUrl);
                console.log("3. Search Response:", JSON.stringify(searchRes.data, null, 2));

                if (!searchRes.data || !searchRes.data.titles || searchRes.data.titles.length === 0) {
                    return { data: { images: [] } };
                }

                const validResult = searchRes.data.titles.find(t =>
                    (t.primaryTitle && t.primaryTitle.toLowerCase() === sanitizedTitle.toLowerCase()) ||
                    (t.originalTitle && t.originalTitle.toLowerCase() === sanitizedTitle.toLowerCase())
                );

                if (!validResult) return { data: { images: [] } };
                const extractedId = validResult.id;

                console.log("4. Extracted ID:", extractedId);

                if (!extractedId) return { data: { images: [] } };

                return axios.get(`https://api.imdbapi.dev/titles/${extractedId}/images`);
            });

            const imagesArray = response.data?.images || [];
            // Map strictly to react-native-image-viewing expected format [{ uri: url }]
            return imagesArray.map(img => ({ uri: img.url }));
        } catch (error) {
            console.error('Fetch Anime IMDb Images Error:', error.message);
            return [];
        }
    });
};

export const fetchParentalGuide = async (title) => {
    if (!title) return [];
    return enqueueRequest(async () => {
        try {
            const sanitizedTitle = title.replace(/\(TV\)|\(Movie\)|Season \d+|Part \d+|\d+(st|nd|rd|th) Season|The Movie/gi, '').trim();
            const key = `fetchParentalGuide_${sanitizedTitle}`;

            const response = await fetchCached(key, async () => {
                const searchRes = await axios.get(`https://api.imdbapi.dev/search/titles?query=${encodeURIComponent(sanitizedTitle)}&limit=1`);

                if (!searchRes.data || !searchRes.data.titles || searchRes.data.titles.length === 0) {
                    return { data: { parentsGuide: [] } }; // Fallback
                }

                const validResult = searchRes.data.titles.find(t =>
                    (t.primaryTitle && t.primaryTitle.toLowerCase() === sanitizedTitle.toLowerCase()) ||
                    (t.originalTitle && t.originalTitle.toLowerCase() === sanitizedTitle.toLowerCase())
                );

                if (!validResult) return { data: { parentsGuide: [] } };
                const imdbId = validResult.id;

                try {
                    return await axios.get(`https://api.imdbapi.dev/titles/${imdbId}/parentsGuide`);
                } catch (err) {
                    // Gracefully intercept 404 Missing Guide Data natively
                    console.log(`[ParentalGuide] No guide exists for ${imdbId} on IMDb servers.`);
                    return { data: { parentsGuide: [] } };
                }
            });

            // Map the exact schema array robustly
            return response.data?.parentsGuide || [];
        } catch (error) {
            console.error('Fetch Parental Guide Error:', error.message);
            return [];
        }
    });
};

export const fetchMediaDetailsRecommendations = async (type = 'anime', id) => {
    return enqueueRequest(async () => {
        try {
            const key = `fetchMediaDetailsRecommendations_${type}_${id}`;
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/${type}/${id}/recommendations`));
            return filterKidsContent(response.data.data);
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
            const response = await fetchCached(key, () => axios.get(`${BASE_URL}/top/${type}?filter=bypopularity&limit=${limit}&sfw=true`));
            const data = filterKidsContent(response.data.data || []);
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
            const rawRecs = response.data.data.map(item => item.entry);
            const data = filterKidsContent(rawRecs).slice(0, 10);
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
                const res = await fetchCached(key, () => axios.get(`${BASE_URL}/schedules?page=${page}&sfw=true&kids=false`));
                return res.data;
            }, 600); // 600ms delay safely stays under the 3 req/sec Jikan rate limit globally

            const data = responseData.data || [];
            allData = [...allData, ...data];

            hasNextPage = responseData.pagination?.has_next_page || false;
            page++;
        }

        // Deduplicate the massive fetched array by mal_id (Pagination shifting sometimes sends ghosts)
        const uniqueData = Array.from(new Map(allData.map(item => [item.mal_id, item])).values());

        // Final strict purge 
        const sanitizedData = filterKidsContent(uniqueData);

        const nullBroadcasts = sanitizedData.filter(item => !item.broadcast?.day);
        console.log(`[AiringSync] Total Schedule Anime Fetched: ${sanitizedData.length}`);
        console.log(`[AiringSync] Anime with broadcast.day === null or unassigned: ${nullBroadcasts.length}`);

        if (sanitizedData.length > 0) cache.seasonal = sanitizedData;
        return sanitizedData;
    } catch (error) {
        console.error('Seasonal Error:', error);
        return [];
    }
};

