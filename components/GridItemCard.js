import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const GridItemCard = ({ item, onPress }) => {
    const { theme } = useTheme();

    // Default formatting fallbacks
    const imageUrl = item.images?.jpg?.image_url || 'https://placehold.co/150x225/png';
    const title = item.title_english || item.title || 'Unknown Title';
    const score = item.score ? item.score.toFixed(1) : 'N/A';
    const format = item.type || '';

    // Conditionally map Format pill background colors
    let formatColor = 'rgba(0,0,0,0.6)';
    if (format === 'TV') formatColor = '#4CAF50'; // Green
    if (format === 'Movie') formatColor = '#E91E63'; // Pink
    if (format === 'OVA' || format === 'ONA') formatColor = '#2196F3'; // Blue
    if (format === 'Manga' || format === 'Manhwa') formatColor = '#ff9800'; // Orange

    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.poster}
                    contentFit="cover"
                    transition={200}
                />

                {/* Top-Right Absolute Score Badge */}
                <View style={styles.scoreBadge}>
                    <Ionicons name="star" size={10} color="#FFD700" style={{ marginRight: 2 }} />
                    <Text style={styles.scoreText}>{score}</Text>
                </View>

                {/* Top-Left Absolute Format Badge */}
                {format ? (
                    <View style={[styles.formatBadge, { backgroundColor: formatColor }]}>
                        <Text style={styles.formatText}>{format}</Text>
                    </View>
                ) : null}

                {/* Bottom Title Vignette overlaid inherently rendering white for max contrast */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                    style={styles.gradient}
                >
                    <Text style={styles.title} numberOfLines={2}>
                        {title}
                    </Text>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        padding: 4, // Tight inner grid padding
        maxWidth: '33.33%', // Strictly lock to 3 columns visually
    },
    card: {
        borderRadius: 8,
        overflow: 'hidden',
        width: '100%',
        aspectRatio: 2 / 3, // Flawless vertical 2:3 movie poster proportion natively
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    poster: {
        width: '100%',
        height: '100%',
    },
    scoreBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        zIndex: 10,
    },
    scoreText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    formatBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        zIndex: 10,
    },
    formatText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        justifyContent: 'flex-end',
        padding: 8,
    },
    title: {
        color: '#ffffff', // Force absolute high-contrast white on black shadow
        fontSize: 12,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 3,
    },
});

export default GridItemCard;
