import React from 'react';
import { StyleSheet, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import WatchingScreen from './library/WatchingScreen';
import CompletedScreen from './library/CompletedScreen';
import PlanScreen from './library/PlanScreen';
import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';

const Tab = createMaterialTopTabNavigator();

export default function LibraryScreen() {
    const { library } = useLibrary();
    const { theme } = useTheme();
    const { mode } = useMediaMode();

    const activeLabel = mode === 'anime' ? 'Watching' : 'Reading';
    const planLabel = mode === 'anime' ? 'Plan to Watch' : 'Plan to Read';

    // Calculate counts for badges
    const activeCount = library.filter(i => i.status === activeLabel).length;
    const completedCount = library.filter(i => i.status === 'Completed').length;
    const planCount = library.filter(i => i.status === planLabel).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={theme.statusBar || 'default'}
                backgroundColor={theme.background}
            />
            <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    My {mode === 'anime' ? 'Anime' : 'Manga'} Library
                </Text>
            </View>

            <Tab.Navigator
                screenOptions={{
                    tabBarLabelStyle: { fontSize: 13, fontWeight: 'bold', textTransform: 'none' },
                    tabBarItemStyle: { width: 'auto' },
                    tabBarStyle: {
                        elevation: 0,
                        shadowOpacity: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        backgroundColor: theme.background
                    },
                    tabBarIndicatorStyle: { backgroundColor: theme.accent, height: 3 },
                    tabBarActiveTintColor: theme.accent,
                    tabBarInactiveTintColor: theme.subText,
                }}
            >
                <Tab.Screen
                    name="Watching"
                    component={WatchingScreen}
                    options={{ title: `${activeLabel} (${activeCount})` }}
                />
                <Tab.Screen
                    name="Completed"
                    component={CompletedScreen}
                    options={{ title: `Completed (${completedCount})` }}
                />
                <Tab.Screen
                    name="Plan"
                    component={PlanScreen}
                    options={{ title: `Plan (${planCount})` }}
                />
            </Tab.Navigator>
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
        textTransform: 'capitalize'
    },
});
