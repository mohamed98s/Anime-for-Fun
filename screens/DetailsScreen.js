import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, useWindowDimensions, ActivityIndicator, FlatList, TouchableOpacity, Modal, Pressable, TextInput, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';
import MediaGallery from '../components/MediaGallery';
import ParentalGuideModal from '../components/ParentalGuideModal';

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

    // Abort rendering completely if the fetched entity was blocked (e.g. Kids demographic filter applied in api.js)
    if (!detailData) return null;

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
    const { getAnimeStatus, addToLibrary } = useLibrary();

    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [expandedRelations, setExpandedRelations] = useState({});

    // Library Integration State
    const [libraryModalVisible, setLibraryModalVisible] = useState(false);
    const [progressInput, setProgressInput] = useState('');
    const [showProgressInput, setShowProgressInput] = useState(false);

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

    // --- Library Integration Logic ---
    const currentStatus = getAnimeStatus ? getAnimeStatus(mediaId, mediaType) : null;
    const totalItems = mediaType === 'anime' ? displayItem?.episodes : displayItem?.chapters;
    const isNotAired = displayItem?.status === 'Not yet aired';
    const isAiring = displayItem?.status === 'Currently Airing' || displayItem?.status === 'Publishing';

    const activeLabel = mediaType === 'anime' ? 'Watching' : 'Reading';
    const planLabel = mediaType === 'anime' ? 'Plan to Watch' : 'Plan to Read';
    const unitLabel = mediaType === 'anime' ? 'Episode' : 'Chapter';

    const handleAddPress = () => {
        setLibraryModalVisible(true);
        setShowProgressInput(false);
        setProgressInput('');
    };

    const handleStatusSelect = (status) => {
        if (status === activeLabel) {
            if (mediaType === 'anime' && isNotAired && !totalItems) {
                Alert.alert('Cannot Add', 'This anime has not aired yet.');
                return;
            }
            setShowProgressInput(true);
            setProgressInput('1');
        } else {
            if (addToLibrary) addToLibrary(displayItem, status);
            setLibraryModalVisible(false);
        }
    };

    const validateProgress = (val) => {
        const num = parseInt(val, 10);
        if (isNaN(num)) return 0;
        if (num < 0) return 0;
        if (totalItems && num > totalItems) return totalItems;
        if (isAiring && !totalItems && num > 5000) return 5000;
        return num;
    };

    const handleIncrement = () => {
        const current = parseInt(progressInput, 10) || 0;
        setProgressInput(validateProgress(current + 1).toString());
    };

    const handleDecrement = () => {
        const current = parseInt(progressInput, 10) || 0;
        setProgressInput(validateProgress(current - 1).toString());
    };

    const handleActiveSubmit = () => {
        const prog = validateProgress(progressInput);
        if (addToLibrary) addToLibrary(displayItem, activeLabel, prog);
        setLibraryModalVisible(false);
    };

    // --- Smart Lazy-Loaded Relations Engine ---
    const relations = displayItem?.relations || [];
    const immediateRelations = [];
    const groupedRelations = {};

    relations.forEach(relNode => {
        const relationType = relNode.relation;
        const lowerType = relationType.toLowerCase();

        if (!relNode.entry) return;

        if (lowerType === 'prequel' || lowerType === 'sequel') {
            relNode.entry.forEach(entry => {
                if (entry && entry.mal_id) {
                    immediateRelations.push({ ...entry, relationType });
                }
            });
        } else {
            relNode.entry.forEach(entry => {
                if (entry && entry.mal_id) {
                    if (!groupedRelations[relationType]) {
                        groupedRelations[relationType] = [];
                    }
                    groupedRelations[relationType].push({ ...entry, relationType });
                }
            });
        }
    });

    const handleExpandRelation = (relType) => {
        setExpandedRelations(prev => ({
            ...prev,
            [relType]: (prev[relType] || 0) + 3
        }));
    };

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
            <TouchableOpacity
                style={styles.characterCard}
                onPress={() => navigation.push('CharacterDetails', { id: item.character.mal_id })}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.characterImage}
                    contentFit="cover"
                    transition={200}
                />
                <Text style={[styles.characterName, { color: theme.text }]} numberOfLines={2}>
                    {item.character?.name}
                </Text>
            </TouchableOpacity>
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
            {/* Single App Background Image (Restored) */}
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
                {/* Dynamic Spacer bound to Image Modal Toggle */}
                <Pressable onPress={() => setIsImageModalVisible(true)}>
                    <View style={{ height: height - 180 }} />
                </Pressable>

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

                    {/* Action Buttons */}
                    <TouchableOpacity
                        style={[styles.libraryButton, { backgroundColor: theme.accent }]}
                        onPress={handleAddPress}
                    >
                        <Ionicons name={currentStatus ? "checkmark-circle" : "add-circle-outline"} size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={[styles.libraryButtonText, { color: '#fff' }]}>
                            {currentStatus ? 'Update Status' : '+ Add to Library'}
                        </Text>
                    </TouchableOpacity>

                    {/* Bandwidth-Efficient Parental Guide Overlay */}
                    <ParentalGuideModal title={displayItem?.title_english || displayItem?.title} />
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

                {/* Block 2.5: Media Gallery Glide */}
                <MediaGallery
                    mediaId={mediaId}
                    mediaType={mediaType}
                    title={displayItem?.title_english || displayItem?.title}
                />

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

                {/* Block 4: Smart Relations Engine */}
                {(immediateRelations.length > 0 || Object.keys(groupedRelations).length > 0) && (
                    <View style={[styles.island, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sectionHeader, { color: theme.text }]}>Related Media</Text>

                        {/* Immediate Relations (Prequels/Sequels) */}
                        {immediateRelations.length > 0 && (
                            <FlatList
                                data={immediateRelations}
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
                                contentContainerStyle={[styles.horizontalList, { marginBottom: Object.keys(groupedRelations).length > 0 ? 20 : 0 }]}
                            />
                        )}

                        {/* Grouped Accordion Relations */}
                        {Object.keys(groupedRelations).map(type => {
                            const groupList = groupedRelations[type];
                            const visibleCount = expandedRelations[type] || 0;
                            const visibleItems = groupList.slice(0, visibleCount);
                            const hasMore = visibleCount < groupList.length;

                            return (
                                <View key={type} style={styles.relationGroupContainer}>
                                    <View style={styles.relationGroupHeaderRow}>
                                        <Text style={[styles.relationGroupTitle, { color: theme.text }]}>{type}</Text>
                                        {visibleCount === 0 && (
                                            <TouchableOpacity onPress={() => handleExpandRelation(type)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <Text style={[styles.expandText, { color: theme.accent }]}>Expand / View All</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {visibleCount > 0 && (
                                        <FlatList
                                            data={visibleItems}
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
                                    )}

                                    {visibleCount > 0 && hasMore && (
                                        <TouchableOpacity style={styles.loadMoreButton} onPress={() => handleExpandRelation(type)}>
                                            <Text style={[styles.loadMoreText, { color: theme.accent }]}>Load 3 More</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
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

            {/* --- Library Management Modal --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={libraryModalVisible}
                onRequestClose={() => setLibraryModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setLibraryModalVisible(false)}>
                    <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Add to Library</Text>

                                {!showProgressInput ? (
                                    <>
                                        <TouchableOpacity style={[styles.modalOption, { backgroundColor: theme.background }]} onPress={() => handleStatusSelect(activeLabel)}>
                                            <Text style={[styles.optionText, { color: theme.text }]}>{activeLabel}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.modalOption, { backgroundColor: theme.background }]} onPress={() => handleStatusSelect('Completed')}>
                                            <Text style={[styles.optionText, { color: theme.text }]}>Completed</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.modalOption, { backgroundColor: theme.background }]} onPress={() => handleStatusSelect(planLabel)}>
                                            <Text style={[styles.optionText, { color: theme.text }]}>{planLabel}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.progressContainer}>
                                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                                            {unitLabel} Progress: {totalItems ? `/ ${totalItems}` : ''}
                                        </Text>

                                        <View style={styles.counterRow}>
                                            <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={handleDecrement}>
                                                <Ionicons name="remove" size={24} color={theme.accent} />
                                            </TouchableOpacity>

                                            <TextInput
                                                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                                                keyboardType="numeric"
                                                value={progressInput}
                                                onChangeText={(txt) => setProgressInput(txt)}
                                                onEndEditing={() => setProgressInput(validateProgress(progressInput).toString())}
                                                placeholderTextColor={theme.subText}
                                            />

                                            <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={handleIncrement}>
                                                <Ionicons name="add" size={24} color={theme.accent} />
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleActiveSubmit}>
                                            <Text style={styles.saveButtonText}>Save Progress</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity style={styles.cancelButton} onPress={() => setLibraryModalVisible(false)}>
                                    <Text style={[styles.cancelText, { color: theme.subText }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Full-Screen Image Viewer Modal */}
            <Modal visible={isImageModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.modalSafe}>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsImageModalVisible(false)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Image
                            source={{ uri: displayItem.images?.jpg?.large_image_url || displayItem.images?.jpg?.image_url }}
                            style={styles.modalImage}
                            contentFit="contain"
                            transition={200}
                        />
                    </SafeAreaView>
                </View>
            </Modal>
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
    imageViewerModalOverlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalSafe: {
        flex: 1,
    },
    modalCloseButton: {
        alignSelf: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 10,
        zIndex: 10,
    },
    modalCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalImage: {
        flex: 1,
        width: '100%',
    },
    relationGroupContainer: {
        marginTop: 5,
        marginBottom: 15,
    },
    relationGroupHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 5,
    },
    relationGroupTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        opacity: 0.9,
    },
    expandText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    loadMoreButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 5,
        marginLeft: 5,
    },
    loadMoreText: {
        fontWeight: 'bold',
        fontSize: 14,
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
    libraryButton: {
        marginTop: 15,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        elevation: 2,
    },
    libraryButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalOption: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    optionText: {
        fontWeight: '600',
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    inputLabel: {
        marginBottom: 15,
        fontSize: 16,
        fontWeight: '600',
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 15,
    },
    counterBtn: {
        padding: 10,
        borderRadius: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        width: 60,
        padding: 10,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
    saveButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 10,
        padding: 10,
    },
    cancelText: {
        fontWeight: 'bold',
    },
});
