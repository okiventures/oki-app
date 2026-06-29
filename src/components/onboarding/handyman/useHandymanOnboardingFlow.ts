import { useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';

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
      bio: bio.trim().length >= 16,
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

  const startUpload = async (documentId: DocumentId) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];

    setUploads((prev) => ({
      ...prev,
      [documentId]: {
        fileName: asset.name,
        mimeType: asset.mimeType ?? null,
        progress: 20,
        uri: asset.uri,
      },
    }));
  };

  useEffect(() => {
    const pendingUploadIds = (Object.keys(uploads) as DocumentId[]).filter((documentId) => {
      const upload = uploads[documentId];
      return upload !== undefined && upload.progress < 100;
    });

    if (pendingUploadIds.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setUploads((prev) => {
        let changed = false;
        const next = { ...prev };

        pendingUploadIds.forEach((documentId) => {
          const upload = next[documentId];
          if (!upload || upload.progress >= 100) {
            return;
          }

          changed = true;
          next[documentId] = {
            ...upload,
            progress: Math.min(upload.progress + 20, 100),
          };
        });

        return changed ? next : prev;
      });
    }, 140);

    return () => clearInterval(timer);
  }, [uploads]);

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
    goToNextStep,
    goToPreviousStep,
  };
}
