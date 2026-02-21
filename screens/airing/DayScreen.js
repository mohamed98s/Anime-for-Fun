import React, { useMemo } from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import AnimeCard from '../../components/AnimeCard';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';

export default function DayScreen({ day, data, navigation }) {
    const { theme } = useTheme();
    const { getAnimeStatus, addToLibrary } = useLibrary();

    // Jikan returns days like "Mondays", "Tuesdays". 
    // We match blindly or check for "Mondays" vs "Monday" depending on tab name.
    // Let's assume the parent passes the exact Jikan string or we normalize.
    // Actually, Jikan returns "Mondays" (plural).

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(item => {
            let bDay = item.broadcast?.day;
            if (!bDay && item.broadcast?.string) {
                // Fallback to parsing from string like "Mondays at 00:00 (JST)"
                const parsed = item.broadcast.string.split(' ')[0];
                if (parsed.endsWith('s')) bDay = parsed;
            }
            bDay = bDay || 'Unknown';

            if (day === 'Unknown') return bDay === 'Unknown';
            return bDay === day;
        });
    }, [data, day]);

    if (filteredData.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.emptyText, { color: theme.subText }]}>
                    No anime scheduled for {day}.
                </Text>
            </View>
        )
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={filteredData}
                keyExtractor={(item) => `${item.mal_id}`}
                renderItem={({ item }) => (
                    <AnimeCard
                        item={item}
                        mode="anime"
                        currentStatus={getAnimeStatus(item.mal_id)}
                        onUpdateLibrary={addToLibrary}
                        onPress={() => navigation.navigate('Details', { item })}
                    />
                )}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 10,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontStyle: 'italic',
    },
});
