import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';
import { Ionicons } from '@expo/vector-icons';
import AnimeCard from '../components/AnimeCard';

export default function AdvancedSearchScreen({ navigation }) {
    const { theme } = useTheme();

    // 1. The Unified State
    const [filters, setFilters] = useState({
        mode: 'anime',
        sort: 'members',
        format: '',
        genre: ''
    });

    // 2. Fetch Genres Dynamically based on mode
    const { data: genresData } = useQuery({
        queryKey: ['genres', filters.mode],
        queryFn: async () => {
            const raw = await mediaService.getGenres(filters.mode);
            return raw || [];
        },
        staleTime: 1000 * 60 * 60 * 24, // Cache for 24h
    });

    // Deduplicate genres
    const genresList = genresData || [];
    const uniqueGenres = Array.from(new Map(genresList.map(item => [item.mal_id, item])).values());

    // 3. Infinite Query Engine
    const {
        data: discoveryData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['advancedSearchItems', filters],
        queryFn: async ({ pageParam = 1 }) => {
            return await mediaService.getDiscoveryPage(filters, pageParam);
        },
        getNextPageParam: (lastPage) => {
            if (lastPage?.hasNextPage) {
                return lastPage.nextStartPage;
            }
            return undefined;
        },
        staleTime: 1000 * 60 * 5, // 5 min
    });

    // Flatten pages sequentially
    const items = discoveryData?.pages.flatMap(page => page.data) || [];

    const updateFilter = (key, value) => {
        setFilters(prev => {
            // Un-toggle pattern: if it's already active, clicking sets it back to empty string
            let nextValue = prev[key] === value ? '' : value;

            // EXCEPTION: Enforce sort to never be fully empty natively
            if (key === 'sort' && !nextValue) {
                nextValue = 'members';
            }

            return {
                ...prev,
                [key]: nextValue
            };
        });
    };

    const updateMode = (newMode) => {
        setFilters({
            mode: newMode,
            sort: 'members', // Reset sort baseline
            format: '',      // Purge old formats spanning modes
            genre: ''        // Purge old generic mappings
        });
    };

    // Format Maps
    const ANIME_FORMATS = [
        { id: 'tv', label: 'TV' },
        { id: 'movie', label: 'Movie' },
        { id: 'ova', label: 'OVA' },
        { id: 'ona', label: 'ONA' },
        { id: 'special', label: 'Special' }
    ];
    const MANGA_FORMATS = [
        { id: 'manga', label: 'Manga' },
        { id: 'novel', label: 'Novel' },
        { id: 'lightnovel', label: 'Light Novel' },
        { id: 'manhwa', label: 'Manhwa' },
        { id: 'manhua', label: 'Manhua' }
    ];

    const activeFormats = filters.mode === 'anime' ? ANIME_FORMATS : MANGA_FORMATS;

    const renderItem = ({ item }) => (
        <AnimeCard
            item={item}
            onPress={() => navigation.push('Details', { id: item.mal_id, type: filters.mode, item })}
            isList={false}
        />
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.statusBar || 'default'} backgroundColor={theme.background} />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Advanced Search</Text>
            </View>

            {/* Tier 1: Mode Toggle */}
            <View style={[styles.modeContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={[styles.modeBtn, filters.mode === 'anime' && { backgroundColor: theme.accent }]}
                    onPress={() => updateMode('anime')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.modeText, filters.mode === 'anime' ? { color: '#fff' } : { color: theme.subText }]}>Anime</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeBtn, filters.mode === 'manga' && { backgroundColor: theme.accent }]}
                    onPress={() => updateMode('manga')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.modeText, filters.mode === 'manga' ? { color: '#fff' } : { color: theme.subText }]}>Manga</Text>
                </TouchableOpacity>
            </View>

            {/* Tier 2: Sort Controls */}
            <View style={styles.sortContainer}>
                <TouchableOpacity
                    style={[styles.sortBtn, filters.sort === 'members' ? { backgroundColor: theme.card, borderColor: theme.accent, borderWidth: 1 } : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                    onPress={() => updateFilter('sort', 'members')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="heart" size={16} color={filters.sort === 'members' ? theme.accent : theme.subText} style={{ marginRight: 6 }} />
                    <Text style={[styles.sortText, filters.sort === 'members' ? { color: theme.accent } : { color: theme.subText }]}>Popularity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.sortBtn, filters.sort === 'score' ? { backgroundColor: theme.card, borderColor: theme.accent, borderWidth: 1 } : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                    onPress={() => updateFilter('sort', 'score')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="star" size={16} color={filters.sort === 'score' ? theme.accent : theme.subText} style={{ marginRight: 6 }} />
                    <Text style={[styles.sortText, filters.sort === 'score' ? { color: theme.accent } : { color: theme.subText }]}>Ranked Score</Text>
                </TouchableOpacity>
            </View>

            {/* Tier 3: Format Row */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollBlock}>
                    {activeFormats.map(fmt => (
                        <TouchableOpacity
                            key={fmt.id}
                            style={[
                                styles.pill,
                                filters.format === fmt.id ? { backgroundColor: theme.accent, borderColor: theme.accent } : { backgroundColor: theme.card, borderColor: theme.border }
                            ]}
                            onPress={() => updateFilter('format', fmt.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.pillText, filters.format === fmt.id ? { color: '#fff' } : { color: theme.text }]}>{fmt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Tier 4: Genre Row */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollBlock}>
                    {uniqueGenres.map(g => (
                        <TouchableOpacity
                            key={g.mal_id}
                            style={[
                                styles.pill,
                                filters.genre === g.mal_id.toString() ? { backgroundColor: theme.accent, borderColor: theme.accent } : { backgroundColor: theme.card, borderColor: theme.border }
                            ]}
                            onPress={() => updateFilter('genre', g.mal_id.toString())}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.pillText, filters.genre === g.mal_id.toString() ? { color: '#fff' } : { color: theme.text }]}>{g.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* The Infinite Grid */}
            <View style={styles.gridContainer}>
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.accent} />
                    </View>
                ) : items.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="search-outline" size={48} color={theme.subText} />
                        <Text style={[styles.emptyText, { color: theme.subText }]}>No titles match this combination.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item.mal_id}-${index}`}
                        numColumns={3}
                        columnWrapperStyle={styles.columnWrapper}
                        contentContainerStyle={styles.listContent}
                        onEndReached={() => {
                            if (hasNextPage) fetchNextPage();
                        }}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modeContainer: {
        flexDirection: 'row',
        marginHorizontal: 10,
        marginTop: 10,
        marginBottom: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    modeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    sortContainer: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        marginBottom: 8,
        gap: 8,
    },
    sortBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    sortText: {
        fontSize: 14,
        fontWeight: '600',
    },
    filterRow: {
        height: 38,
        marginBottom: 8,
    },
    scrollBlock: {
        paddingHorizontal: 10,
        gap: 8,
        alignItems: 'center',
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '500',
    },
    gridContainer: {
        flex: 1,
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
    emptyText: {
        marginTop: 10,
        fontSize: 16,
    },
    footerLoader: {
        paddingVertical: 20,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
