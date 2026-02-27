import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, TextInput, FlatList, ActivityIndicator, Text, Animated } from 'react-native';
import { fetchMediaBatch, fetchRecommendations, fetchTopMedia } from '../services/api';
import AnimeCard from '../components/AnimeCard';
import { useTheme } from '../context/ThemeContext';
import { LibraryStateContext } from '../context/LibraryContext';
import { useMediaMode } from '../context/MediaModeContext';
import { Ionicons } from '@expo/vector-icons';

// Simple debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function SearchScreen({ navigation }) {
    const { theme } = useTheme();
    const { mode } = useMediaMode(); // Consume mode
    const { getTopGenre, getAnimeStatus, addToLibrary } = useContext(LibraryStateContext);

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 500);

    const [results, setResults] = useState([]);
    const [recommendations, setRecommendations] = useState([]);

    const [loading, setLoading] = useState(false);
    const [recLoading, setRecLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recGenre, setRecGenre] = useState(null);

    const [fadeAnim] = useState(new Animated.Value(0));

    // Reset when mode changes
    useEffect(() => {
        if (query !== '') {
            // This will trigger the next useEffect because query changes
            setQuery('');
        } else {
            // Already empty, just load recommendations for new mode
            loadRecommendations();
        }
        setResults([]);
    }, [mode]);

    // Handle query clear
    useEffect(() => {
        if (!query.trim() && !recLoading) {
            loadRecommendations();
            setResults([]);
        }
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.trim().length > 2) {
            handleSearch(debouncedQuery);
        }
    }, [debouncedQuery]);

    const loadRecommendations = async () => {
        setRecLoading(true);
        try {
            const topGenre = getTopGenre();
            let data = [];

            // Only use genre recommendations if in Anime mode (library logic is currently mixed, but let's assume valid)
            // Or if we want to support manga recommendations based on anime genres, Jikan might handle it if ID is same.
            // For safety and simplicity in fallback:

            if (topGenre && mode === 'anime') {
                setRecGenre(topGenre.name);
                data = await fetchRecommendations(mode, topGenre.id);
            } else {
                setRecGenre(null);
                data = await fetchTopMedia(mode);
            }

            // Deduplicate to prevent key errors
            if (data && data.length > 0) {
                const seen = new Set();
                data = data.filter(item => {
                    const duplicate = seen.has(item.mal_id);
                    seen.add(item.mal_id);
                    return !duplicate;
                });
            }

            setRecommendations(data || []);

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();

        } catch (err) {
            console.error(err);
        } finally {
            setRecLoading(false);
        }
    };

    const handleSearch = async (searchQuery) => {
        if (!searchQuery?.trim()) return;

        setLoading(true);
        setError(null);
        try {
            // Use fetchMediaBatch which supports q (query) parameter
            // Signature: fetchMediaBatch(type, page, options)
            const result = await fetchMediaBatch(mode, 1, { q: searchQuery });

            const rawData = result.data || [];
            // Deduplicate results
            const uniqueResults = Array.from(new Map(rawData.map(item => [item.mal_id, item])).values());

            setResults(uniqueResults);
        } catch (err) {
            setError('Failed to fetch results.');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <AnimeCard
            item={item}
            mode={mode}
            currentStatus={getAnimeStatus(item.mal_id)}
            onUpdateLibrary={addToLibrary}
            onPress={() => navigation.navigate('Details', { id: item.mal_id, type: mode })}
        />
    );

    const isSearching = query.trim().length > 0;
    const dataToShow = isSearching ? results : recommendations;
    const isLoading = isSearching ? loading : recLoading;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.subText} style={styles.searchIcon} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={`Search ${mode === 'anime' ? 'Anime' : 'Manga'}...`}
                    placeholderTextColor={theme.subText}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={() => handleSearch(query)}
                    returnKeyType="search"
                />
                {isLoading && (
                    <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 10 }} />
                )}
                {query.length > 0 && (
                    <Ionicons
                        name="close-circle"
                        size={20}
                        color={theme.subText}
                        onPress={() => { setQuery(''); setResults([]); }}
                    />
                )}
            </View>

            {error && isSearching && (
                <View style={styles.center}>
                    <Text style={[styles.errorText, { color: theme.notification }]}>{error}</Text>
                </View>
            )}

            {!error && (
                <Animated.View style={{ flex: 1, opacity: isSearching ? 1 : fadeAnim }}>
                    {!isSearching && dataToShow.length > 0 && (
                        <View style={styles.headerContainer}>
                            <Text style={[styles.headerTitle, { color: theme.accent }]}>
                                {recGenre && mode === 'anime' ? `Recommended for you (Because you like ${recGenre})` : `Popular ${mode} Right Now`}
                            </Text>
                        </View>
                    )}

                    <FlatList
                        data={dataToShow}
                        keyExtractor={(item) => `${item.mal_id}`}
                        renderItem={renderItem}
                        numColumns={2}
                        contentContainerStyle={styles.listContent}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                    />
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        height: 50,
    },
    searchIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        textTransform: 'capitalize', // capitalization for 'Anime'/'Manga' placeholder if needed, but placeholder prop handles it
    },
    loader: {
        marginTop: 20,
    },
    listContent: {
        padding: 5,
        paddingBottom: 20,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    }
});
