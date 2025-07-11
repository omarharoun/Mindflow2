import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { authManager } from '@/lib/auth';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Initialize auth manager once at the root level
        await authManager.init();
        setIsAuthInitialized(true);
        // Hide splash screen after initialization
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setIsAuthInitialized(true); // Still allow app to load
        await SplashScreen.hideAsync();
      }
    }

    initializeAuth();
  }, []);

  // Show loading screen while auth is initializing
  if (!isAuthInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
