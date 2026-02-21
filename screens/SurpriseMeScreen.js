import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import AnimeCard from '../components/AnimeCard';
import { Ionicons } from '@expo/vector-icons';
import { useDiscoveryController } from '../controllers/discoveryController';
import { spacing, radius, shadows } from '../styles/theme';

export default function SurpriseMeScreen({ navigation }) {
    const { theme } = useTheme();
    const { getAnimeStatus, addToLibrary } = useLibrary();
    const {
        mode, loading, genres, recommendation, recsLoading,
        selectedGenres, genreLogic, toggleGenre, setLogic, generateRecommendation
    } = useDiscoveryController();

    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);



    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Surprise Me!</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {recsLoading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={[styles.loadingText, { color: theme.subText }]}>Finding the perfect match...</Text>
                    </View>
                ) : recommendation ? (
                    <View style={styles.cardContainer}>
                        <Text style={[styles.foundText, { color: theme.text }]}>How about this?</Text>
                        <View style={styles.singleCardWrapper}>
                            <AnimeCard
                                item={recommendation}
                                mode={mode}
                                currentStatus={getAnimeStatus(recommendation.mal_id)}
                                onUpdateLibrary={addToLibrary}
                                onPress={() => navigation.navigate('Details', { item: recommendation, mode })}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.centerBox}>
                        <Ionicons name="sad-outline" size={60} color={theme.subText} style={{ marginBottom: 15 }} />
                        <Text style={[styles.noRecsText, { color: theme.text }]}>No recommendations found.</Text>
                        <Text style={[styles.noRecsSub, { color: theme.subText }]}>Try loosening your filters or changing the logic to OR.</Text>
                    </View>
                )}
            </View>

            {/* Action Bar inside Content directly below card */}
            <View style={styles.actionRowContainer}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]} onPress={() => setIsFilterModalVisible(true)}>
                    <Ionicons name="filter" size={20} color={theme.accent} />
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accent }]} onPress={() => generateRecommendation()}>
                    <Ionicons name="shuffle" size={20} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Shuffle Again</Text>
                </TouchableOpacity>
            </View>


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
                                onPress={() => setLogic('AND')}
                            >
                                <Text style={{ color: genreLogic === 'AND' ? '#fff' : theme.text, fontWeight: 'bold' }}>Require ALL (AND)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.logicBtn, genreLogic === 'OR' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                                onPress={() => setLogic('OR')}
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
                                    onPress={() => toggleGenre(g.mal_id)}
                                >
                                    <Text style={{ color: selectedGenres[g.mal_id] ? '#fff' : theme.subText, fontSize: 13, fontWeight: '500' }}>{g.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.applyBtn, { backgroundColor: theme.accent }]}
                            onPress={() => {
                                setIsFilterModalVisible(false);
                                generateRecommendation();
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20
    },
    centerBox: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        fontWeight: '500'
    },
    cardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
    },
    singleCardWrapper: {
        width: '90%',
        aspectRatio: 0.70,
        marginBottom: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.xl,
        elevation: shadows.heavy.elevation,
        shadowColor: shadows.heavy.shadowColor,
        shadowOffset: shadows.heavy.shadowOffset,
        shadowOpacity: shadows.heavy.shadowOpacity,
        shadowRadius: shadows.heavy.shadowRadius,
        overflow: 'hidden'
    },
    foundText: {
        fontSize: 18,
        fontWeight: '500',
        marginBottom: spacing.m
    },
    noRecsText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    noRecsSub: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        maxWidth: '80%'
    },
    actionRowContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
        justifyContent: 'space-between',
        gap: spacing.l
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.l,
        borderRadius: radius.m,
        gap: spacing.s,
        elevation: shadows.light.elevation,
        shadowColor: shadows.light.shadowColor,
        shadowOffset: shadows.light.shadowOffset,
        shadowOpacity: shadows.light.shadowOpacity,
        shadowRadius: shadows.light.shadowRadius,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: 'bold'
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
