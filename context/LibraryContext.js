import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UIManager, Platform, LayoutAnimation } from 'react-native';
import { useMediaMode } from './MediaModeContext';

const LibraryContext = createContext();

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const useLibrary = () => useContext(LibraryContext);

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

    // Save to storage whenever libraries change
    useEffect(() => {
        if (!loading) {
            saveLibrary(libraries);
        }
    }, [libraries]);

    const loadLibrary = async () => {
        try {
            const storedLibrary = await AsyncStorage.getItem('@media_library'); // New key
            if (storedLibrary) {
                setLibraries(JSON.parse(storedLibrary));
            } else {
                // Migration check: Look for old key
                const oldLibrary = await AsyncStorage.getItem('@anime_library');
                if (oldLibrary) {
                    const parsedOld = JSON.parse(oldLibrary);
                    setLibraries(prev => ({ ...prev, anime: parsedOld }));
                }
            }
        } catch (error) {
            console.error('Failed to load library:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveLibrary = async (newLibraries) => {
        try {
            await AsyncStorage.setItem('@media_library', JSON.stringify(newLibraries));
        } catch (error) {
            console.error('Failed to save library:', error);
        }
    };

    const addToLibrary = (item, status, currentProgress = 0) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        setLibraries(prev => {
            const currentList = prev[mode];
            const exists = currentList.find(i => i.mal_id === item.mal_id);

            let newList;
            const progressField = mode === 'anime' ? 'currentEpisode' : 'currentChapter';

            if (exists) {
                // Update existing
                newList = currentList.map(i =>
                    i.mal_id === item.mal_id
                        ? {
                            ...i,
                            status,
                            [progressField]: status === 'Watching' || status === 'Reading' ? currentProgress : 0
                        }
                        : i
                );
            } else {
                // Add new
                newList = [...currentList, {
                    ...item,
                    status,
                    [progressField]: status === 'Watching' || status === 'Reading' ? currentProgress : 0
                }];
            }

            return { ...prev, [mode]: newList };
        });
    };

    const updateProgress = (id, increment) => {
        setLibraries(prevLibraries => {
            const currentList = prevLibraries[mode];
            const newList = currentList.map(item => {
                if (item.mal_id === id) {
                    const progressField = mode === 'anime' ? 'currentEpisode' : 'currentChapter';
                    const totalField = mode === 'anime' ? 'episodes' : 'chapters';
                    const activeStatus = mode === 'anime' ? 'Watching' : 'Reading';

                    // Determine current progress
                    const currentVal = item[progressField] || 0;
                    let newVal = Math.max(0, currentVal + increment);

                    // Cap at total if known
                    if (item[totalField] && newVal > item[totalField]) {
                        newVal = item[totalField];
                    }

                    // Auto-move logic
                    if (item[totalField] && newVal === item[totalField] && item.status !== 'Completed') {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                        return { ...item, [progressField]: newVal, status: 'Completed' };
                    }

                    return { ...item, [progressField]: newVal };
                }
                return item;
            });
            return { ...prevLibraries, [mode]: newList };
        });
    };

    const removeFromLibrary = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLibraries(prev => ({
            ...prev,
            [mode]: prev[mode].filter(item => item.mal_id !== id)
        }));
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

    return (
        <LibraryContext.Provider value={{
            library: libraries[mode], // Expose ONLY the active library
            addToLibrary,
            updateProgress,
            removeFromLibrary,
            getAnimeStatus, // Should be getMediaStatus technically, but keeping compat
            getTopGenre,
            loading
        }}>
            {children}
        </LibraryContext.Provider>
    );
};
