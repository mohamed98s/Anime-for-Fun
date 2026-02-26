import React from 'react';
import { StyleSheet, View, Text, ScrollView, useWindowDimensions, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';

function HydratedRelationCard({ relationNode, theme, navigation }) {
    const { mal_id, type, relationType, name } = relationNode;

    // Queue queries safely by mal_id resolving uncropped posters dynamically.
    const { data: detailData, isLoading } = useQuery({
        queryKey: ['mediaDetails', type, mal_id],
        queryFn: () => mediaService.getMediaById(type, mal_id),
        staleTime: 1000 * 60 * 30,
        enabled: !!mal_id,
    });

    if (isLoading) {
        return (
            <View style={[styles.recCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.card, borderRadius: 12, height: 170 }]}>
                <ActivityIndicator size="small" color={theme.accent} />
            </View>
        );
    }

    // Utilize fetched data, falling back to basic generic paths flawlessly if Jikan fails payload isolation.
    const imageUrl = detailData?.images?.jpg?.large_image_url || detailData?.images?.jpg?.image_url || 'https://cdn.myanimelist.net/images/questionmark_50.gif';
    const displayTitle = detailData?.title_english || detailData?.title || name;

    return (
        <TouchableOpacity
            style={styles.recCard}
            onPress={() => navigation.push('Details', { id: mal_id, type: type || 'anime' })}
        >
            <View style={{ position: 'relative' }}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.recImage}
                    contentFit="cover"
                    transition={200}
                />
                <View style={[styles.relationBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.relationBadgeText}>{relationType}</Text>
                </View>
            </View>
            <Text style={[styles.recTitle, { color: theme.text }]} numberOfLines={2}>
                {displayTitle}
            </Text>
        </TouchableOpacity>
    );
}

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

    // --- Enhanced Metadata Extraction ---
    const productionEntities = displayItem?.studios || displayItem?.serializations || [];
    const productionText = productionEntities.map(p => p.name).join(', ');

    const seasonText = displayItem?.season ? displayItem.season.charAt(0).toUpperCase() + displayItem.season.slice(1) : '';
    const yearText = displayItem?.year || '';
    const seasonYearText = `${seasonText} ${yearText}`.trim();

    const tags = [
        ...(displayItem?.genres || []),
        ...(displayItem?.themes || []),
        ...(displayItem?.demographics || []),
    ];

    const genreIds = displayItem?.genres?.map(g => g.mal_id).join(',') || '';

    // --- Extended Statistical Metadata ---
    const rankText = displayItem?.rank ? `#${displayItem.rank}` : 'N/A';
    const popularityText = displayItem?.popularity ? `#${displayItem.popularity}` : 'N/A';
    const sourceText = displayItem?.source || 'Unknown';
    const durationText = displayItem?.duration || 'Unknown';
    const ratingText = displayItem?.rating || 'None';

    // --- Relations Engine Consolidation ---
    const relations = displayItem?.relations || [];
    const flatRelations = [];

    relations.forEach(relNode => {
        if (relNode.entry) {
            relNode.entry.forEach(entry => {
                // Securely append and filter undefined mappings resolving strict objects dynamically
                if (entry && entry.mal_id) {
                    flatRelations.push({ ...entry, relationType: relNode.relation });
                }
            });
        }
    });

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
            {/* Dual-Layer Stack Background */}
            <View style={StyleSheet.absoluteFillObject}>
                {/* Layer 1: Ambient Blur */}
                <Image
                    source={{ uri: displayItem.images?.jpg?.large_image_url || displayItem.images?.jpg?.image_url }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    blurRadius={40}
                    transition={200}
                    cachePolicy="memory-disk"
                />

                {/* Dark Overlay (Prevents text bleeding while protecting the Crisp focal poster above) */}
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />

                {/* Layer 2: The Crisp Foreground Poster */}
                <Image
                    source={{ uri: displayItem.images?.jpg?.large_image_url || displayItem.images?.jpg?.image_url }}
                    style={{ width: '100%', height: height * 0.55, position: 'absolute', top: 0 }}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
                />
            </View>

            {/* Scrollable Overlay Layer */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Dynamic Spacer: Pushes content down so ONLY the Title and Meta row are visible initially like a bottom sheet */}
                <View style={{ height: height - 180 }} />

                {/* Block 1: The Hero Intro */}
                <View style={[styles.island, styles.firstIsland, { backgroundColor: theme.background }]}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
                            {displayItem.title_english || displayItem.title}
                        </Text>
                        <View style={[styles.scoreBadge, { backgroundColor: theme.accent }]}>
                            <Text style={[styles.scoreText, { color: theme.background }]}>{displayItem.score || 'N/A'}</Text>
                        </View>
                    </View>

                    {/* Production Subtitle */}
                    {productionText ? (
                        <Text style={{ color: theme.subText, fontStyle: 'italic', marginBottom: 10, marginTop: -5 }}>{productionText}</Text>
                    ) : null}

                    {/* Extended Meta Row */}
                    <View style={styles.metaContainer}>
                        <Text style={[styles.metaText, { color: theme.subText }]}>
                            {[
                                displayItem.type,
                                seasonYearText,
                                displayItem.episodes ? `${displayItem.episodes} eps` : (displayItem.chapters ? `${displayItem.chapters} chaps` : null)
                            ].filter(Boolean).join(' • ')}
                        </Text>
                        <Text style={[styles.metaText, { color: theme.subText }]}>{displayItem.status}</Text>
                    </View>

                    {/* Unified Tags (Genres, Themes, Demographics) */}
                    {tags && tags.length > 0 && (
                        <View style={styles.genreContainer}>
                            {tags.map((tag) => (
                                <View key={tag.mal_id} style={[styles.genrePill, { backgroundColor: theme.border }]}>
                                    <Text style={[styles.genreText, { color: theme.text }]}>{tag.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Block 2: Synopsis & Background */}
                <View style={[styles.island, { backgroundColor: theme.background }]}>
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

                {/* Block 3: Characters */}
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

                {/* Block 4: Relations Engine */}
                {flatRelations.length > 0 && (
                    <View style={[styles.island, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sectionHeader, { color: theme.text }]}>Related Media</Text>
                        <FlatList
                            data={flatRelations}
                            renderItem={({ item }) => (
                                <HydratedRelationCard
                                    relationNode={item}
                                    theme={theme}
                                    navigation={navigation}
                                />
                            )}
                            keyExtractor={(item, index) => `${item.mal_id}-${index}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    </View>
                )}

                {/* Block 5: Recommendations */}
                {recommendations && recommendations.length > 0 && (
                    <View style={[styles.island, { backgroundColor: theme.background }]}>
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

                {/* Block 6: Deep Technical Stats (The Footer) */}
                <View style={[styles.island, styles.lastIsland, { backgroundColor: theme.background }]}>
                    <Text style={[styles.sectionHeader, { color: theme.text }]}>Information</Text>
                    <View style={[styles.statsGrid, { marginTop: 5 }]}>
                        <View style={styles.statsRow}>
                            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>Rank</Text>
                                <Text style={[styles.statValue, { color: theme.accent }]}>{rankText}</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>Popularity</Text>
                                <Text style={[styles.statValue, { color: theme.accent }]}>{popularityText}</Text>
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>Source</Text>
                                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{sourceText}</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>Duration</Text>
                                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{durationText}</Text>
                            </View>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: theme.card, marginTop: 8, alignItems: 'center' }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>Rating</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{ratingText}</Text>
                        </View>
                    </View>
                </View>
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
        minHeight: 220,
    },
    lastIsland: {
        marginBottom: 60,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
    },
    scoreBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    metaContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
        flexWrap: 'wrap',
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
    relationBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    relationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    statsGrid: {
        marginTop: 25,
        gap: 8,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statBox: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    prequelSequelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginBottom: 15,
    },
    relationCard: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        minHeight: 80,
    },
    relationCardPlaceholder: {
        flex: 1,
    },
    relationType: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 5,
        letterSpacing: 0.5,
    },
    relationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    glideCard: {
        width: 160,
        height: 100,
        padding: 15,
        borderRadius: 12,
        justifyContent: 'flex-start',
    },
});
