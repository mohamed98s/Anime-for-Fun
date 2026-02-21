import React, { useContext } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { LibraryStateContext } from '../../context/LibraryContext';
import { useTheme } from '../../context/ThemeContext';
import { useMediaMode } from '../../context/MediaModeContext';
import LibraryCard from '../../components/LibraryCard';

export default function WatchingScreen({ navigation }) {
    const { library } = useContext(LibraryStateContext);
    const { theme } = useTheme();
    const { mode } = useMediaMode();

    const activeStatus = mode === 'anime' ? 'Watching' : 'Reading';
    // Filter specifically for the current mode's active status
    const data = library.filter(item => item.status === activeStatus);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {data.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.subText }]}>
                        You are not {mode === 'anime' ? 'watching any anime' : 'reading any manga'} yet.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={item => item.mal_id.toString()}
                    renderItem={({ item }) => (
                        <LibraryCard
                            item={item}
                            navigation={navigation}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingVertical: 15,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    }
});
