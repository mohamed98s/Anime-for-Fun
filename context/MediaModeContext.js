import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutAnimation, Animated, Easing } from 'react-native';

const MediaModeContext = createContext();

export const MediaModeProvider = ({ children }) => {
    const [mode, setMode] = useState('anime'); // 'anime' or 'manga'
    const [isLoaded, setIsLoaded] = useState(false);
    const flipAnim = useRef(new Animated.Value(0)).current; // 0 = 0deg, 1 = 90deg, -1 = -90deg

    useEffect(() => {
        loadMode();
    }, []);

    const loadMode = async () => {
        try {
            const savedMode = await AsyncStorage.getItem('mediaMode');
            if (savedMode) {
                setMode(savedMode);
            }
        } catch (error) {
            console.error('Failed to load media mode', error);
        } finally {
            setIsLoaded(true);
        }
    };

    const toggleMode = async () => {
        const newMode = mode === 'anime' ? 'manga' : 'anime';

        // 1. Flip Out (0 -> 90deg)
        Animated.timing(flipAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.ease,
        }).start(async () => {
            // 2. Change Mode (Content Update)
            setMode(newMode);
            try {
                await AsyncStorage.setItem('mediaMode', newMode);
            } catch (error) { /* ignore */ }

            // 3. Reset to -90deg (Instant)
            flipAnim.setValue(-1);

            // 4. Flip In (-90deg -> 0)
            Animated.timing(flipAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.ease,
            }).start();
        });
    };

    if (!isLoaded) return null; // Prevent UI from rendering with wrong default mode

    return (
        <MediaModeContext.Provider value={{ mode, toggleMode, flipAnim }}>
            {children}
        </MediaModeContext.Provider>
    );
};

export const useMediaMode = () => useContext(MediaModeContext);
