import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../services/mediaService';
import { useTheme } from '../context/ThemeContext';

export default function ParentalGuideModal({ title, year }) {
    const { theme } = useTheme();
    const [isModalVisible, setModalVisible] = useState(false);

    // Lazy Execution: Network payload completely restricted until `refetch()` trigger natively
    const { data: guideData, isFetching, refetch } = useQuery({
        queryKey: ['parentalGuide', title, year],
        queryFn: () => mediaService.getParentalGuide(title, year),
        enabled: false,
        staleTime: 1000 * 60 * 60 * 24, // cache tightly saving bandwidth natively
    });

    const handlePress = () => {
        setModalVisible(true);
        refetch(); // Trigger fetch payload securely
    };

    return (
        <View style={styles.container}>
            {/* The Trigger Button */}
            <TouchableOpacity
                style={[styles.triggerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <Text style={[styles.triggerText, { color: theme.text }]}>View Parental Guide</Text>
            </TouchableOpacity>

            {/* The Centered Overlay Modal */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.modalCard, { backgroundColor: theme.background }]}>

                        {isFetching ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.accent} />
                                <Text style={[styles.loadingText, { color: theme.subText }]}>Scanning Database...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.contentScroll}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={true}
                            >
                                {(!guideData || guideData.length === 0) ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={[styles.emptyText, { color: theme.subText }]}>
                                            No parental guide data available for this title.
                                        </Text>
                                    </View>
                                ) : (
                                    guideData.map((item, index) => {
                                        // Nicely format the Enum category: "SEXUAL_CONTENT" -> "Sexual Content"
                                        const formattedCategory = (item.category || 'Advisory')
                                            .replace(/_/g, ' ')
                                            .toLowerCase()
                                            .replace(/\b\w/g, c => c.toUpperCase());

                                        // Natively extract the accurate severityLevel by locating the object with the absolute maximum voteCount
                                        let severityInfo = 'Unrated / None';
                                        if (item.severityBreakdowns && item.severityBreakdowns.length > 0) {
                                            const highestVoted = item.severityBreakdowns.reduce((max, obj) =>
                                                (obj.voteCount > max.voteCount) ? obj : max
                                                , item.severityBreakdowns[0]);

                                            severityInfo = highestVoted.severityLevel.charAt(0).toUpperCase() + highestVoted.severityLevel.slice(1);
                                        }

                                        return (
                                            <View key={index} style={styles.guideRow}>
                                                <Text style={[styles.guideCategory, { color: theme.text }]}>
                                                    {formattedCategory}
                                                </Text>
                                                <Text style={[styles.guideSeverity, { color: theme.subText }]}>
                                                    Severity: {severityInfo}
                                                </Text>

                                                {/* Map the explicit detailed reviews natively */}
                                                {item.reviews && item.reviews.length > 0 && (
                                                    <View style={styles.reviewsContainer}>
                                                        {item.reviews.map((review, rIdx) => (
                                                            <Text key={rIdx} style={[styles.reviewText, { color: theme.subText }]}>
                                                                • {review.text || review}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })
                                )}
                            </ScrollView>
                        )}

                        {/* Sticky Bottom Close Button */}
                        <TouchableOpacity
                            style={[styles.closeButton, { borderTopColor: theme.border }]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={[styles.closeButtonText, { color: theme.accent }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    triggerButton: {
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    triggerText: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '85%',
        maxHeight: '70%',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500',
    },
    contentScroll: {
        maxHeight: '85%',
    },
    scrollContent: {
        padding: 25,
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
    },
    guideRow: {
        marginBottom: 20,
    },
    guideCategory: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    guideSeverity: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: 'bold',
    },
    reviewsContainer: {
        marginTop: 8,
        paddingLeft: 4,
    },
    reviewText: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 6,
        fontStyle: 'italic',
    },
    closeButton: {
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
