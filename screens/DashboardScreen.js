import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';
import StatCard from '../components/StatCard';
import { PieChart, BarChart } from 'react-native-chart-kit';

export default function DashboardScreen() {
    const { library } = useLibrary();
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    const { width: screenWidth } = useWindowDimensions();

    const stats = useMemo(() => {
        const activeLabel = mode === 'anime' ? 'Watching' : 'Reading';
        const planLabel = mode === 'anime' ? 'Plan to Watch' : 'Plan to Read';
        const progressField = mode === 'anime' ? 'currentEpisode' : 'currentChapter';
        const totalField = mode === 'anime' ? 'episodes' : 'chapters';

        const completed = library.filter(i => i.status === 'Completed');
        const active = library.filter(i => i.status === activeLabel);
        const planned = library.filter(i => i.status === planLabel);

        const totalItems = completed.length;

        const completedProg = completed.reduce((sum, item) => sum + (item[totalField] || 0), 0);
        const activeProg = active.reduce((sum, item) => sum + (item[progressField] || 0), 0);
        const totalProgress = completedProg + activeProg;

        let hours = null;
        if (mode === 'anime') {
            hours = ((totalProgress * 24) / 60).toFixed(1);
        }

        // Genre Distribution
        const genreMap = {};
        library.forEach(item => {
            if (item.genres) {
                item.genres.forEach(g => {
                    genreMap[g.name] = (genreMap[g.name] || 0) + 1;
                });
            }
        });

        // Sort and take top 5
        const sortedGenres = Object.entries(genreMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const chartData = [
            {
                name: activeLabel,
                population: active.length,
                color: theme.accent,
                legendFontColor: theme.text,
                legendFontSize: 12
            },
            {
                name: 'Completed',
                population: completed.length,
                color: theme.progressBar || '#4caf50',
                legendFontColor: theme.text,
                legendFontSize: 12
            },
            {
                name: 'Planned',
                population: planned.length,
                color: theme.subText,
                legendFontColor: theme.text,
                legendFontSize: 12
            }
        ].filter(d => d.population > 0);

        return {
            totalItems,
            totalProgress,
            hours,
            chartData,
            topGenres: {
                labels: sortedGenres.map(([name]) => name),
                datasets: [{ data: sortedGenres.map(([, count]) => count) }]
            },
            activeLabel
        };
    }, [library, mode, theme]);

    const chartConfig = {
        backgroundGradientFrom: theme.card,
        backgroundGradientTo: theme.card,
        color: (opacity = 1) => theme.accent, // Using theme accent directly makes it string, likely hex. 
        // chart-kit expects rgba for color usually, but hex works for simple things. 
        // For BarChart bars, we might need a specific color function.
        labelColor: (opacity = 1) => theme.text,
        barPercentage: 0.7,
        decimalPlaces: 0,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.statusBar || 'default'} backgroundColor={theme.background} />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {mode === 'anime' ? 'Anime' : 'Manga'} Dashboard
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>Overview</Text>

                {/* Stats Grid */}
                <View style={styles.grid}>
                    <StatCard
                        title={`Completed`}
                        value={stats.totalItems}
                        icon="checkmark-circle"
                        index={0}
                        theme={theme}
                    />
                    <StatCard
                        title={`Total ${mode === 'anime' ? 'Episodes' : 'Chapters'}`}
                        value={stats.totalProgress}
                        icon={mode === 'anime' ? "play-circle" : "book"}
                        index={1}
                        theme={theme}
                    />
                    {mode === 'anime' && (
                        <StatCard
                            title="Hours Watched"
                            value={stats.hours}
                            icon="time"
                            index={2}
                            theme={theme}
                        />
                    )}
                </View>

                {/* Status Distribution Pie Chart */}
                {stats.chartData.length > 0 && (
                    <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
                        <Text style={[styles.chartTitle, { color: theme.text }]}>Library Status</Text>
                        <PieChart
                            data={stats.chartData}
                            width={screenWidth - 60}
                            height={200}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute
                        />
                    </View>
                )}

                {/* Genre Distribution Bar Chart */}
                {stats.topGenres.labels.length > 0 && (
                    <View style={[styles.chartContainer, { backgroundColor: theme.card, marginTop: 20 }]}>
                        <Text style={[styles.chartTitle, { color: theme.text }]}>Top Genres</Text>
                        <BarChart
                            data={stats.topGenres}
                            width={screenWidth - 60}
                            height={220}
                            yAxisLabel=""
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => theme.accent, // Use accent color for bars
                                labelColor: (opacity = 1) => theme.subText,
                            }}
                            verticalLabelRotation={30}
                            fromZero
                            showValuesOnTopOfBars
                        />
                    </View>
                )}

                {/* Visual Insight Text - Keeping it simple at bottom */}
                {stats.totalProgress > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: theme.card, marginTop: 20 }]}>
                        <Text style={[styles.insightText, { color: theme.subText }]}>
                            {mode === 'anime'
                                ? `You've spent approx ${stats.hours} hours watching anime.`
                                : `You've read ${stats.totalProgress} chapters.`
                            }
                        </Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 15, alignItems: 'center', borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', textTransform: 'capitalize' },
    content: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    chartContainer: {
        borderRadius: 16,
        padding: 10,
        alignItems: 'center',
        elevation: 2,
        overflow: 'hidden'
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 5
    },
    insightCard: { padding: 20, borderRadius: 12, elevation: 1 },
    insightText: { fontSize: 16, textAlign: 'center', fontStyle: 'italic' }
});
