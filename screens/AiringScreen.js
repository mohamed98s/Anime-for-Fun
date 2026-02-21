import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { fetchSeasonalAnime } from '../services/api';
import DayScreen from './airing/DayScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function AiringScreen({ navigation }) {
    const { theme } = useTheme();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSeasonalAnime();
    }, []);

    const loadSeasonalAnime = async () => {
        try {
            const result = await fetchSeasonalAnime();
            setData(result);
        } catch (err) {
            setError('Failed to load seasonal anime.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.subText }]}>Loading Schedule...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.notification }}>{error}</Text>
            </View>
        );
    }

    // Jikan uses "Mondays", "Tuesdays", etc.
    // We render a configured DayScreen for each.
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={theme.statusBar || 'default'}
                backgroundColor={theme.background}
            />
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Weekly Schedule</Text>
            </View>

            <Tab.Navigator
                screenOptions={{
                    tabBarScrollEnabled: true,
                    tabBarItemStyle: { width: 90 },
                    tabBarStyle: {
                        backgroundColor: theme.background,
                        borderBottomColor: theme.border,
                        borderBottomWidth: 1,
                        elevation: 0,
                        shadowOpacity: 0
                    },
                    tabBarLabelStyle: {
                        fontSize: 12,
                        fontWeight: 'bold',
                        textTransform: 'none'
                    },
                    tabBarActiveTintColor: theme.accent,
                    tabBarInactiveTintColor: theme.subText,
                    tabBarIndicatorStyle: { backgroundColor: theme.accent, height: 3 },
                }}
            >
                <Tab.Screen name="Mon">
                    {() => <DayScreen day="Mondays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="Tue">
                    {() => <DayScreen day="Tuesdays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="Wed">
                    {() => <DayScreen day="Wednesdays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="Thu">
                    {() => <DayScreen day="Thursdays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="Fri">
                    {() => <DayScreen day="Fridays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="Sat">
                    {() => <DayScreen day="Saturdays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="Sun">
                    {() => <DayScreen day="Sundays" data={data} navigation={navigation} />}
                </Tab.Screen>
                <Tab.Screen name="TBA">
                    {() => <DayScreen day="Unknown" data={data} navigation={navigation} />}
                </Tab.Screen>
            </Tab.Navigator>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
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
});
