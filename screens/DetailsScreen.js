import React from 'react';
import { StyleSheet, View, Text, ScrollView, useWindowDimensions, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';

export default function DetailsScreen({ route, navigation }) {
    const { id, type, item } = route.params || {};
    const mediaId = id || item?.mal_id;
    const mediaType = type || (item?.episodes !== undefined ? 'anime' : 'manga');

    const { theme } = useTheme();
    const { height } = useWindowDimensions();

    const { data: fullItem, isLoading } = useQuery({
        queryKey: ['mediaDetails', mediaType, mediaId],
        queryFn: () => mediaService.getMediaById(mediaType, mediaId),
        staleTime: 1000 * 60 * 30, // Cache full details natively for 30 minutes
        enabled: !!mediaId,
    });

    const displayItem = fullItem || item;

    const genreIds = displayItem?.genres?.map(g => g.mal_id).join(',') || '';

    const { data: characters } = useQuery({
        queryKey: ['mediaCharacters', mediaType, mediaId],
        queryFn: () => mediaService.getMediaCharacters(mediaType, mediaId),
        staleTime: 1000 * 60 * 30,
        enabled: !!displayItem,
    });

    const { data: recommendations } = useQuery({
        queryKey: ['mediaDetailsRecommendations', mediaType, mediaId, genreIds],
        queryFn: () => mediaService.getMediaDetailsRecommendations(mediaType, mediaId, genreIds),
        staleTime: 1000 * 60 * 30,
        enabled: !!displayItem,
    });

    const { data: aniListGenres, isLoading: isAniListLoading } = useQuery({
        queryKey: ['aniListGenres', mediaType, mediaId],
        queryFn: () => mediaService.getAniListGenres(mediaType, mediaId),
        staleTime: 1000 * 60 * 30,
        enabled: !!displayItem && !isLoading, // Parallel trigger post-load 
    });

    const { data: kitsuGenres, isLoading: isKitsuLoading } = useQuery({
        queryKey: ['kitsuGenres', mediaType, mediaId],
        queryFn: () => mediaService.getKitsuGenres(mediaType, mediaId),
        staleTime: 1000 * 60 * 30,
        enabled: !!displayItem && !isLoading,
    });

    const renderCharacter = ({ item }) => {
        const imageUrl = item.character?.images?.jpg?.image_url || 'https://cdn.myanimelist.net/images/questionmark_50.gif';
        return (
            <View style={styles.characterCard}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.characterImage}
                    contentFit="cover"
                    transition={200}
                />
                <Text style={[styles.characterName, { color: theme.text }]} numberOfLines={2}>
                    {item.character?.name}
                </Text>
            </View>
        );
    };

    const renderRecommendation = ({ item }) => {
        const entry = item.entry;
        if (!entry) return null;

        return (
            <TouchableOpacity
                style={styles.recCard}
                onPress={() => navigation.push('Details', { id: entry.mal_id, type: mediaType })}
            >
                <Image
                    source={{ uri: entry.images?.jpg?.image_url || entry.images?.jpg?.large_image_url }}
                    style={styles.recImage}
                    contentFit="cover"
                    transition={200}
                />
                <Text style={[styles.recTitle, { color: theme.text }]} numberOfLines={2}>
                    {entry.title}
                </Text>
            </TouchableOpacity>
        );
    };

    if (!displayItem && isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    if (!displayItem) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text }}>Item not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Fixed Background Image */}
            <Image
                source={{ uri: displayItem.images?.jpg?.large_image_url || displayItem.images?.jpg?.image_url }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
            />

            {/* Scrollable Overlay Layer */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Dynamic Spacer: Pushes content down so ONLY the Title and Meta row are visible initially like a bottom sheet */}
                <View style={{ height: height - 180 }} />

                {/* Block 1: Details & Synopsis */}
                <View style={[styles.island, styles.firstIsland, { backgroundColor: theme.background }]}>
                    <Text style={[styles.title, { color: theme.text }]}>
                        {displayItem.title_english || displayItem.title}
                    </Text>

                    <View style={styles.metaContainer}>
                        <Text style={[styles.score, { color: theme.accent }]}>Score: {displayItem.score || 'N/A'}</Text>
                        <Text style={[styles.metaText, { color: theme.subText }]}>
                            {displayItem.type} • {displayItem.episodes ? `${displayItem.episodes} eps` : (displayItem.chapters ? `${displayItem.chapters} chaps` : '?')}
                        </Text>
                        <Text style={[styles.metaText, { color: theme.subText }]}>{displayItem.status}</Text>
                    </View>

                    {/* Genre Tags (Block 1 Addition) */}
                    {displayItem.genres && displayItem.genres.length > 0 && (
                        <View style={styles.genreContainer}>
                            {displayItem.genres.map((genre) => (
                                <View key={genre.mal_id} style={[styles.genrePill, { backgroundColor: theme.border }]}>
                                    <Text style={[styles.genreText, { color: theme.text }]}>{genre.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <Text style={[styles.sectionHeader, { color: theme.text }]}>Synopsis</Text>
                    <Text style={[styles.synopsis, { color: theme.subText }]}>
                        {displayItem.synopsis || 'No synopsis available.'}
                    </Text>

                    {displayItem.background && (
                        <>
                            <Text style={[styles.sectionHeader, { color: theme.text, marginTop: 20 }]}>Background</Text>
                            <Text style={[styles.synopsis, { color: theme.subText }]}>
                                {displayItem.background}
                            </Text>
                        </>
                    )}
                </View>

                {/* Block 1.5: API Genre Test Island */}
                <View style={[styles.island, { backgroundColor: theme.card, borderColor: theme.accent, borderWidth: 1 }]}>
                    <Text style={[styles.testHeader, { color: theme.accent }]}>Multi-API Genre Test (Debug)</Text>

                    {/* Jikan DB */}
                    <Text style={[styles.testSubHeader, { color: theme.text }]}>Jikan API (Current)</Text>
                    <View style={styles.testGenreContainer}>
                        {displayItem.genres && displayItem.genres.length > 0 ? displayItem.genres.map((genre) => (
                            <Text key={genre.mal_id} style={[styles.testPill, { backgroundColor: theme.border, color: theme.text }]}>{genre.name}</Text>
                        )) : <Text style={{ color: theme.subText }}>None</Text>}
                    </View>

                    {/* AniList DB */}
                    <Text style={[styles.testSubHeader, { color: theme.text, marginTop: 15 }]}>AniList (GraphQL)</Text>
                    {isAniListLoading ? (
                        <ActivityIndicator size="small" color={theme.accent} style={{ alignSelf: 'flex-start' }} />
                    ) : aniListGenres && aniListGenres.length > 0 ? (
                        <View style={styles.testGenreContainer}>
                            {aniListGenres.map((genre, idx) => (
                                <Text key={idx} style={[styles.testPill, { backgroundColor: theme.border, color: theme.text }]}>{genre}</Text>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ fontStyle: 'italic', color: theme.subText }}>No AniList Mapping Found</Text>
                    )}

                    {/* Kitsu DB */}
                    <Text style={[styles.testSubHeader, { color: theme.text, marginTop: 15 }]}>Kitsu (REST)</Text>
                    {isKitsuLoading ? (
                        <ActivityIndicator size="small" color={theme.accent} style={{ alignSelf: 'flex-start' }} />
                    ) : kitsuGenres && kitsuGenres.length > 0 ? (
                        <View style={styles.testGenreContainer}>
                            {kitsuGenres.map((genre, idx) => (
                                <Text key={idx} style={[styles.testPill, { backgroundColor: theme.border, color: theme.text }]}>{genre}</Text>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ fontStyle: 'italic', color: theme.subText }}>No Kitsu Mapping Found</Text>
                    )}
                </View>

                {/* Block 2: Characters */}
                {characters && characters.length > 0 && (
                    <View style={[styles.island, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sectionHeader, { color: theme.text }]}>Characters</Text>
                        <FlatList
                            data={characters}
                            renderItem={renderCharacter}
                            keyExtractor={(item, index) => `${item.character?.mal_id}-${index}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    </View>
                )}

                {/* Block 3: Recommendations */}
                {recommendations && recommendations.length > 0 && (
                    <View style={[styles.island, styles.lastIsland, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sectionHeader, { color: theme.text }]}>Recommendations</Text>
                        <FlatList
                            data={recommendations}
                            renderItem={renderRecommendation}
                            keyExtractor={(item, index) => `${item.entry?.mal_id}-${index}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    image: {
        width: '100%',
    },
    island: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 40,
    },
    firstIsland: {
        marginTop: -20,
    },
    lastIsland: {
        marginBottom: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    metaContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    score: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    metaText: {
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    synopsis: {
        fontSize: 16,
        lineHeight: 24,
    },
    genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 15,
    },
    genrePill: {
        borderRadius: 15,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    genreText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    horizontalList: {
        paddingVertical: 10,
    },
    characterCard: {
        width: 100,
        alignItems: 'center',
        marginRight: 15,
    },
    characterImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 8,
        backgroundColor: '#ccc',
    },
    characterName: {
        fontSize: 14,
        textAlign: 'center',
    },
    recCard: {
        width: 120,
        marginRight: 15,
    },
    recImage: {
        width: 120,
        height: 170,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#ccc',
    },
    recTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    testHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    testSubHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    testGenreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    testPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        fontSize: 12,
        overflow: 'hidden',
    }
});
