import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';
import { useLibrary } from '../context/LibraryContext';
import { fetchGenres, fetchProducers, fetchMediaBatch } from '../services/api';
import AnimeCard from '../components/AnimeCard';
import { Ionicons } from '@expo/vector-icons';

// Explicit Genres IDs (MyAnimeList/Jikan)
const EXPLICIT_GENRES = [12, 49]; // 12=Hentai, 49=Erotica

export default function DiscoveryScreen({ navigation }) {
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    const { library } = useLibrary();

    const [genres, setGenres] = useState([]);
    const [producers, setProducers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Random Recommendation State
    const [recommendation, setRecommendation] = useState(null);
    const [recsLoading, setRecsLoading] = useState(false);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [selectedGenres, setSelectedGenres] = useState({});
    const [genreLogic, setGenreLogic] = useState('OR'); // 'AND' or 'OR'

    useEffect(() => {
        loadDiscoveryData();
    }, [mode]);

    const loadDiscoveryData = async () => {
        setLoading(true);
        try {
            const [allGenres, allProducers] = await Promise.all([
                fetchGenres(mode),
                fetchProducers(mode)
            ]);

            // Deduplicate Genres
            const uniqueGenres = Array.from(new Map(allGenres.map(item => [item.mal_id, item])).values());
            const uniqueProducers = Array.from(new Map(allProducers.map(item => [item.mal_id, item])).values());

            setGenres(uniqueGenres);
            setProducers(uniqueProducers);

            // Initialize all genres as selected for the initial random pick
            const initialSelected = {};
            uniqueGenres.forEach(g => { initialSelected[g.mal_id] = true });
            setSelectedGenres(initialSelected);

            await fetchRecommendation(uniqueGenres, initialSelected, 'OR');

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendation = async (genresToUse = genres, selectedMap = selectedGenres, logicToUse = genreLogic) => {
        setRecsLoading(true);
        try {
            const activeGenres = genresToUse.filter(g => selectedMap[g.mal_id]);

            if (activeGenres.length === 0) {
                setRecommendation(null);
                return;
            }

            let responseList = [];
            const isAllSelected = activeGenres.length === genresToUse.length;

            // Random page 1 to 5 to avoid always picking from the same top 100 items
            const randomPage = Math.floor(Math.random() * 5) + 1;

            if (logicToUse === 'OR') {
                let options = { limit: 100 };
                if (!isAllSelected) {
                    // Pick ONE random genre from the selected pool to simulate OR perfectly within API constraints
                    const randomGenre = activeGenres[Math.floor(Math.random() * activeGenres.length)];
                    options.genres = randomGenre.mal_id.toString();
                }
                const res = await fetchMediaBatch(mode, randomPage, options);
                responseList = res.data;
            } else {
                // AND logic requires exact matching
                const combinedIds = activeGenres.map(g => g.mal_id).join(',');
                const res = await fetchMediaBatch(mode, 1, { limit: 100, genres: combinedIds });
                responseList = res.data;
            }

            // Exclude items currently existing in the active library
            const filteredList = responseList.filter(item => !library.some(libItem => libItem.mal_id === item.mal_id));

            if (filteredList.length > 0) {
                const randomItem = filteredList[Math.floor(Math.random() * filteredList.length)];
                setRecommendation(randomItem);
            } else {
                setRecommendation(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRecsLoading(false);
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

                {/* 0. Surprise Me Recommendation */}
                <Section title="Surprise Me!">
                    <View style={styles.recContainer}>
                        {recsLoading ? (
                            <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 40 }} />
                        ) : recommendation ? (
                            <View style={styles.singleCardWrapper}>
                                <AnimeCard
                                    item={recommendation}
                                    mode={mode}
                                    onPress={() => navigation.navigate('Details', { item: recommendation, mode })}
                                />
                            </View>
                        ) : (
                            <Text style={[{ color: theme.subText, textAlign: 'center', marginVertical: 20 }]}>
                                No recommendations found for these filters.
                            </Text>
                        )}

                        <View style={styles.recActions}>
                            <TouchableOpacity style={[styles.recButton, { backgroundColor: theme.card }]} onPress={() => setIsFilterModalVisible(true)}>
                                <Ionicons name="filter" size={20} color={theme.accent} />
                                <Text style={[styles.recButtonText, { color: theme.text }]}>Filters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.recButton, { backgroundColor: theme.card }]} onPress={() => fetchRecommendation()}>
                                <Ionicons name="shuffle" size={20} color={theme.accent} />
                                <Text style={[styles.recButtonText, { color: theme.text }]}>Shuffle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
            </ScrollView>

            {/* Filter Modal */}
            <Modal visible={isFilterModalVisible} animationType="slide" transparent={true}>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Recommendation Filters</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.logicContainer}>
                            <TouchableOpacity
                                style={[styles.logicBtn, genreLogic === 'AND' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                                onPress={() => setGenreLogic('AND')}
                            >
                                <Text style={{ color: genreLogic === 'AND' ? '#fff' : theme.text, fontWeight: 'bold' }}>Require ALL (AND)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.logicBtn, genreLogic === 'OR' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                                onPress={() => setGenreLogic('OR')}
                            >
                                <Text style={{ color: genreLogic === 'OR' ? '#fff' : theme.text, fontWeight: 'bold' }}>Require ANY (OR)</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSub, { color: theme.subText }]}>Toggle acceptable genres for Random picks:</Text>

                        <ScrollView contentContainerStyle={styles.modalGenres}>
                            {genres.map(g => (
                                <TouchableOpacity
                                    key={g.mal_id}
                                    style={[styles.modalChip, { backgroundColor: selectedGenres[g.mal_id] ? theme.accent : theme.card }]}
                                    onPress={() => setSelectedGenres(prev => ({ ...prev, [g.mal_id]: !prev[g.mal_id] }))}
                                >
                                    <Text style={{ color: selectedGenres[g.mal_id] ? '#fff' : theme.subText, fontSize: 13, fontWeight: '500' }}>{g.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.applyBtn, { backgroundColor: theme.accent }]}
                            onPress={() => {
                                setIsFilterModalVisible(false);
                                fetchRecommendation();
                            }}
                        >
                            <Text style={styles.applyBtnText}>Apply & Shuffle</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    recContainer: {
        paddingVertical: 5,
        alignItems: 'center'
    },
    singleCardWrapper: {
        width: '50%',
        aspectRatio: 0.65,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    recActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        width: '100%',
        marginTop: 5
    },
    recButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    recButtonText: {
        fontWeight: '600',
        fontSize: 15
    },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
    modalContent: {
        flex: 1, borderRadius: 20, padding: 24, marginVertical: 40,
        elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold' },
    modalSub: { marginBottom: 15, fontSize: 14 },
    logicContainer: { flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'center' },
    logicBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#555' },
    modalGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 20 },
    modalChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    applyBtn: { padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 15 },
    applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});
