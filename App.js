import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { LibraryProvider } from './context/LibraryContext';
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure the Global TanStack Query Client for Jikan 429 Exponential Backoff
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential Backoff: 1s, 2s, 4s...
      staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <MediaModeProvider>
        <ThemeProvider>
          <LibraryProvider>
            <AppContent />
          </LibraryProvider>
        </ThemeProvider>
      </MediaModeProvider>
    </QueryClientProvider>
  );
}
