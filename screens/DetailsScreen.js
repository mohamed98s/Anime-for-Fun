import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function DetailsScreen({ route }) {
    const { item } = route.params;
    const { theme } = useTheme();
    const { height } = useWindowDimensions();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView>
                <Image
                    source={{ uri: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url }}
                    style={[styles.image, { height: height * 0.45 }]}
                    resizeMode="cover"
                />

                <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
                    <Text style={[styles.title, { color: theme.text }]}>
                        {item.title_english || item.title}
                    </Text>

                    <View style={styles.metaContainer}>
                        <Text style={[styles.score, { color: theme.accent }]}>Score: {item.score || 'N/A'}</Text>
                        <Text style={[styles.metaText, { color: theme.subText }]}>
                            {item.type} • {item.episodes ? `${item.episodes} eps` : (item.chapters ? `${item.chapters} chaps` : '?')}
                        </Text>
                        <Text style={[styles.metaText, { color: theme.subText }]}>{item.status}</Text>
                    </View>

                    <Text style={[styles.sectionHeader, { color: theme.text }]}>Synopsis</Text>
                    <Text style={[styles.synopsis, { color: theme.subText }]}>
                        {item.synopsis || 'No synopsis available.'}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
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
