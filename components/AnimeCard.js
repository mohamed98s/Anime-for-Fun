import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AnimeCard = ({ item, onPress, mode = 'anime', currentStatus, onUpdateLibrary }) => {
    const { theme } = useTheme();

    const [modalVisible, setModalVisible] = useState(false);
    const [progressInput, setProgressInput] = useState('');
    const [showProgressInput, setShowProgressInput] = useState(false);

    const totalItems = mode === 'anime' ? item.episodes : item.chapters;
    const isNotAired = item.status === 'Not yet aired'; // Applies mostly to anime
    const isAiring = item.status === 'Currently Airing' || item.status === 'Publishing';

    // Dynamic Labels
    const activeLabel = mode === 'anime' ? 'Watching' : 'Reading';
    const planLabel = mode === 'anime' ? 'Plan to Watch' : 'Plan to Read';
    const unitLabel = mode === 'anime' ? 'Episode' : 'Chapter';

    const handleAddPress = () => {
        setModalVisible(true);
        setShowProgressInput(false);
        setProgressInput('');
    };

    const handleStatusSelect = (status) => {
        if (status === activeLabel) {
            if (mode === 'anime' && isNotAired && !totalItems) {
                Alert.alert('Cannot Add', 'This anime has not aired yet.');
                return;
            }
            setShowProgressInput(true);
            setProgressInput('1');
        } else {
            if (onUpdateLibrary) onUpdateLibrary(item, status);
            setModalVisible(false);
        }
    };

    const validateProgress = (val) => {
        const num = parseInt(val, 10);
        if (isNaN(num)) return 0;
        if (num < 0) return 0;
        if (totalItems && num > totalItems) return totalItems;
        // Loose cap for ongoing series
        if (isAiring && !totalItems && num > 5000) return 5000;
        return num;
    };

    const handleIncrement = () => {
        const current = parseInt(progressInput, 10) || 0;
        setProgressInput(validateProgress(current + 1).toString());
    };

    const handleDecrement = () => {
        const current = parseInt(progressInput, 10) || 0;
        setProgressInput(validateProgress(current - 1).toString());
    };

    const handleActiveSubmit = () => {
        const prog = validateProgress(progressInput);
        if (onUpdateLibrary) onUpdateLibrary(item, activeLabel, prog);
        setModalVisible(false);
    };

    return (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={onPress}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: item.images?.jpg?.image_url || 'https://placehold.co/150x225/png' }}
                    style={styles.poster}
                    resizeMode="cover"
                />

                {currentStatus && (
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                            {currentStatus === planLabel ? 'Plan' : currentStatus}
                        </Text>
                    </View>
                )}

                <View style={styles.cardContent}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                        {item.title_english || item.title}
                    </Text>
                    <Text style={[styles.synopsis, { color: theme.subText }]} numberOfLines={3}>
                        {item.synopsis ? item.synopsis.replace(/\n/g, ' ') : 'No synopsis available.'}
                    </Text>

                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.accent }]}
                        onPress={handleAddPress}
                    >
                        <Text style={[styles.addButtonText, { color: '#fff' }]}>
                            {currentStatus ? 'Update Status' : '+ Add to Library'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Add to Library</Text>

                                {!showProgressInput ? (
                                    <>
                                        <TouchableOpacity style={[styles.modalOption, { backgroundColor: theme.background }]} onPress={() => handleStatusSelect(activeLabel)}>
                                            <Text style={[styles.optionText, { color: theme.text }]}>{activeLabel}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.modalOption, { backgroundColor: theme.background }]} onPress={() => handleStatusSelect('Completed')}>
                                            <Text style={[styles.optionText, { color: theme.text }]}>Completed</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.modalOption, { backgroundColor: theme.background }]} onPress={() => handleStatusSelect(planLabel)}>
                                            <Text style={[styles.optionText, { color: theme.text }]}>{planLabel}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.progressContainer}>
                                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                                            {unitLabel} Progress: {totalItems ? `/ ${totalItems}` : ''}
                                        </Text>

                                        <View style={styles.counterRow}>
                                            <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={handleDecrement}>
                                                <Ionicons name="remove" size={24} color={theme.accent} />
                                            </TouchableOpacity>

                                            <TextInput
                                                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                                                keyboardType="numeric"
                                                value={progressInput}
                                                onChangeText={(txt) => setProgressInput(txt)}
                                                onEndEditing={() => setProgressInput(validateProgress(progressInput).toString())}
                                                placeholderTextColor={theme.subText}
                                            />

                                            <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={handleIncrement}>
                                                <Ionicons name="add" size={24} color={theme.accent} />
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleActiveSubmit}>
                                            <Text style={styles.saveButtonText}>Save Progress</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                    <Text style={[styles.cancelText, { color: theme.subText }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        padding: 5,
        maxWidth: '50%',
    },
    card: {
        borderRadius: 10,
        overflow: 'hidden',
        flex: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        backgroundColor: '#ddd',
    },
    statusBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardContent: {
        padding: 10,
        flex: 1,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    synopsis: {
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 10,
    },
    addButton: {
        paddingVertical: 6,
        borderRadius: 5,
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalOption: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    optionText: {
        fontWeight: '600',
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    inputLabel: {
        marginBottom: 15,
        fontSize: 16,
        fontWeight: '600',
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 15,
    },
    counterBtn: {
        padding: 10,
        borderRadius: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        width: 60,
        padding: 10,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
    saveButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 10,
        padding: 10,
    },
    cancelText: {
    },
});

export default AnimeCard;
