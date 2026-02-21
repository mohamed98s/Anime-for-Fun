import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { LibraryProvider } from './context/LibraryContext';
import { ThemeProvider } from './context/ThemeContext';

import { MediaModeProvider } from './context/MediaModeContext';

export default function App() {
  return (
    <MediaModeProvider>
      <ThemeProvider>
        <LibraryProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </LibraryProvider>
      </ThemeProvider>
    </MediaModeProvider>
  );
}
