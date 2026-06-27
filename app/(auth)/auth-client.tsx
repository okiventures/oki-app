import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

type AuthMode = 'login' | 'signup';

export default function ClientAuthScreen() {
    const router = useRouter();
    const { login, signup, isSigningIn, isSigningUp, error, clearError } = useAuth();

    const [mode, setMode] = useState<AuthMode>('login');
    const [fullName, setFullName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);

    const isEmail = identifier.includes('@');
    const phoneDigits = identifier.replace(/\D/g, '');

    const identifierIsValid = useMemo(() => {
        const trimmed = identifier.trim();
        if (trimmed.length === 0) return false;
        if (isEmail) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
        return phoneDigits.length >= 10;
    }, [identifier, phoneDigits.length, isEmail]);

    const passwordIsValid = password.trim().length >= 8;
    const nameIsValid = fullName.trim().length >= 2;
    const canSubmit = mode === 'login'
        ? identifierIsValid && password.trim().length > 0
        : identifierIsValid && passwordIsValid && nameIsValid;

    const isSubmitting = mode === 'login' ? isSigningIn : isSigningUp;

    const handleSubmit = async () => {
        try {
            clearError();
            if (mode === 'login') {
                await login({
                    email: isEmail ? identifier.trim() : undefined,
                    phone: !isEmail ? phoneDigits : undefined,
                    password: password.trim(),
                });
            } else {
                const result = await signup({
                    email: isEmail ? identifier.trim() : undefined,
                    phone: !isEmail ? phoneDigits : undefined,
                    password: password.trim(),
                    userType: 'client',
                    fullName: fullName.trim(),
                });
                if (result.emailConfirmationRequired) {
                    router.replace('/(auth)/email-confirm');
                }
            }
        } catch {
            setShowError(true);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-gray-50"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center gap-2">
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                    <Text className="text-[13px] text-gray-500">Back</Text>
                </TouchableOpacity>

                <Card className="flex flex-col gap-4 px-8 py-12">
                    <View className="items-center">
                        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                            <Ionicons name="person-outline" size={26} color="#6366F1" />
                        </View>
                        <Text className="font-heading text-2xl text-gray-900">
                            {mode === 'login' ? 'Welcome back!' : 'Join as Client'}
                        </Text>
                        <Text className="mt-2 text-center text-[13px] text-gray-500">
                            {mode === 'login'
                                ? 'Sign in to find and book trusted handymen.'
                                : 'Create an account to get started.'}
                        </Text>
                    </View>

                    {/* Mode toggle */}
                    <View className="flex-row rounded-lg bg-gray-100 p-1">
                        <TouchableOpacity
                            onPress={() => { setMode('login'); setShowError(false); clearError(); }}
                            className={`flex-1 items-center rounded-md py-2 ${mode === 'login' ? 'bg-white shadow-sm' : ''}`}>
                            <Text className={`text-[13px] font-semibold ${mode === 'login' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Sign In
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setMode('signup'); setShowError(false); clearError(); }}
                            className={`flex-1 items-center rounded-md py-2 ${mode === 'signup' ? 'bg-white shadow-sm' : ''}`}>
                            <Text className={`text-[13px] font-semibold ${mode === 'signup' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Sign Up
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Form gap={3}>
                        {mode === 'signup' && (
                            <Input
                                label="Full name"
                                placeholder="Juan Dela Cruz"
                                value={fullName}
                                onChangeText={setFullName}
                                autoCapitalize="words"
                                editable={!isSubmitting}
                                error={fullName.length > 0 && !nameIsValid ? 'Use at least 2 characters' : undefined}
                                leftIcon={<Ionicons name="person-outline" size={18} color="#9CA3AF" />}
                            />
                        )}
                        <Input
                            label="Email or phone"
                            placeholder="you@email.com"
                            value={identifier}
                            onChangeText={setIdentifier}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isSubmitting}
                            error={
                                identifier.length > 0 && !identifierIsValid
                                    ? 'Enter a valid email or phone (10+ digits)'
                                    : undefined
                            }
                            leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
                        />
                        <Input
                            label="Password"
                            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            secureToggle
                            editable={!isSubmitting}
                            error={
                                password.length > 0 && mode === 'signup' && !passwordIsValid
                                    ? 'Password must be at least 8 characters'
                                    : undefined
                            }
                            leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
                        />
                    </Form>

                    <Button
                        label={mode === 'login' ? 'Sign In' : 'Create Account'}
                        onPress={handleSubmit}
                        fullWidth
                        loading={isSubmitting}
                        disabled={!canSubmit}
                    />
                </Card>

                {showError && error && (
                    <Toast
                        toast={{ id: 'error', message: error, type: 'error' }}
                        onDismiss={() => { setShowError(false); clearError(); }}
                    />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
