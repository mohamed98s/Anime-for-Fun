import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { themes } from '../theme/themes';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const { theme, themeMode, switchTheme } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={theme.statusBar || 'default'}
                backgroundColor={theme.background}
            />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>Appearance</Text>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Theme</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.subText }]}>
                        Select your preferred app theme
                    </Text>

                    <View style={styles.themeOptions}>
                        {Object.values(themes).map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                style={[
                                    styles.themeButton,
                                    {
                                        borderColor: themeMode === t.id ? theme.accent : theme.border,
                                        backgroundColor: t.background
                                    }
                                ]}
                                onPress={() => switchTheme(t.id)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.previewContainer}>
                                    <View style={[styles.previewCard, { backgroundColor: t.card }]} />
                                    <View style={[styles.previewAccent, { backgroundColor: t.accent }]} />
                                </View>

                                <Text style={[
                                    styles.themeName,
                                    {
                                        color: t.text,
                                        fontWeight: themeMode === t.id ? 'bold' : 'normal'
                                    }
                                ]}>
                                    {t.name}
                                </Text>

                                {themeMode === t.id && (
                                    <View style={[styles.checkBadge, { backgroundColor: theme.accent }]}>
                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.accent, marginTop: 30 }]}>About</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.infoText, { color: theme.text }]}>Anime App v1.0.0</Text>
                    <Text style={[styles.infoText, { color: theme.subText }]}>Powered by Jikan API</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 5,
    },
    card: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    cardSubtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    themeOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    themeButton: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 2,
        padding: 10,
        alignItems: 'center',
        height: 100,
        justifyContent: 'center',
    },
    previewContainer: {
        width: '100%',
        height: 40,
        marginBottom: 10,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    previewCard: {
        position: 'absolute',
        top: 5,
        left: 5,
        right: 5,
        bottom: 0,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    previewAccent: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderBottomLeftRadius: 4,
    },
    themeName: {
        fontSize: 12,
    },
    checkBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    infoText: {
        fontSize: 16,
        marginBottom: 5,
    },
});
