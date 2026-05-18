import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
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
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
          <Text className="text-base font-bold text-gray-900 mt-3 text-center">Something went wrong</Text>
          <Text className="text-[13px] text-gray-500 mt-2 text-center leading-5">
            {this.props.fallbackMessage ?? 'An unexpected error occurred. Please try again.'}
          </Text>
          <TouchableOpacity onPress={this.handleRetry} className="mt-4 bg-blue-500 px-4 py-2 rounded-lg">
            <Text className="text-white text-[15px] font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
