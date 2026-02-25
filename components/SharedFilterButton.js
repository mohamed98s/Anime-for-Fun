import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SharedFilterButton({ onPress, style }) {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.actionBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
                style // Apply external custom padding/margins overriding base styles if requested
            ]}
            onPress={onPress}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Enhanced UX touch target area mapping explicitly
        >
            <Ionicons name="filter" size={20} color={theme.accent} />
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Filters</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1, // Mimicking SurpriseMe border frame style globally
    },
    actionBtnText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
});
