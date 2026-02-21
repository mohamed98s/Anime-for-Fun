import React, { useMemo } from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import LibraryCard from '../../components/LibraryCard';
import { useLibrary } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { useMediaMode } from '../../context/MediaModeContext';

export default function CompletedScreen({ navigation }) {
    const { library } = useLibrary();
    const { theme } = useTheme();
    const { mode } = useMediaMode();

    const data = useMemo(() =>
        library.filter(item => item.status === 'Completed'),
        [library]);

    if (data.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.emptyText, { color: theme.subText }]}>
                    No completed {mode === 'anime' ? 'anime' : 'manga'} yet.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={data}
                keyExtractor={(item) => `${item.mal_id}`}
                renderItem={({ item }) => (
                    <LibraryCard
                        item={item}
                        navigation={navigation}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingVertical: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
});
