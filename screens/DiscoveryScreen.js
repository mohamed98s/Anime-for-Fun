import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';
import { mediaService } from '../services/mediaService';
import { Ionicons } from '@expo/vector-icons';

// Explicit Genres IDs (MyAnimeList/Jikan)
const EXPLICIT_GENRES = [12, 49]; // 12=Hentai, 49=Erotica

export default function DiscoveryScreen({ navigation }) {
    const { theme } = useTheme();
    const { mode, modeVersion } = useMediaMode();

    const [genres, setGenres] = useState([]);
    const [producers, setProducers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDiscoveryData();
    }, [modeVersion]); // Safely track integer signal instead of string string directly

    const loadDiscoveryData = async () => {
        setLoading(true);
        try {
            const [allGenres, allProducers] = await Promise.all([
                mediaService.getGenres(mode),
                mediaService.getProducers(mode)
            ]);

            // Deduplicate Genres
            const uniqueGenres = Array.from(new Map(allGenres.map(item => [item.mal_id, item])).values());
            const uniqueProducers = Array.from(new Map(allProducers.map(item => [item.mal_id, item])).values());

            setGenres(uniqueGenres);
            setProducers(uniqueProducers);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const navigateToSwipe = (props) => {
        navigation.navigate('Swipe', props);
    };

    // --- Data Processing ---
    // 1. Explicit
    const explicitList = genres.filter(g => EXPLICIT_GENRES.includes(g.mal_id));

    // 2. Demographics (approximate list based on known MAL demographics)
    const DEMOGRAPHIC_NAMES = ['Shounen', 'Shoujo', 'Seinen', 'Josei', 'Kids'];
    const demographicsList = genres.filter(g => DEMOGRAPHIC_NAMES.includes(g.name));

    // 3. Themes (approximate - anything not standard genre, explicit, or demographic)
    const STANDARD_GENRES = ['Action', 'Adventure', 'Avant Garde', 'Award Winning', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Suspense'];
    const themesList = genres.filter(g =>
        !EXPLICIT_GENRES.includes(g.mal_id) &&
        !DEMOGRAPHIC_NAMES.includes(g.name) &&
        !STANDARD_GENRES.includes(g.name)
    );

    // 4. Normal Genres
    const standardList = genres.filter(g => STANDARD_GENRES.includes(g.name));

    // --- Components ---
    const Section = ({ title, children }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
            <View style={styles.chipContainer}>{children}</View>
        </View>
    );

    const Chip = ({ label, onPress, color }) => (
        <TouchableOpacity
            style={[styles.chip, { backgroundColor: theme.card, borderColor: color || theme.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.chipText, { color: theme.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    const RankingButton = ({ title, filter, subtype, icon }) => (
        <TouchableOpacity
            style={[styles.rankingButton, { backgroundColor: theme.card }]}
            onPress={() => navigateToSwipe({ title, options: { endpoint: 'top', filter, subtype } })}
        >
            <Ionicons name={icon} size={24} color={theme.accent} />
            <Text style={[styles.rankingText, { color: theme.text }]}>{title}</Text>
        </TouchableOpacity>
    );

    // Generate Seasons (Current Year - 5)
    const renderSeasons = () => {
        const currentYear = new Date().getFullYear(); // 2026 per current time
        const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
        const seasons = ['Winter', 'Spring', 'Summer', 'Fall'];

        return years.map(year => (
            <View key={year} style={styles.yearRow}>
                <Text style={[styles.yearText, { color: theme.subText }]}>{year}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 10 }}>
                    {seasons.map(season => (
                        <TouchableOpacity
                            key={`${year}-${season}`}
                            style={[styles.seasonChip, { backgroundColor: theme.card }]}
                            onPress={() => navigateToSwipe({
                                title: `${season} ${year}`,
                                options: { endpoint: 'season', year, season: season.toLowerCase() }
                            })}
                        >
                            <Text style={{ color: theme.text }}>{season}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        ));
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.statusBar || 'default'} backgroundColor={theme.background} />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Discover {mode === 'anime' ? 'Anime' : 'Manga'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 0. Surprise Me Recommendation Button */}
                <Section title="Explore & Discover">
                    <TouchableOpacity
                        style={[styles.surpriseBtn, { backgroundColor: theme.card, shadowColor: theme.card, marginBottom: 15 }]}
                        onPress={() => navigation.navigate('SurpriseMe')}
                    >
                        <Ionicons name="sparkles" size={28} color={theme.accent} />
                        <View style={{ marginLeft: 15 }}>
                            <Text style={[styles.surpriseTitle, { color: theme.text }]}>Surprise Me!</Text>
                            <Text style={[styles.surpriseSub, { color: theme.subText }]}>Generate a random recommendation tailored to your taste</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.surpriseBtn, { backgroundColor: theme.card, shadowColor: theme.card }]}
                        onPress={() => navigation.navigate('AdvancedSearch')}
                    >
                        <Ionicons name="options" size={28} color={theme.accent} />
                        <View style={{ marginLeft: 15 }}>
                            <Text style={[styles.surpriseTitle, { color: theme.text }]}>Advanced Search</Text>
                            <Text style={[styles.surpriseSub, { color: theme.subText }]}>Filter by genre, format, and rankings natively</Text>
                        </View>
                    </TouchableOpacity>
                </Section>

                {/* 1. Rankings - CONDITIONAL BASED ON MODE */}
                <Section title="Rankings">
                    <View style={styles.grid}>
                        {mode === 'anime' ? (
                            <>
                                <RankingButton title="Top Airing" filter="airing" icon="flame" />
                                <RankingButton title="Upcoming" filter="upcoming" icon="calendar" />
                                <RankingButton title="Most Popular" filter="bypopularity" icon="heart" />
                                <RankingButton title="Top Movies" subtype="movie" icon="film" />
                            </>
                        ) : (
                            <>
                                <RankingButton title="Publishing" filter="publishing" icon="book" />
                                <RankingButton title="Most Popular" filter="bypopularity" icon="heart" />
                                <RankingButton title="Top Novels" subtype="lightnovel" icon="bookmarks" />
                                <RankingButton title="Top Manhwa" subtype="manhwa" icon="phone-portrait" />
                            </>
                        )}
                    </View>
                </Section>

                {/* 2. Genres */}
                <Section title="Genres">
                    {standardList.map(g => (
                        <Chip
                            key={g.mal_id}
                            label={g.name}
                            onPress={() => navigateToSwipe({ title: g.name, options: { genres: g.mal_id } })}
                        />
                    ))}
                </Section>

                {/* 3. Explicit */}
                {explicitList.length > 0 && (
                    <Section title="Explicit">
                        {explicitList.map(g => (
                            <Chip
                                key={g.mal_id}
                                label={g.name}
                                color="red"
                                onPress={() => navigateToSwipe({ title: g.name, options: { explicit_genres: g.mal_id } })}
                            />
                        ))}
                    </Section>
                )}

                {/* 4. Themes */}
                <Section title="Themes">
                    {themesList.map(g => (
                        <Chip
                            key={g.mal_id}
                            label={g.name}
                            onPress={() => navigateToSwipe({ title: g.name, options: { genres: g.mal_id } })}
                        />
                    ))}
                </Section>

                {/* 5. Demographics */}
                <Section title="Demographics">
                    {demographicsList.map(g => (
                        <Chip
                            key={g.mal_id}
                            label={g.name}
                            onPress={() => navigateToSwipe({ title: g.name, options: { genres: g.mal_id } })}
                        />
                    ))}
                </Section>

                {/* 6. Studios / Magazines */}
                <Section title={mode === 'anime' ? "Top Studios" : "Magazines"}>
                    {producers.map(p => (
                        <Chip
                            key={p.mal_id}
                            label={p.titles ? p.titles[0].title : p.name}
                            onPress={() => navigateToSwipe({
                                title: p.titles ? p.titles[0].title : p.name,
                                options: mode === 'anime' ? { producers: p.mal_id } : { magazines: p.mal_id }
                            })}
                        />
                    ))}
                </Section>

                {/* 7. Seasons (Anime Only) */}
                {mode === 'anime' && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.accent }]}>Seasons Archive</Text>
                        {renderSeasons()}
                    </View>
                )}

                <View style={{ height: 50 }} />
                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 15, alignItems: 'center', borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 15 },
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    chipText: { fontSize: 14, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    rankingButton: {
        width: '48%',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
        elevation: 1,
    },
    rankingText: { marginTop: 5, fontWeight: 'bold' },
    yearRow: { marginBottom: 15 },
    yearText: { fontWeight: 'bold', marginBottom: 5 },
    seasonChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginRight: 10,
    },
    surpriseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    surpriseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    surpriseSub: {
        fontSize: 13,
        opacity: 0.8,
        maxWidth: '85%'
    }
});
