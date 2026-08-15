import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BookingsProvider } from '../src/context/BookingsContext';
import { AdminProvider } from '../src/context/AdminContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { scheme, colors } = useTheme();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Not logged in — allow landing page and dashboards (useProtectedRoute handles redirects)
      return;
    }

    // Logged in, route based on user type
    if (inAuthGroup) {
      const userType = session.user.userType;
      if (userType === 'admin') {
        router.replace('/(admin)/');
      } else if (userType === 'handyman') {
        router.replace('/(handyman)/');
      } else {
        router.replace('/(client)/');
      }
    }
  }, [session, isLoading, segments, router]);

  // Show loading screen while checking for stored session
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary['600']} />
      </View>
    );
  }

  // Wraps the navigator rather than the providers: a render throw in any screen
  // used to white-screen the app with no way back, and keeping the boundary
  // inside the provider tree means Try Again re-renders against live context
  // instead of remounting auth and refetching everything.
  return (
    <View className={`flex-1 theme-${scheme}`}>
      <ErrorBoundary fallbackMessage="This screen ran into a problem. Try again, or go back and reopen it.">
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </View>
  );
}

function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    NunitoBold: Nunito_700Bold,
    NunitoExtraBold: Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AdminProvider>
            <BookingsProvider>
              <RootNavigator />
            </BookingsProvider>
          </AdminProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;
