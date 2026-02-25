import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Animated,
    Modal,
    ScrollView
} from 'react-native';
import AnimeCard from '../components/AnimeCard';
import SharedFilterButton from '../components/SharedFilterButton';
import { fetchMediaBatch } from '../services/api';
import { mediaService } from '../services/mediaService';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';

export default function AnimeListScreen({ navigation }) {
    const { theme } = useTheme();
    const { mode, toggleMode } = useMediaMode();
    const { getAnimeStatus, addToLibrary } = useLibrary();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);

    // Exact Surprise Me Filter Mirrors
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [genres, setGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState({});
    const [genreLogic, setGenreLogic] = useState('OR');

    // Track active queried string to persist across Native Pagination
    const [activeGenreString, setActiveGenreString] = useState('');

    // Reload when mode changes
    useEffect(() => {
        const initializeMode = async () => {
            setData([]);
            setPage(1);
            setHasNextPage(true);
            setLoading(false);
            setActiveGenreString('');

            // Re-fetch correct genre dictionary natively
            try {
                const allGenres = await mediaService.getGenres(mode);
                const uniqueGenres = Array.from(new Map(allGenres.map(item => [item.mal_id, item])).values());
                setGenres(uniqueGenres);

                // Emulate initial "All toggled" state
                const initialSelected = {};
                uniqueGenres.forEach(g => { initialSelected[g.mal_id] = true });
                setSelectedGenres(initialSelected);
            } catch (e) { console.error(e) }

            loadMedia(1, mode, '');
        };

        // Short delay
        const timer = setTimeout(initializeMode, 0);

        return () => clearTimeout(timer);
    }, [mode]);

    const loadMedia = async (pageToFetch = page, currentMode = mode, currentGenres = activeGenreString) => {
        if (loading || (!hasNextPage && pageToFetch !== 1)) return;

        setLoading(true);
        setError(null);

        try {
            const options = currentGenres ? { genres: currentGenres } : {};
            const result = await fetchMediaBatch(currentMode, pageToFetch, options);
            const newItems = result.data;

            setData(prev => {
                if (pageToFetch === 1) return newItems; // Reset on new mode
                const ids = new Set(prev.map(i => i.mal_id));
                const uniqueBatch = newItems.filter(i => !ids.has(i.mal_id));
                return [...prev, ...uniqueBatch];
            });

            setHasNextPage(result.hasNextPage);
            setPage(result.nextStartPage);

        } catch (err) {
            setError(err.message || `Failed to load ${currentMode}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleGenre = (id) => {
        setSelectedGenres(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const applyFilters = () => {
        const activeGenres = genres.filter(g => selectedGenres[g.mal_id]);
        let genreString = '';

        if (activeGenres.length > 0) {
            const isAllSelected = activeGenres.length === genres.length;

            if (!isAllSelected) {
                if (genreLogic === 'OR') {
                    // Prevent Jikan Constraint fault -> pick 1 random active constraint
                    const randomGenre = activeGenres[Math.floor(Math.random() * activeGenres.length)];
                    genreString = randomGenre.mal_id.toString();
                } else {
                    // AND -> combine explicitly 
                    genreString = activeGenres.map(g => g.mal_id).join(',');
                }
            }
        }

        setIsFilterModalVisible(false);
        setActiveGenreString(genreString);
        setData([]); // Clear UI 
        setPage(1);
        setHasNextPage(true);
        loadMedia(1, mode, genreString);
    };

    const renderFooter = () => {
        if (loading) {
            return (
                <View style={styles.footerContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={[styles.loadingText, { color: theme.subText }]}>Loading more {mode}...</Text>
                </View>
            );
        }

        if (!hasNextPage && data.length > 0) {
            return (
                <View style={styles.footerContainer}>
                    <Text style={[styles.endText, { color: theme.subText }]}>You have reached the end of the list.</Text>
                </View>
            );
        }

        if (data.length === 0) return null;

        return (
            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={[styles.loadMoreButton, { backgroundColor: theme.accent }]}
                    onPress={() => loadMedia()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.loadMoreText}>Load 50 More</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={theme.statusBar || 'default'}
                backgroundColor={theme.background}
            />

            {/* Global Header Filter Injection */}
            <View style={styles.filterRowContainer}>
                <SharedFilterButton onPress={() => setIsFilterModalVisible(true)} />
            </View>

            {error && data.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: theme.notification }]}>Error: {error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: theme.accent }]}
                        onPress={() => loadMedia(1, mode)}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={({ item }) => (
                        <AnimeCard
                            item={item}
                            mode={mode}
                            currentStatus={getAnimeStatus(item.mal_id)}
                            onUpdateLibrary={addToLibrary}
                            onPress={() => navigation.navigate('Details', { id: item.mal_id, type: mode })}
                        />
                    )}
                    keyExtractor={(item) => `${item.mal_id}`}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    ListFooterComponent={renderFooter}
                    onEndReachedThreshold={0.5}
                />
            )}

            {/* FAB for Mode Switching */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.accent }]}
                onPress={toggleMode}
                activeOpacity={0.8}
            >
                <Ionicons
                    name={mode === 'anime' ? 'book' : 'tv'}
                    size={24}
                    color="#fff"
                />
                <Text style={styles.fabText}>{mode === 'anime' ? 'Switch to Manga' : 'Switch to Anime'}</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isFilterModalVisible}
                onRequestClose={() => setIsFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Feed Filters</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSub, { color: theme.subText }]}>Toggle acceptable genres for Feed:</Text>

                        <View style={styles.logicContainer}>
                            <TouchableOpacity
                                style={[styles.logicBtn, genreLogic === 'AND' ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.border }]}
                                onPress={() => setGenreLogic('AND')}
                            >
                                <Text style={{ color: genreLogic === 'AND' ? '#fff' : theme.text, fontWeight: 'bold' }}>Require ALL (AND)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.logicBtn, genreLogic === 'OR' ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.border }]}
                                onPress={() => setGenreLogic('OR')}
                            >
                                <Text style={{ color: genreLogic === 'OR' ? '#fff' : theme.text, fontWeight: 'bold' }}>Require ANY (OR)</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalGenres}>
                            {genres.map(g => (
                                <TouchableOpacity
                                    key={g.mal_id}
                                    style={[styles.modalChip, { backgroundColor: selectedGenres[g.mal_id] ? theme.accent : theme.card }]}
                                    onPress={() => toggleGenre(g.mal_id)}
                                >
                                    <Text style={{ color: selectedGenres[g.mal_id] ? '#fff' : theme.subText, fontSize: 13, fontWeight: '500' }}>{g.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.accent }]} onPress={applyFilters}>
                            <Text style={styles.applyBtnText}>Apply Filters to List</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterRowContainer: {
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 5,
        alignItems: 'flex-end', // Right align natively above list
        zIndex: 10,
    },
    listContent: {
        padding: 10,
        paddingBottom: 80, // Add space for FAB
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    footerContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 50,
    },
    loadMoreButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        elevation: 2,
    },
    loadMoreText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingText: {
        marginTop: 10,
    },
    endText: {
        fontStyle: 'italic',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.7)'
    },
    modalContent: {
        flex: 1,
        borderRadius: 20,
        padding: 24,
        marginVertical: 40,
        backgroundColor: '#1E1E1E', // Matching theme dark default explicitly for elevation
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold'
    },
    modalSub: {
        marginBottom: 15,
        fontSize: 14
    },
    logicContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
        justifyContent: 'center'
    },
    logicBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1
    },
    modalGenres: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingBottom: 20
    },
    modalChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20
    },
    applyBtn: {
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 15
    },
    applyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18
    }
});
