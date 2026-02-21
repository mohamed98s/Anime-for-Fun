import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { LibraryProvider } from './context/LibraryContext';
import { ThemeProvider } from './context/ThemeContext';

import { MediaModeProvider, useMediaMode } from './context/MediaModeContext';

function AppContent() {
  const { mode } = useMediaMode();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef.isReady()) {
      // Force the entire navigation tree to reset to the Discover tab root
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Discover' }],
      });
    }
  }, [mode, navigationRef]);

  return (
    <NavigationContainer ref={navigationRef}>
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
