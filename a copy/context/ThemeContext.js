import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, LayoutAnimation, UIManager, Platform } from 'react-native';
import { themes } from '../theme/themes';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', 'cyberpunk'
    const [loading, setLoading] = useState(true);

    // Load saved theme or specific preference
    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('@app_theme');
            if (savedTheme && themes[savedTheme]) {
                setThemeMode(savedTheme);
            } else {
                // Default to system preference if no save, or 'light'
                // If system is dark, use dark.
                setThemeMode(systemScheme === 'dark' ? 'dark' : 'light');
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        } finally {
            setLoading(false);
        }
    };

    const switchTheme = async (newMode) => {
        if (!themes[newMode]) return;

        // Animate the transition
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        setThemeMode(newMode);
        try {
            await AsyncStorage.setItem('@app_theme', newMode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    const theme = themes[themeMode] || themes.light;

    return (
        <ThemeContext.Provider value={{ theme, themeMode, switchTheme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};
