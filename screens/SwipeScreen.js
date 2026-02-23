import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-deck-swiper';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';
import { useEndlessSwiper } from '../controllers/discoveryController';

export default function SwipeScreen({ route, navigation }) {
    const { title, options } = route.params;
    const genreName = title;
    const { theme } = useTheme();
    const { mode, modeVersion } = useMediaMode();
    const { addToLibrary, library } = useLibrary();

    const { width, height } = useWindowDimensions();
    const isTablet = width >= 600;

    const { buffer: cards, loading, empty: finished, recordSwipe, getNextBatch } = useEndlessSwiper(mode, options);

    const [currentIndex, setCurrentIndex] = useState(0);
    const swiperRef = useRef(null);

    // Global Reset Signal Listener natively handled by hook since options/mode are dependencies
    useEffect(() => {
        if (modeVersion > 0) {
            setCurrentIndex(0);
        }
    }, [modeVersion]);

    const handleSwipedRight = (cardIndex) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        recordSwipe(cardIndex, 'like');
    };

    const handleSwipedLeft = (cardIndex) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        recordSwipe(cardIndex, 'skip');
    };

    const handleSwiped = (cardIndex) => {
        setCurrentIndex(cardIndex + 1);
    };

    const handleSwipedAll = () => {
        if (!finished) {
            getNextBatch();
        } else {
            navigation.goBack();
        }
    };

    const renderCard = (card) => {
        if (!card) return null;

        return (
            <View style={styles.card}>
                <Image
                    source={{ uri: card.images?.jpg?.large_image_url || card.images?.jpg?.image_url }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)', '#000']}
                    style={styles.gradientOverlay}
                />

                {card.score && (
                    <View style={styles.scoreBadge}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.scoreText}>{card.score}</Text>
                    </View>
                )}

                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {card.title_english || card.title}
                    </Text>

                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{card.year || (card.status === 'Currently Airing' || card.status === 'Publishing' ? 'Publishing' : 'Finished')}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaText}>{card.type || (mode === 'anime' ? 'TV' : 'Manga')}</Text>
                        {card.episodes && (
                            <>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaText}>{card.episodes} Eps</Text>
                            </>
                        )}
                        {card.chapters && (
                            <>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaText}>{card.chapters} Chp</Text>
                            </>
                        )}
                    </View>

                    <View style={styles.genreContainer}>
                        {card.genres && card.genres.slice(0, 3).map(g => (
                            <View key={g.mal_id} style={[styles.genreChip, { backgroundColor: theme.accent + '40' }]}>
                                <Text style={[styles.genreText, { color: theme.accent }]}>{g.name}</Text>
                            </View>
                        ))}
                    </View>

                    {card.synopsis && (
                        <Text style={styles.synopsisText} numberOfLines={3}>
                            {card.synopsis.replace('[Written by MAL Rewrite]', '').trim()}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    if (loading && cards.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Dynamic Blurred Background */}
            {cards.length > currentIndex && cards[currentIndex]?.images?.jpg?.image_url && (
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: cards[currentIndex].images.jpg.image_url }}
                        style={StyleSheet.absoluteFill}
                        blurRadius={8}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <BlurView
                        intensity={80}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{genreName}</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.swiperContainer}>
                {cards.length > 0 ? (
                    <Swiper
                        key={modeVersion} // Natively destroy & recreate when Mode flips to hard reset internals
                        ref={swiperRef}
                        cards={cards} // Safe mapping
                        renderCard={(card) => {
                            if (!card) return null;
                            return renderCard(card);
                        }}
                        onSwiped={handleSwiped}
                        onSwipedRight={handleSwipedRight}
                        onSwipedLeft={handleSwipedLeft}
                        onSwipedAll={handleSwipedAll}
                        backgroundColor={'transparent'}
                        stackSize={3}
                        cardStyle={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            width: '100%',
                            height: '100%'
                        }}
                        cardVerticalMargin={0}
                        cardHorizontalMargin={0}
                        animateCardOpacity
                        swipeBackCard={false}
                        disableBottomSwipe
                        disableTopSwipe
                        overlayLabels={{
                            left: {
                                title: 'SKIP',
                                style: {
                                    label: {
                                        backgroundColor: 'transparent',
                                        borderColor: '#FF3B30',
                                        color: '#FF3B30',
                                        borderWidth: 5,
                                        borderRadius: 15,
                                        fontSize: 42,
                                        fontWeight: '900',
                                        padding: 15,
                                        transform: [{ rotate: '20deg' }]
                                    },
                                    wrapper: {
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        justifyContent: 'flex-start',
                                        marginTop: 50,
                                        marginLeft: -40
                                    }
                                }
                            },
                            right: {
                                title: 'LIKE',
                                style: {
                                    label: {
                                        backgroundColor: 'transparent',
                                        borderColor: '#34C759',
                                        color: '#34C759',
                                        borderWidth: 5,
                                        borderRadius: 15,
                                        fontSize: 42,
                                        fontWeight: '900',
                                        padding: 15,
                                        transform: [{ rotate: '-20deg' }]
                                    },
                                    wrapper: {
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-start',
                                        marginTop: 50,
                                        marginLeft: 40
                                    }
                                }
                            }
                        }}
                    />
                ) : !finished ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search" size={100} color={theme.accent} style={{ opacity: 0.8, marginBottom: 20 }} />
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>Searching...</Text>
                        <Text style={{ color: '#ccc', marginTop: 15, textAlign: 'center', marginHorizontal: 40, fontSize: 16 }}>
                            Skipped anime you already have. Want us to look further?
                        </Text>
                        <TouchableOpacity
                            style={[styles.returnButton, { backgroundColor: theme.accent }]}
                            onPress={() => requestMore()}
                        >
                            <Text style={styles.returnButtonText}>Keep Looking</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-done-circle" size={100} color={theme.accent} style={{ opacity: 0.8, marginBottom: 20 }} />
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>All caught up!</Text>
                        <Text style={{ color: '#ccc', marginTop: 15, textAlign: 'center', marginHorizontal: 40, fontSize: 16 }}>
                            You've seen everything we have for this category right now.
                        </Text>
                        <TouchableOpacity
                            style={[styles.returnButton, { backgroundColor: theme.accent }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.returnButtonText}>Back to Discovery</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Bottom Controls */}
            {cards.length > 0 && (
                <View style={styles.bottomControls}>
                    <TouchableOpacity
                        style={[styles.controlButton, { borderColor: '#FF3B30', borderWidth: 2 }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            if (swiperRef.current) swiperRef.current.swipeLeft();
                        }}
                    >
                        <Ionicons name="close" size={38} color="#FF3B30" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, { borderColor: theme.accent, borderWidth: 2 }]}
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            if (swiperRef.current) swiperRef.current.swipeRight();
                        }}
                    >
                        <Ionicons name="heart" size={38} color={theme.accent} />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    backButton: { padding: 5, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
    swiperContainer: {
        flex: 1,
    },
    card: {
        flex: 1,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
        backgroundColor: '#1E1E1E'
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        top: '40%',
    },
    scoreBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
    },
    scoreText: {
        color: '#FFD700',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 16,
    },
    cardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 25,
    },
    cardTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 10,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    metaText: {
        color: '#E0E0E0',
        fontSize: 15,
        fontWeight: '600',
    },
    metaDot: {
        color: '#E0E0E0',
        marginHorizontal: 8,
        fontSize: 15,
    },
    genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
    },
    genreChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginRight: 8,
        marginBottom: 8,
    },
    genreText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    synopsisText: {
        color: '#CCCCCC',
        fontSize: 14,
        lineHeight: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    returnButton: {
        marginTop: 30,
        paddingVertical: 15,
        paddingHorizontal: 35,
        borderRadius: 30,
        elevation: 5,
    },
    returnButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 10,
    },
    controlButton: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
    }
});
