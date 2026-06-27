import React, { useState } from 'react';
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

export default function AdminSignupScreen() {
    const router = useRouter();
    const { signup, isSigningUp, error, clearError } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyCode, setCompanyCode] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [showError, setShowError] = useState(false);

    const nameIsValid = fullName.trim().length >= 2;
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const passwordIsValid = password.trim().length >= 8;
    const codeIsValid = companyCode.trim().length >= 3;
    const companyNameIsValid = companyName.trim().length >= 2;
    const canSubmit = nameIsValid && emailIsValid && passwordIsValid && codeIsValid && companyNameIsValid && !isSigningUp;

    const handleSignup = async () => {
        try {
            clearError();
            const result = await signup({
                email: email.trim(),
                password: password.trim(),
                userType: 'admin',
                fullName: fullName.trim(),
                companyCode: companyCode.trim(),
            });
            if (result.emailConfirmationRequired) {
                router.replace('/(auth)/email-confirm');
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
                contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center gap-2">
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                    <Text className="text-[13px] text-gray-500">Back</Text>
                </TouchableOpacity>

                <Card className="flex flex-col gap-4 px-8 py-10">
                    <View className="items-center">
                        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                            <Ionicons name="shield-outline" size={26} color="#374151" />
                        </View>
                        <Text className="font-heading text-2xl text-gray-900">Register as Admin</Text>
                        <Text className="mt-2 text-center text-[13px] text-gray-500">
                            Create an admin account to manage the platform.
                        </Text>
                    </View>

                    {/* Company Verification Section */}
                    <View
                        className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="shield-checkmark-outline" size={20} color="#D97706" />
                            <View className="flex-1">
                                <Text className="font-semibold text-[13px] text-amber-800">
                                    Company Verification Required
                                </Text>
                                <Text className="mt-1 text-[12px] leading-5 text-amber-700">
                                    You need a valid company/organization code to register as an admin.
                                    Contact your company administrator if you don&apos;t have one.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Form gap={3}>
                        <Input
                            label="Full name"
                            placeholder="Admin Name"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                            editable={!isSigningUp}
                            error={fullName.length > 0 && !nameIsValid ? 'Use at least 2 characters' : undefined}
                            leftIcon={<Ionicons name="person-outline" size={18} color="#9CA3AF" />}
                        />
                        <Input
                            label="Email"
                            placeholder="admin@company.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isSigningUp}
                            error={
                                email.length > 0 && !emailIsValid ? 'Enter a valid email address' : undefined
                            }
                            leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
                        />
                        <Input
                            label="Password"
                            placeholder="At least 8 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            secureToggle
                            editable={!isSigningUp}
                            error={
                                password.length > 0 && !passwordIsValid
                                    ? 'Password must be at least 8 characters'
                                    : undefined
                            }
                            leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
                        />

                        <View className="border-t border-gray-100 pt-2">
                            <Text className="mb-2 text-[13px] font-semibold text-gray-700">
                                Company Details
                            </Text>

                            <Input
                                label="Company / Organization Name"
                                placeholder="Oki Technologies Inc."
                                value={companyName}
                                onChangeText={setCompanyName}
                                autoCapitalize="words"
                                editable={!isSigningUp}
                                error={
                                    companyName.length > 0 && !companyNameIsValid
                                        ? 'Enter a valid company name'
                                        : undefined
                                }
                                leftIcon={<Ionicons name="business-outline" size={18} color="#9CA3AF" />}
                            />
                            <Input
                                label="Company Verification Code"
                                placeholder="e.g. OKI-ADMIN-2026"
                                value={companyCode}
                                onChangeText={setCompanyCode}
                                autoCapitalize="characters"
                                editable={!isSigningUp}
                                error={
                                    companyCode.length > 0 && !codeIsValid
                                        ? 'Code must be at least 3 characters'
                                        : undefined
                                }
                                helperText="Provided by your company administrator"
                                leftIcon={<Ionicons name="key-outline" size={18} color="#9CA3AF" />}
                            />
                        </View>
                    </Form>

                    <Button
                        label="Create Admin Account"
                        onPress={handleSignup}
                        fullWidth
                        loading={isSigningUp}
                        disabled={!canSubmit}
                    />

                    <View className="items-center">
                        <Text className="text-center text-[13px] text-gray-600">
                            Already have an account?{' '}
                            <Text
                                onPress={() => router.replace('/(auth)/login')}
                                className="font-semibold text-gray-700">
                                Sign in
                            </Text>
                        </Text>
                    </View>
                </Card>

                {showError && error && (
                    <Toast
                        toast={{ id: 'error', message: error, type: 'error' }}
                        onDismiss={() => {
                            setShowError(false);
                            clearError();
                        }}
                    />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
