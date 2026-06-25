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
          <Text className="mt-3 text-center text-base font-bold text-gray-900">
            Something went wrong
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-gray-500">
            {this.props.fallbackMessage ?? 'An unexpected error occurred. Please try again.'}
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2">
            <Text className="text-[15px] font-semibold text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
