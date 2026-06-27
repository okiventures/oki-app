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

const SERVICE_OPTIONS = [
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Cleaning',
    'Painting',
    'HVAC',
    'Roofing',
    'Landscaping',
    'Appliance Repair',
    'General Handyman',
];

export default function HandymanSignupScreen() {
    const router = useRouter();
    const { signup, isSigningUp, error, clearError } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [yearsExperience, setYearsExperience] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [showError, setShowError] = useState(false);

    const phoneDigits = phone.replace(/\D/g, '');
    const nameIsValid = fullName.trim().length >= 2;
    const emailIsValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneIsValid = phoneDigits.length === 0 || phoneDigits.length >= 10;
    const passwordIsValid = password.trim().length >= 8;
    const bioIsValid = bio.trim().length === 0 || bio.trim().length >= 10;
    const hasService = selectedServices.length > 0;
    const canSubmit = nameIsValid && emailIsValid && phoneIsValid && passwordIsValid && hasService && !isSigningUp;

    const toggleService = (svc: string) => {
        setSelectedServices((prev) =>
            prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
        );
    };

    const handleSignup = async () => {
        try {
            clearError();
            const result = await signup({
                email: email.trim() || undefined,
                phone: phoneDigits || undefined,
                password: password.trim(),
                userType: 'handyman',
                fullName: fullName.trim(),
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
                        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                            <Ionicons name="construct-outline" size={26} color="#3B82F6" />
                        </View>
                        <Text className="font-heading text-2xl text-gray-900">Join as Handyman</Text>
                        <Text className="mt-2 text-center text-[13px] text-gray-500">
                            Create your account to offer your services and earn.
                        </Text>
                    </View>

                    <Form gap={3}>
                        <Input
                            label="Full name"
                            placeholder="Juan Dela Cruz"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                            editable={!isSigningUp}
                            error={fullName.length > 0 && !nameIsValid ? 'Use at least 2 characters' : undefined}
                            leftIcon={<Ionicons name="person-outline" size={18} color="#9CA3AF" />}
                        />
                        <Input
                            label="Email"
                            placeholder="you@email.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isSigningUp}
                            leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
                        />
                        <Input
                            label="Phone (optional)"
                            placeholder="09xx xxx xxxx"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            editable={!isSigningUp}
                            leftIcon={<Ionicons name="call-outline" size={18} color="#9CA3AF" />}
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

                        {/* Services selection */}
                        <View>
                            <Text className="mb-2 text-[13px] font-semibold text-gray-700">
                                Services you offer *
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {SERVICE_OPTIONS.map((svc) => {
                                    const selected = selectedServices.includes(svc);
                                    return (
                                        <TouchableOpacity
                                            key={svc}
                                            onPress={() => toggleService(svc)}
                                            disabled={isSigningUp}
                                            className={`rounded-full px-3 py-1.5 ${selected ? 'bg-blue-600' : 'bg-gray-100'
                                                }`}>
                                            <Text
                                                className={`text-[12px] font-medium ${selected ? 'text-white' : 'text-gray-700'
                                                    }`}>
                                                {svc}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {selectedServices.length === 0 && (
                                <Text className="mt-1 text-[11px] text-gray-400">
                                    Select at least one service
                                </Text>
                            )}
                        </View>

                        <Input
                            label="Years of experience"
                            placeholder="e.g. 3"
                            value={yearsExperience}
                            onChangeText={setYearsExperience}
                            keyboardType="number-pad"
                            editable={!isSigningUp}
                            leftIcon={<Ionicons name="briefcase-outline" size={18} color="#9CA3AF" />}
                        />
                        <Input
                            label="Bio (optional)"
                            placeholder="Tell us about yourself..."
                            value={bio}
                            onChangeText={setBio}
                            editable={!isSigningUp}
                            error={
                                bio.length > 0 && !bioIsValid ? 'Bio must be at least 10 characters' : undefined
                            }
                            leftIcon={<Ionicons name="information-circle-outline" size={18} color="#9CA3AF" />}
                        />
                    </Form>

                    <Button
                        label="Create Handyman Account"
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
                                className="font-semibold text-blue-600">
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
