import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BookingsProvider } from '../src/context/BookingsContext';
import { AdminProvider } from '../src/context/AdminContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { scheme } = useTheme();
  return (
    <View className={`flex-1 theme-${scheme}`}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
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
        <AdminProvider>
          <BookingsProvider>
            <RootStack />
          </BookingsProvider>
        </AdminProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
