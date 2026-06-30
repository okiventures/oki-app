import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../../src/components/ui/Badge';
import { Card } from '../../../src/components/ui/Card';
import { Form } from '../../../src/components/forms/Form';
import { Input } from '../../../src/components/forms/Input';
import { Button } from '../../../src/components/ui/Button';

type Step = 'personal' | 'company' | 'role' | 'review' | 'pending';

const ADMIN_ROLES = [
  { id: 'super_admin', label: 'Super Admin', desc: 'Full platform access and control' },
  { id: 'operations', label: 'Operations', desc: 'Manage bookings, disputes, and users' },
  { id: 'finance', label: 'Finance', desc: 'Payments, transactions, and payouts' },
  { id: 'support', label: 'Support', desc: 'Customer support and dispute resolution' },
];

const STEPS: { key: Step; label: string; number: number }[] = [
  { key: 'personal', label: 'Personal Info', number: 1 },
  { key: 'company', label: 'Company Details', number: 2 },
  { key: 'role', label: 'Role & Access', number: 3 },
  { key: 'review', label: 'Review', number: 4 },
];

export default function AdminOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [agreed, setAgreed] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const currentStepInfo = STEPS.find((s) => s.key === currentStep)!;

  const personalValid = {
    fullName: fullName.trim().length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    phone: phoneDigits.length >= 7,
  };
  const personalOk = Object.values(personalValid).every(Boolean);

  const companyValid = useMemo(
    () => ({
      companyName: companyName.trim().length >= 2,
      companyCode: companyCode.trim().length >= 3,
      address: companyAddress.trim().length >= 5,
    }),
    [companyName, companyCode, companyAddress]
  );
  const companyOk = Object.values(companyValid).every(Boolean);

  const roleOk = selectedRole.length > 0;

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      setCurrentStep(STEPS[nextIdx].key);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    setCurrentStep('pending');
  };

  // ── Pending / Complete ──────────────────────────────────────────────────
  if (currentStep === 'pending') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Ionicons name="checkmark-circle" size={44} color="#059669" />
          </View>
          <Text className="font-heading mb-2 text-center text-2xl text-gray-900">
            Verification Submitted!
          </Text>
          <Text className="mb-8 text-center text-[14px] leading-6 text-gray-500">
            Your admin verification is being reviewed.{'\n'}
            We&apos;ll notify you once it&apos;s approved.
          </Text>

          <View className="mb-8 w-full rounded-xl bg-amber-50 p-4">
            <View className="flex-row items-start gap-3">
              <Ionicons name="time-outline" size={20} color="#D97706" />
              <Text className="flex-1 text-[12px] leading-5 text-amber-800">
                Typical review takes 1-2 business days. You&apos;ll get access to the admin panel
                once approved.
              </Text>
            </View>
          </View>

          <Button label="Go to Dashboard" onPress={() => router.replace('/(admin)')} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  // ── Step Indicator ──────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <View className="mb-6 flex-row items-center gap-2">
      {STEPS.map((s, i) => (
        <View key={s.key} className="flex-1 flex-row items-center">
          <View
            className={`h-7 w-7 items-center justify-center rounded-full ${
              i <= stepIndex ? 'bg-indigo-600' : 'bg-gray-200'
            }`}>
            <Text
              className={`text-[11px] font-bold ${
                i <= stepIndex ? 'text-white' : 'text-gray-500'
              }`}>
              {s.number}
            </Text>
          </View>
          {i < STEPS.length - 1 && (
            <View
              className={`mx-1 h-0.5 flex-1 ${i < stepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`}
            />
          )}
        </View>
      ))}
    </View>
  );

  // ── Step: Personal Info ─────────────────────────────────────────────────
  const renderPersonal = () => (
    <>
      <Badge variant="primary" text={`Step ${currentStepInfo.number} of ${STEPS.length}`} />
      <Text className="font-heading mt-2 text-xl text-gray-900">Personal Information</Text>
      <Text className="mt-1 mb-4 text-[13px] text-gray-500">
        Tell us about yourself to set up your admin profile.
      </Text>

      <Form gap={3}>
        <Input
          label="Full name"
          placeholder="Admin Name"
          value={fullName}
          fillColor="#FFFFFF"
          onChangeText={setFullName}
          error={
            fullName.length > 0 && !personalValid.fullName
              ? 'Use at least 2 characters.'
              : undefined
          }
          helperText={fullName.length === 0 ? 'Minimum 2 characters.' : undefined}
          leftIcon={<Ionicons name="person-outline" size={18} color="#9CA3AF" />}
        />
        <Input
          label="Email address"
          placeholder="admin@company.com"
          value={email}
          fillColor="#FFFFFF"
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={email.length > 0 && !personalValid.email ? 'Enter a valid email.' : undefined}
          leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
        />
        <Input
          label="Mobile number"
          placeholder="09xx xxx xxxx"
          value={phone}
          fillColor="#FFFFFF"
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={phone.length > 0 && !personalValid.phone ? 'Enter at least 7 digits.' : undefined}
          leftIcon={<Ionicons name="call-outline" size={18} color="#9CA3AF" />}
        />
      </Form>

      <View className="mt-6">
        <Button label="Continue" onPress={goNext} fullWidth disabled={!personalOk} />
      </View>
    </>
  );

  // ── Step: Company Details ───────────────────────────────────────────────
  const renderCompany = () => (
    <>
      <Badge variant="primary" text={`Step ${currentStepInfo.number} of ${STEPS.length}`} />
      <Text className="font-heading mt-2 text-xl text-gray-900">Company Details</Text>
      <Text className="mt-1 mb-4 text-[13px] text-gray-500">
        Verify your organization to get admin access.
      </Text>

      <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <View className="flex-row items-start gap-3">
          <Ionicons name="shield-checkmark-outline" size={20} color="#D97706" />
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-amber-800">
              Company Verification Required
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-amber-700">
              A valid company code is required. Contact your company admin if you don&apos;t have
              one.
            </Text>
          </View>
        </View>
      </View>

      <Form gap={3}>
        <Input
          label="Company / Organization Name"
          placeholder="Oki Technologies Inc."
          value={companyName}
          fillColor="#FFFFFF"
          onChangeText={setCompanyName}
          error={
            companyName.length > 0 && !companyValid.companyName
              ? 'Use at least 2 characters.'
              : undefined
          }
          leftIcon={<Ionicons name="business-outline" size={18} color="#9CA3AF" />}
        />
        <Input
          label="Company Verification Code"
          placeholder="e.g. OKI-ADMIN-2026"
          value={companyCode}
          fillColor="#FFFFFF"
          onChangeText={setCompanyCode}
          autoCapitalize="characters"
          error={
            companyCode.length > 0 && !companyValid.companyCode
              ? 'Code must be 3+ characters.'
              : undefined
          }
          helperText="Provided by your company administrator"
          leftIcon={<Ionicons name="key-outline" size={18} color="#9CA3AF" />}
        />
        <Input
          label="Company Address"
          placeholder="123 Business District, City"
          value={companyAddress}
          fillColor="#FFFFFF"
          onChangeText={setCompanyAddress}
          error={
            companyAddress.length > 0 && !companyValid.address
              ? 'Enter a full address (5+ chars).'
              : undefined
          }
          leftIcon={<Ionicons name="location-outline" size={18} color="#9CA3AF" />}
        />
      </Form>

      <View className="mt-6 flex-row gap-3">
        <TouchableOpacity
          onPress={goBack}
          className="flex-1 items-center rounded-xl border border-gray-300 py-3">
          <Text className="font-semibold text-gray-700">Back</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Button label="Continue" onPress={goNext} fullWidth disabled={!companyOk} />
        </View>
      </View>
    </>
  );

  // ── Step: Role & Access ─────────────────────────────────────────────────
  const renderRole = () => (
    <>
      <Badge variant="primary" text={`Step ${currentStepInfo.number} of ${STEPS.length}`} />
      <Text className="font-heading mt-2 text-xl text-gray-900">Role & Access Level</Text>
      <Text className="mt-1 mb-4 text-[13px] text-gray-500">
        Select your admin role and department.
      </Text>

      <View className="mb-4 gap-3">
        {ADMIN_ROLES.map((r) => {
          const active = selectedRole === r.id;
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedRole(r.id)}
              className={`rounded-xl border-2 p-4 ${
                active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
              }`}>
              <View className="flex-row items-center gap-3">
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? 'border-indigo-500' : 'border-gray-300'
                  }`}>
                  {active && <View className="h-3 w-3 rounded-full bg-indigo-500" />}
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-[14px] font-semibold ${active ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {r.label}
                  </Text>
                  <Text className="text-[12px] text-gray-500">{r.desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Form gap={3}>
        <Input
          label="Department (optional)"
          placeholder="e.g. Engineering, Operations"
          value={department}
          fillColor="#FFFFFF"
          onChangeText={setDepartment}
          leftIcon={<Ionicons name="folder-outline" size={18} color="#9CA3AF" />}
        />
      </Form>

      <View className="mt-6 flex-row gap-3">
        <TouchableOpacity
          onPress={goBack}
          className="flex-1 items-center rounded-xl border border-gray-300 py-3">
          <Text className="font-semibold text-gray-700">Back</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Button label="Continue" onPress={goNext} fullWidth disabled={!roleOk} />
        </View>
      </View>
    </>
  );

  // ── Step: Review & Submit ───────────────────────────────────────────────
  const renderReview = () => (
    <>
      <Badge variant="primary" text={`Step ${currentStepInfo.number} of ${STEPS.length}`} />
      <Text className="font-heading mt-2 text-xl text-gray-900">Review & Submit</Text>
      <Text className="mt-1 mb-4 text-[13px] text-gray-500">
        Double-check your information before submitting.
      </Text>

      <Card className="mb-4 p-4">
        <Text className="mb-2 text-[12px] font-semibold tracking-wider text-gray-500 uppercase">
          Personal Info
        </Text>
        <View className="gap-1">
          <ReviewRow icon="person-outline" label="Name" value={fullName} />
          <ReviewRow icon="mail-outline" label="Email" value={email} />
          <ReviewRow icon="call-outline" label="Phone" value={phone} />
        </View>

        <View className="my-3 border-t border-gray-100" />

        <Text className="mb-2 text-[12px] font-semibold tracking-wider text-gray-500 uppercase">
          Company Details
        </Text>
        <View className="gap-1">
          <ReviewRow icon="business-outline" label="Company" value={companyName} />
          <ReviewRow icon="key-outline" label="Code" value={companyCode} />
          <ReviewRow icon="location-outline" label="Address" value={companyAddress} />
        </View>

        <View className="my-3 border-t border-gray-100" />

        <Text className="mb-2 text-[12px] font-semibold tracking-wider text-gray-500 uppercase">
          Role
        </Text>
        <View className="gap-1">
          <ReviewRow
            icon="shield-outline"
            label="Role"
            value={ADMIN_ROLES.find((r) => r.id === selectedRole)?.label || selectedRole}
          />
          {department ? (
            <ReviewRow icon="folder-outline" label="Department" value={department} />
          ) : null}
        </View>
      </Card>

      {/* Agreement */}
      <TouchableOpacity
        onPress={() => setAgreed(!agreed)}
        className="mb-6 flex-row items-start gap-3">
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
            agreed ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
          }`}>
          {agreed && <Ionicons name="checkmark" size={14} color="white" />}
        </View>
        <Text className="flex-1 text-[12px] leading-5 text-gray-600">
          I confirm that all the information provided is accurate and I have the authority to
          represent this organization as an administrator.
        </Text>
      </TouchableOpacity>

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={goBack}
          className="flex-1 items-center rounded-xl border border-gray-300 py-3">
          <Text className="font-semibold text-gray-700">Back</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Button label="Submit Verification" onPress={handleSubmit} fullWidth disabled={!agreed} />
        </View>
      </View>
    </>
  );

  // ── Render Current Step ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled">
          {renderStepIndicator()}
          {currentStep === 'personal' && renderPersonal()}
          {currentStep === 'company' && renderCompany()}
          {currentStep === 'role' && renderRole()}
          {currentStep === 'review' && renderReview()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2 py-1">
      <Ionicons name={icon as any} size={15} color="#9CA3AF" />
      <Text className="text-[12px] text-gray-500">{label}:</Text>
      <Text className="flex-1 text-[13px] font-medium text-gray-900">{value}</Text>
    </View>
  );
}
