import React, { useRef, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LibraryActionsContext } from '../context/LibraryContext';
import { useMediaMode } from '../context/MediaModeContext';
import { Ionicons } from '@expo/vector-icons';

export default function LibraryCard({ item, navigation }) {
    const { theme } = useTheme();
    const { updateProgress } = useContext(LibraryActionsContext);
    const { mode } = useMediaMode();

    // Progress bar animation
    const progressAnim = useRef(new Animated.Value(0)).current;

    const total = mode === 'anime' ? (item.episodes || 0) : (item.chapters || 0);
    const current = mode === 'anime' ? (item.currentEpisode || 0) : (item.currentChapter || 0);
    const progress = total > 0 ? current / total : 0;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 500,
            useNativeDriver: false, // Width doesn't support native driver
        }).start();
    }, [progress]);

    const handleIncrement = () => {
        updateProgress(item.mal_id, 1);
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('Details', { item })}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: item.images?.jpg?.image_url }}
                style={styles.image}
            />
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                    {item.title_english || item.title}
                </Text>

                <Text style={[styles.subtitle, { color: theme.subText }]}>
                    {mode === 'anime'
                        ? `${current} / ${total || '?'} eps`
                        : `${current} / ${total || '?'} chaps`
                    }
                </Text>

                {/* Progress Bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                backgroundColor: theme.progressBar || theme.accent,
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.accent }]}
                        onPress={handleIncrement}
                    >
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        marginBottom: 15,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
    },
    image: {
        width: '25%',
        aspectRatio: 2 / 3,
        maxWidth: 100, // Keep from getting too huge on tablets
    },
    content: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 10,
    },
    progressBarContainer: {
        height: 6,
        borderRadius: 3,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        padding: 8,
        borderRadius: 20,
        marginLeft: 10,
    },
});
