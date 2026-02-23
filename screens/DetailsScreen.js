import React from 'react';
import { StyleSheet, View, Text, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';

export default function DetailsScreen({ route }) {
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

                <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
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
    contentContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
        padding: 20,
        minHeight: 500,
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
});
