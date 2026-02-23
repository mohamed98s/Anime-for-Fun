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
    Animated
} from 'react-native';
import AnimeCard from '../components/AnimeCard';
import { fetchMediaBatch } from '../services/api';
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

    // Reload when mode changes
    useEffect(() => {
        setData([]);
        setPage(1);
        setHasNextPage(true);
        setLoading(false); // Reset loading state

        // Short delay to allow state to reset before fetching
        const timer = setTimeout(() => {
            loadMedia(1, mode); // Pass 1 explicitly
        }, 0);

        return () => clearTimeout(timer);
    }, [mode]);

    const loadMedia = async (pageToFetch = page, currentMode = mode) => {
        if (loading || (!hasNextPage && pageToFetch !== 1)) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchMediaBatch(currentMode, pageToFetch);
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    }
});
