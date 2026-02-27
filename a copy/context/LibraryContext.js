import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { UIManager, Platform, LayoutAnimation } from 'react-native';
import { useMediaMode } from './MediaModeContext';
import { getDB } from '../services/databaseService';

export const LibraryStateContext = createContext(null);
export const LibraryActionsContext = createContext(null);

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const useLibrary = () => {
    const state = useContext(LibraryStateContext);
    const actions = useContext(LibraryActionsContext);
    return { ...state, ...actions };
};

export const LibraryProvider = ({ children }) => {
    const { mode } = useMediaMode();

    // Store both libraries in one state object
    const [libraries, setLibraries] = useState({
        anime: [],
        manga: []
    });

    const [loading, setLoading] = useState(true);

    // Load from storage on mount
    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        try {
            const db = await getDB();
            const allRows = await db.getAllAsync('SELECT * FROM library_media;');

            const loadedAnime = [];
            const loadedManga = [];

            // Rehydrate JS objects from the flat schema
            allRows.forEach((row) => {
                const item = {
                    mal_id: row.mal_id,
                    title: row.title,
                    images: { jpg: { image_url: row.image_url, large_image_url: row.image_url } },
                    episodes: row.total_episodes,
                    chapters: row.total_episodes,
                    status: row.status,
                    currentEpisode: row.mode === 'anime' ? row.progress : 0,
                    currentChapter: row.mode === 'manga' ? row.progress : 0,
                    ...JSON.parse(row.compressed_data_json || '{}')
                };

                if (row.mode === 'anime') {
                    loadedAnime.push(item);
                } else {
                    loadedManga.push(item);
                }
            });

            setLibraries({ anime: loadedAnime, manga: loadedManga });
        } catch (error) {
            console.error('[SQLite] Failed to load library:', error);
            setLibraries({ anime: [], manga: [] });
        } finally {
            setLoading(false);
        }
    };

    const addToLibrary = async (item, status, currentProgress = 0) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const progressField = mode === 'anime' ? 'currentEpisode' : 'currentChapter';
        const totalAmount = mode === 'anime' ? item.episodes : item.chapters;
        const initProgress = status === 'Watching' || status === 'Reading' ? currentProgress : 0;

        const compressedData = {
            title_english: item.title_english,
            genres: item.genres?.slice(0, 3) || [],
            score: item.score,
            status_api: item.status,
            year: item.year,
            synopsis: item.synopsis ? item.synopsis.substring(0, 200) + '...' : ''
        };

        const newItemProps = {
            mal_id: item.mal_id,
            title: item.title_english || item.title,
            images: item.images,
            episodes: item.episodes,
            chapters: item.chapters,
            status: status,
            [progressField]: initProgress,
            ...compressedData
        };

        try {
            const db = await getDB();
            // Perform the exact explicit SQLite mapping requested
            await db.runAsync(
                `INSERT OR REPLACE INTO library_media 
                (mal_id, mode, status, progress, title, image_url, total_episodes, compressed_data_json) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.mal_id,
                    mode,
                    status,
                    initProgress,
                    newItemProps.title,
                    item.images?.jpg?.image_url || null,
                    totalAmount || null,
                    JSON.stringify(compressedData)
                ]
            );

            // Sync the exact DB write back into React Context state
            setLibraries(prev => {
                const currentList = prev[mode];
                const exists = currentList.find(i => i.mal_id === item.mal_id);
                let newList;

                if (exists) {
                    newList = currentList.map(i => i.mal_id === item.mal_id ? newItemProps : i);
                } else {
                    newList = [...currentList, newItemProps];
                }
                return { ...prev, [mode]: newList };
            });

        } catch (e) {
            console.error('[SQLite] Failed to addToLibrary:', e);
        }
    };

    const updateProgress = async (id, increment) => {
        // Find existing item configuration
        const currentList = libraries[mode];
        const itemToUpdate = currentList.find(item => item.mal_id === id);
        if (!itemToUpdate) return;

        const progressField = mode === 'anime' ? 'currentEpisode' : 'currentChapter';
        const totalField = mode === 'anime' ? 'episodes' : 'chapters';
        const activeStatus = mode === 'anime' ? 'Watching' : 'Reading';
        const planStatus = mode === 'anime' ? 'Plan to Watch' : 'Plan to Read';

        // Calculate theoretical bounds
        const currentVal = itemToUpdate[progressField] || 0;
        let newVal = Math.max(0, currentVal + increment);

        // Cap at total if known
        if (itemToUpdate[totalField] && newVal > itemToUpdate[totalField]) {
            newVal = itemToUpdate[totalField];
        }

        // Derive definitive status
        let newStatus = itemToUpdate.status;

        if (itemToUpdate[totalField] && newVal === itemToUpdate[totalField]) {
            newStatus = 'Completed';
        } else if (newVal > 0) {
            newStatus = activeStatus;
        } else if (newVal === 0) {
            newStatus = planStatus;
        }

        try {
            const db = await getDB();
            await db.runAsync(
                `UPDATE library_media SET progress = ?, status = ? WHERE mal_id = ?`,
                [newVal, newStatus, id]
            );

            // Animate only if tab jumps
            if (newStatus !== itemToUpdate.status) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
            }

            setLibraries(prev => ({
                ...prev,
                [mode]: prev[mode].map(i =>
                    i.mal_id === id ? { ...i, [progressField]: newVal, status: newStatus } : i
                )
            }));
        } catch (e) {
            console.error('[SQLite] Failed to updateProgress:', e);
        }
    };

    const removeFromLibrary = async (id) => {
        try {
            const db = await getDB();
            await db.runAsync(`DELETE FROM library_media WHERE mal_id = ?`, [id]);

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setLibraries(prev => ({
                ...prev,
                [mode]: prev[mode].filter(item => item.mal_id !== id)
            }));
        } catch (e) {
            console.error('[SQLite] Failed to removeFromLibrary:', e);
        }
    };

    const getAnimeStatus = (id) => {
        // Renamed internally but keeping API name for now, or assume generic
        const item = libraries[mode].find(i => i.mal_id === id);
        return item ? item.status : null;
    };

    const getTopGenre = () => {
        const currentList = libraries[mode];
        if (!currentList || currentList.length === 0) return null;

        const genreMap = {};

        currentList.forEach(item => {
            if (item.genres) {
                item.genres.forEach(g => {
                    if (!genreMap[g.mal_id]) {
                        genreMap[g.mal_id] = { count: 0, name: g.name };
                    }
                    genreMap[g.mal_id].count += 1;
                });
            }
        });

        let topGenre = null;
        let maxCount = 0;

        for (const [id, data] of Object.entries(genreMap)) {
            if (data.count > maxCount) {
                maxCount = data.count;
                topGenre = { id, name: data.name };
            }
        }

        return topGenre;
    };

    const stateValue = useMemo(() => ({
        library: libraries[mode], // Expose ONLY the active library
        getAnimeStatus, // Should be getMediaStatus technically, but keeping compat
        getTopGenre,
        loading
    }), [libraries, mode, loading]);

    const actionsValue = useMemo(() => ({
        addToLibrary,
        updateProgress,
        removeFromLibrary,
    }), [mode]);

    return (
        <LibraryStateContext.Provider value={stateValue}>
            <LibraryActionsContext.Provider value={actionsValue}>
                {children}
            </LibraryActionsContext.Provider>
        </LibraryStateContext.Provider>
    );
};
