import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import ImageViewing from 'react-native-image-viewing';
import { mediaService } from '../services/mediaService';
import { useTheme } from '../context/ThemeContext';

export default function MediaGallery({ mediaId, mediaType }) {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const { data: galleryImages = [], isLoading } = useQuery({
        queryKey: mediaType === 'manga' ? ['mangaPictures', mediaId] : ['animeImdbImages', mediaId],
        queryFn: () => mediaType === 'manga'
            ? mediaService.getMangaPictures(mediaId)
            : mediaService.getAnimeImdbImages(mediaId),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours caching effectively
    });

    if (isLoading) {
        return (
            <View style={styles.container}>
                <FlatList
                    horizontal
                    data={[1, 2, 3]}
                    keyExtractor={(i) => i.toString()}
                    showsHorizontalScrollIndicator={false}
                    renderItem={() => (
                        <View style={[
                            mediaType === 'manga' ? styles.mangaSkeleton : styles.animeSkeleton,
                            { backgroundColor: theme.card, width: mediaType === 'manga' ? 120 : width - 40 }
                        ]}>
                            <ActivityIndicator size="small" color={theme.subText} style={{ flex: 1 }} />
                        </View>
                    )}
                    contentContainerStyle={styles.listContainer}
                />
            </View>
        );
    }

    if (!galleryImages || galleryImages.length === 0) return null;

    const handleScroll = (event) => {
        if (mediaType === 'anime') {
            const itemWidth = width - 40 + 15; // Component width plus gap spacing Native calculation
            const scrollX = event.nativeEvent.contentOffset.x;
            const index = Math.round(scrollX / itemWidth);
            // Protect against out-of-bounds scrolling bounces natively
            if (index >= 0 && index < galleryImages.length && index !== currentIndex) {
                setCurrentIndex(index);
            }
        }
    };

    const handleImagePress = (index) => {
        setViewerIndex(index);
        setViewerVisible(true);
    };

    const isManga = mediaType === 'manga';
    const itemWidth = isManga ? 120 : width - 40;

    return (
        <View style={styles.container}>
            <FlatList
                data={galleryImages}
                keyExtractor={(item, index) => `${index}-${item.uri}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={!isManga}
                snapToInterval={!isManga ? itemWidth + 15 : undefined} // itemWidth + gap natively syncing slides
                decelerationRate={isManga ? "normal" : "fast"}
                onMomentumScrollEnd={!isManga ? handleScroll : undefined}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item, index }) => (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => handleImagePress(index)}>
                        <Image
                            source={{ uri: item.uri }}
                            style={[
                                isManga ? styles.mangaImage : styles.animeImage,
                                { width: itemWidth }
                            ]}
                            contentFit="cover"
                            transition={300}
                        />
                    </TouchableOpacity>
                )}
            />

            {!isManga && galleryImages.length > 1 && (
                <View style={styles.paginationContainer}>
                    {galleryImages.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: i === currentIndex ? theme.accent : theme.border }
                            ]}
                        />
                    ))}
                </View>
            )}

            <ImageViewing
                images={galleryImages}
                imageIndex={viewerIndex}
                visible={viewerVisible}
                onRequestClose={() => setViewerVisible(false)}
                swipeToCloseEnabled={true}
                doubleTapToZoomEnabled={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    listContainer: {
        paddingHorizontal: 20,
        gap: 15,
    },
    mangaImage: {
        height: 180,
        borderRadius: 8,
    },
    animeImage: {
        aspectRatio: 16 / 9,
        borderRadius: 12,
    },
    mangaSkeleton: {
        height: 180,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animeSkeleton: {
        aspectRatio: 16 / 9,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
