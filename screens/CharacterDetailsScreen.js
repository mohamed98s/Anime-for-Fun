import React from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';
import { useTheme } from '../context/ThemeContext';

const decodeHTMLEntities = (text) => {
    if (!text) return '';
    return text
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&');
};

export default function CharacterDetailsScreen({ route, navigation }) {
    const { id } = route.params;
    const { theme } = useTheme();

    const { data: characterData, isLoading, error } = useQuery({
        queryKey: ['characterById', id],
        queryFn: () => mediaService.getCharacterById(id),
        staleTime: 1000 * 60 * 30, // 30 min cache natively
    });

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    if (error || !characterData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.notification, fontSize: 16 }}>Failed to load character details.</Text>
            </SafeAreaView>
        );
    }

    const imageUrl = characterData.images?.jpg?.image_url || 'https://cdn.myanimelist.net/images/questionmark_50.gif';
    const parsedAbout = characterData.about
        ? decodeHTMLEntities(characterData.about).split('\n').filter(line => line.trim().length > 0)
        : ['No biography available.'];

    // Filter Voices for Japanese/English natively, eliminating nulls
    const filteredVoices = (characterData.voices || []).filter(v => {
        const lang = v.language?.toLowerCase();
        return lang === 'japanese' || lang === 'english';
    });

    const renderVoiceActor = ({ item }) => {
        const vaUrl = item.person?.images?.jpg?.image_url || 'https://cdn.myanimelist.net/images/questionmark_50.gif';
        return (
            <View style={styles.vaCard}>
                <Image
                    source={{ uri: vaUrl }}
                    style={styles.vaImage}
                    contentFit="cover"
                    transition={200}
                />
                <Text style={[styles.vaName, { color: theme.text }]} numberOfLines={2}>
                    {item.person?.name}
                </Text>
                <Text style={[styles.vaLanguage, { color: theme.subText }]}>
                    {item.language}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingTop: 20 }}
            >
                {/* Passport Header Block */}
                <View style={[styles.passportContainer, { backgroundColor: theme.background }]}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.portraitImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                    />

                    <View style={styles.infoContainer}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
                            {characterData.name}
                        </Text>

                        {characterData.name_kanji && (
                            <Text style={[styles.kanjiSubtitle, { color: theme.subText }]}>{characterData.name_kanji}</Text>
                        )}

                        {characterData.nicknames && characterData.nicknames.length > 0 && (
                            <Text style={[styles.nicknames, { color: theme.subText }]}>
                                "{characterData.nicknames.join('", "')}"
                            </Text>
                        )}
                    </View>
                </View>

                {/* Biography Block */}
                <View style={[styles.island, { backgroundColor: theme.background }]}>
                    <Text style={[styles.sectionHeader, { color: theme.text }]}>Biography</Text>
                    {parsedAbout.map((paragraph, index) => (
                        <Text key={index} style={[styles.synopsis, { color: theme.subText }]}>
                            {paragraph}
                        </Text>
                    ))}
                </View>

                {/* Voice Actors Block */}
                {filteredVoices.length > 0 && (
                    <View style={[styles.island, { backgroundColor: theme.background }]}>
                        <Text style={[styles.sectionHeader, { color: theme.text }]}>Voice Actors</Text>
                        <FlatList
                            data={filteredVoices}
                            renderItem={renderVoiceActor}
                            keyExtractor={(item) => `${item.person?.mal_id}-${item.language}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    passportContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    portraitImage: {
        width: 120,
        height: 180,
        borderRadius: 12,
        backgroundColor: '#444',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 5,
    },
    kanjiSubtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    nicknames: {
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 4,
    },
    island: {
        paddingHorizontal: 20,
        paddingBottom: 25,
        marginTop: 10,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    synopsis: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 10, // Creates physical spacing between split paragraphs
    },
    horizontalList: {
        paddingVertical: 10,
        gap: 15,
    },
    vaCard: {
        width: 100,
        marginRight: 15,
        alignItems: 'flex-start',
    },
    vaImage: {
        width: 100,
        height: 140,
        borderRadius: 8,
        backgroundColor: '#444',
        marginBottom: 8,
    },
    vaName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    vaLanguage: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});
