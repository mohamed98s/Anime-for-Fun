import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const StatCard = ({ title, value, icon, index = 0, subtitle }) => {
    const { theme } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 100, // Stagger effect
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                delay: index * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: theme.card,
                    shadowColor: theme.text,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.header}>
                <Ionicons name={icon} size={24} color={theme.accent} />
                <Text style={[styles.title, { color: theme.subText }]}>{title}</Text>
            </View>

            <Text style={[styles.value, { color: theme.text }]}>{value}</Text>

            {subtitle && (
                <Text style={[styles.subtitle, { color: theme.subText }]}>{subtitle}</Text>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        width: '48%', // Approx half width for grid
        elevation: 2,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 5,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 10,
    },
});

export default StatCard;
