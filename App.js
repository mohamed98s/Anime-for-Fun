import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { LibraryProvider } from './context/LibraryContext';
import { ThemeProvider } from './context/ThemeContext';

import { MediaModeProvider, useMediaMode } from './context/MediaModeContext';

function AppContent() {
  const { mode } = useMediaMode();

  return (
    <NavigationContainer key={mode}>
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <MediaModeProvider>
      <ThemeProvider>
        <LibraryProvider>
          <AppContent />
        </LibraryProvider>
      </ThemeProvider>
    </MediaModeProvider>
  );
}
