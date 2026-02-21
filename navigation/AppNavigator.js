import React from 'react';
import { Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AnimeListScreen from '../screens/AnimeListScreen';
import DetailsScreen from '../screens/DetailsScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AiringScreen from '../screens/AiringScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import SwipeScreen from '../screens/SwipeScreen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMediaMode } from '../context/MediaModeContext';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SearchStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const AiringStack = createNativeStackNavigator();
const DiscoveryStack = createNativeStackNavigator();

function HomeStackNavigator() {
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    return (
        <HomeStack.Navigator
            key={mode}
            screenOptions={{
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            <HomeStack.Screen
                name="AnimeList"
                component={AnimeListScreen}
                options={{ title: mode === 'anime' ? 'Jikan Anime List' : 'Jikan Manga List' }}
            />
            <HomeStack.Screen
                name="Details"
                component={DetailsScreen}
                options={({ route }) => ({ title: route.params.item.title_english || 'Details' })}
            />
        </HomeStack.Navigator>
    );
}

function SearchStackNavigator() {
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    return (
        <SearchStack.Navigator
            key={mode}
            screenOptions={{
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            <SearchStack.Screen
                name="SearchMain"
                component={SearchScreen}
                options={{ title: 'Search' }}
            />
            <SearchStack.Screen
                name="Details"
                component={DetailsScreen}
                options={({ route }) => ({ title: route.params.item.title_english || 'Details' })}
            />
        </SearchStack.Navigator>
    )
}

function LibraryStackNavigator() {
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    return (
        <LibraryStack.Navigator
            key={mode}
            screenOptions={{
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            <LibraryStack.Screen
                name="LibraryMain"
                component={LibraryScreen}
                options={{ headerShown: false }}
            />
            <LibraryStack.Screen
                name="Details"
                component={DetailsScreen}
                options={({ route }) => ({ title: route.params.item.title_english || 'Details' })}
            />
        </LibraryStack.Navigator>
    )
}

function AiringStackNavigator() {
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    return (
        <AiringStack.Navigator
            key={mode}
            screenOptions={{
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            <AiringStack.Screen
                name="AiringMain"
                component={AiringScreen}
                options={{ headerShown: false }}
            />
            <AiringStack.Screen
                name="Details"
                component={DetailsScreen}
                options={({ route }) => ({ title: route.params.item.title_english || 'Details' })}
            />
        </AiringStack.Navigator>
    )
}

function DiscoveryStackNavigator() {
    const { theme } = useTheme();
    const { mode } = useMediaMode();
    return (
        <DiscoveryStack.Navigator
            key={mode}
            screenOptions={{
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            <DiscoveryStack.Screen
                name="DiscoveryMain"
                component={DiscoveryScreen}
                options={{ headerShown: false }}
            />
            <DiscoveryStack.Screen
                name="Swipe"
                component={SwipeScreen}
                options={{ headerShown: false }}
            />
        </DiscoveryStack.Navigator>
    )
}

export default function AppNavigator() {
    const { theme } = useTheme();
    const { mode, flipAnim } = useMediaMode();

    const rotateY = flipAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-90deg', '0deg', '90deg']
    });

    return (
        <Animated.View style={{ flex: 1, transform: [{ rotateY }, { perspective: 1000 }] }}>
            <Tab.Navigator
                key={mode}
                screenOptions={({ route }) => ({
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName;
                        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                        else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
                        else if (route.name === 'Library') iconName = focused ? 'library' : 'library-outline';
                        else if (route.name === 'Airing') iconName = focused ? 'calendar' : 'calendar-outline';
                        else if (route.name === 'Dashboard') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                        else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
                        else if (route.name === 'Discover') iconName = focused ? 'compass' : 'compass-outline';
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                    tabBarActiveTintColor: theme.accent,
                    tabBarInactiveTintColor: theme.subText,
                    tabBarStyle: {
                        backgroundColor: theme.background,
                        borderTopColor: theme.border,
                    },
                    headerShown: false,
                })}
            >
                <Tab.Screen
                    name="Home"
                    component={HomeStackNavigator}
                    options={{ title: mode === 'anime' ? 'Anime' : 'Manga' }}
                />
                <Tab.Screen name="Search" component={SearchStackNavigator} />
                {/* Position Discover prominently */}
                <Tab.Screen
                    name="Discover"
                    component={DiscoveryStackNavigator}
                    options={{ unmountOnBlur: true }}
                    listeners={({ navigation }) => ({
                        tabPress: (e) => {
                            // Navigate to the root of the Discover stack seamlessly
                            navigation.navigate('Discover', {
                                screen: 'DiscoveryMain'
                            });
                        },
                    })}
                />
                {mode === 'anime' && (
                    <Tab.Screen name="Airing" component={AiringStackNavigator} />
                )}
                <Tab.Screen name="Library" component={LibraryStackNavigator} />
                <Tab.Screen name="Dashboard" component={DashboardScreen} />
                <Tab.Screen name="Settings" component={SettingsScreen} />
            </Tab.Navigator>
        </Animated.View>
    );
}
