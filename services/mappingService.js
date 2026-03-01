import * as FileSystem from 'expo-file-system/legacy';

const FRIBB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json';
const LOCAL_FILE_URI = FileSystem.documentDirectory + 'fribb_mapping.json';

// In-memory O(1) hash map
let idMap = null;
let isInitializing = false;
let initPromise = null;

/**
 * Downloads the Fribb JSON (if not cached locally) and parses it into an O(1) hash map.
 */
export const initializeMappingCache = async () => {
    if (idMap) return; // Already loaded

    // Prevent concurrent initializations
    if (isInitializing && initPromise) {
        return initPromise;
    }

    isInitializing = true;
    initPromise = (async () => {
        try {
            // 1. Check if it exists locally
            const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE_URI);
            let rawJsonStr = '';

            if (fileInfo.exists) {
                // Read from local cache
                rawJsonStr = await FileSystem.readAsStringAsync(LOCAL_FILE_URI);
            } else {
                // Download from GitHub and save locally
                console.log('[MappingService] Downloading Fribb mapping file...');
                const downloadResult = await FileSystem.downloadAsync(FRIBB_URL, LOCAL_FILE_URI);
                if (downloadResult.status !== 200) {
                    throw new Error(`Failed to download mapping: HTTP ${downloadResult.status}`);
                }
                rawJsonStr = await FileSystem.readAsStringAsync(LOCAL_FILE_URI);
                console.log('[MappingService] Download complete and saved to cache.');
            }

            // 2. Parse and populate the O(1) memory map
            const fribbArray = JSON.parse(rawJsonStr);
            idMap = {};

            // Expected format: [{ mal_id: 1, anidb_id: ..., anilist_id: ..., imdb_id: "tt0000000" }, ...]
            for (let i = 0; i < fribbArray.length; i++) {
                const entry = fribbArray[i];
                if (entry.mal_id && entry.imdb_id) {
                    idMap[entry.mal_id] = entry.imdb_id;
                }
            }

            console.log(`[MappingService] Hash map initialized with ${Object.keys(idMap).length} entries.`);
        } catch (error) {
            console.error('[MappingService] Initialization Error:', error);
            // On catastrophic failure, fallback to an empty map to prevent crashes
            if (!idMap) idMap = {};
        } finally {
            isInitializing = false;
        }
    })();

    await initPromise;
};

/**
 * Retrieves the IMDB ID for a giving MAL ID instantly from memory.
 * Ensures the cache is initialized first.
 * @param {number|string} malId
 * @returns {string|undefined} The IMDB ID (e.g. "tt0213338") or undefined if not found.
 */
export const getImdbIdFromMalId = async (malId) => {
    if (!idMap) {
        await initializeMappingCache();
    }
    const cleanId = String(malId);
    return idMap[cleanId];
};
