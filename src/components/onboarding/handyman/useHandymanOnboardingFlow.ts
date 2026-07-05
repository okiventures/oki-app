import { useCallback, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '../../../context/AuthContext';
import { ServiceCategory } from '../../../types';
import {
  DOCUMENT_OPTIONS,
  ONBOARDING_STEPS,
  SERVICE_OPTIONS,
  type DocumentId,
  type HandymanOnboardingStep,
  type UploadState,
} from './shared';

export function useHandymanOnboardingFlow() {
  const { session: authSession } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [servicePricing, setServicePricing] = useState<Partial<Record<ServiceCategory, string>>>({
    [ServiceCategory.General]: '550',
  });
  const [uploads, setUploads] = useState<Partial<Record<DocumentId, UploadState>>>({});

  const currentStep: HandymanOnboardingStep = ONBOARDING_STEPS[currentStepIndex];
  const phoneDigits = phone.replace(/\D/g, '');

  const profileValidation = useMemo(
    () => ({
      fullName: fullName.trim().length >= 3,
      phone: phoneDigits.length >= 10,
      city: city.trim().length >= 3,
      yearsExperience:
        yearsExperience.trim().length > 0 &&
        Number.isFinite(Number(yearsExperience)) &&
        Number(yearsExperience) >= 0,
      bio: bio.trim().length <= 200,
    }),
    [bio, city, fullName, phoneDigits.length, yearsExperience]
  );

  const selectedServices = useMemo(
    () => SERVICE_OPTIONS.filter((item) => servicePricing[item.category] !== undefined),
    [servicePricing]
  );

  const hasValidProfile = useMemo(
    () => Object.values(profileValidation).every(Boolean),
    [profileValidation]
  );

  const hasValidServices = useMemo(
    () =>
      selectedServices.length > 0 &&
      selectedServices.every((item) => {
        const amount = Number(servicePricing[item.category]);
        return Number.isFinite(amount) && amount > 0;
      }),
    [selectedServices, servicePricing]
  );

  const completedUploads = useMemo(
    () => DOCUMENT_OPTIONS.filter((item) => uploads[item.id]?.progress === 100),
    [uploads]
  );

  const hasValidDocuments = completedUploads.length === DOCUMENT_OPTIONS.length;

  const canContinue =
    currentStep === 'Profile'
      ? hasValidProfile
      : currentStep === 'Services'
        ? hasValidServices
        : currentStep === 'Documents'
          ? hasValidDocuments
          : true;

  const goToNextStep = () => {
    if (!canContinue) {
      return;
    }

    setCurrentStepIndex((step) => Math.min(step + 1, ONBOARDING_STEPS.length - 1));
  };

  const goToPreviousStep = () => {
    setCurrentStepIndex((step) => Math.max(step - 1, 0));
  };

  const toggleService = (category: ServiceCategory) => {
    setServicePricing((prev) => {
      if (prev[category] !== undefined) {
        const next = { ...prev };
        delete next[category];
        return next;
      }

      return {
        ...prev,
        [category]: '',
      };
    });
  };

  const updateServicePrice = (category: ServiceCategory, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setServicePricing((prev) => ({
      ...prev,
      [category]: sanitized,
    }));
  };

  const startUpload = useCallback(
    async (documentId: DocumentId) => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const docTypeMap: Record<DocumentId, string> = {
        'government-id': 'GOVERNMENT_ID',
        selfie: 'SELFIE',
        'proof-of-address': 'PROOF_OF_ADDRESS',
      };

      setUploads((prev) => ({
        ...prev,
        [documentId]: {
          fileName: asset.name,
          mimeType: asset.mimeType ?? null,
          progress: 0,
          uri: asset.uri,
          loading: true,
        },
      }));

      try {
        if (!authSession?.accessToken) {
          throw new Error('Not authenticated. Please try logging in again.');
        }

        const blob = await fetch(asset.uri).then((r) => r.blob());
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/kyc-upload`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authSession.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_type: docTypeMap[documentId],
            file_name: asset.name,
            file_mime_type: asset.mimeType ?? 'application/octet-stream',
            file_content: base64Content,
          }),
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.message ?? `Upload failed (HTTP ${response.status})`);
        }

        setUploads((prev) => ({
          ...prev,
          [documentId]: {
            ...prev[documentId]!,
            progress: 100,
            loading: false,
            error: undefined,
          },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploads((prev) => ({
          ...prev,
          [documentId]: {
            ...prev[documentId]!,
            progress: 0,
            loading: false,
            error: message,
          },
        }));
      }
    },
    [authSession?.accessToken]
  );

  const submitOnboarding = useCallback(async () => {
    if (!authSession?.accessToken) {
      throw new Error('Not authenticated. Please try logging in again.');
    }

    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/submit-onboarding`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authSession.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone,
        city: city.trim(),
        bio: bio.trim(),
        years_experience: Number(yearsExperience) || 0,
        services: selectedServices.map((item) => ({
          category: item.category,
          rate: Number(servicePricing[item.category]) || 0,
        })),
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message ?? `Submission failed (HTTP ${response.status})`);
    }

    return response.json();
  }, [
    authSession?.accessToken,
    fullName,
    phone,
    city,
    bio,
    yearsExperience,
    selectedServices,
    servicePricing,
  ]);

  return {
    currentStep,
    currentStepIndex,
    fullName,
    phone,
    city,
    yearsExperience,
    bio,
    servicePricing,
    uploads,
    selectedServices,
    profileValidation,
    canContinue,
    setFullName,
    setPhone,
    setCity,
    setYearsExperience,
    setBio,
    toggleService,
    updateServicePrice,
    startUpload,
    submitOnboarding,
    goToNextStep,
    goToPreviousStep,
  };
}
