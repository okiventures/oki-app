import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * The fallback is its own component so it can read the theme — a class
 * component cannot call hooks. It is safe to use context here: the boundary is
 * mounted inside ThemeProvider, so a screen throwing does not take the palette
 * with it.
 */
function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    // An explicit background matters: this replaces the whole navigator, so
    // without one it renders over whatever the last screen left behind.
    <View
      className="flex-1 items-center justify-center p-6"
      style={{ backgroundColor: colors.ui.background }}>
      <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
      <Text
        className="mt-3 text-center text-base font-bold"
        style={{ color: colors.ui.text }}
        accessibilityRole="header">
        Something went wrong
      </Text>
      <Text
        className="mt-2 max-w-[300px] text-center text-[13px] leading-5"
        style={{ color: colors.ui.textMuted }}>
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        style={({ pressed }) => ({
          backgroundColor: colors.primary['600'],
          opacity: pressed ? 0.8 : 1,
        })}
        className="mt-5 rounded-xl px-6 py-3">
        <Text className="text-[15px] font-semibold text-white">Try Again</Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.props.fallbackMessage ?? 'An unexpected error occurred. Please try again.'}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
