import { useState, useCallback } from 'react';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type OnboardingFormData = {
  clinicName: string;
  timezone: string;
  fallbackNumber: string;
  clinikoConnected: boolean;
  activePractitioners: string[];
  hoursEnabled: Record<string, boolean>;
  faqs: { id: string; question: string; answer: string; enabled: boolean }[];
  carrier: string;
  callForwardingSet: boolean;
  testCallDone: boolean;
  goLiveConfirmed: boolean;
};

const TOTAL_STEPS = 8;

const DEFAULT_FAQS = [
  { id: '1', question: 'What are your opening hours?', answer: 'We are open Monday to Friday, 8am to 6pm.', enabled: true },
  { id: '2', question: 'Where are you located?', answer: 'We are located in the clinic building — ask reception for directions.', enabled: true },
  { id: '3', question: 'Do you bulk bill?', answer: 'We offer bulk billing for concession card holders and children under 16.', enabled: true },
  { id: '4', question: 'How do I cancel my appointment?', answer: 'Call us at least 24 hours before your appointment to cancel without a fee.', enabled: true },
  { id: '5', question: 'Can I book online?', answer: 'Yes, you can book online through our website or call us directly.', enabled: true },
  { id: '6', question: 'Do I need a referral?', answer: 'Most of our services do not require a referral, but some specialists may.', enabled: false },
  { id: '7', question: 'How long is a standard appointment?', answer: 'Standard appointments are 30 minutes. Allow extra time for your first visit.', enabled: true },
  { id: '8', question: 'Is parking available?', answer: 'Free parking is available on site — enter from the main driveway.', enabled: false },
  { id: '9', question: 'What happens if I am running late?', answer: 'Please call us as soon as possible. We will do our best to accommodate you.', enabled: true },
  { id: '10', question: 'Do you offer telehealth consultations?', answer: 'Yes, telehealth appointments are available. Ask our team when booking.', enabled: false },
];

const DEFAULT_HOURS: Record<string, boolean> = {
  Monday: true,
  Tuesday: true,
  Wednesday: true,
  Thursday: true,
  Friday: true,
  Saturday: false,
  Sunday: false,
};

const DEFAULT_FORM: OnboardingFormData = {
  clinicName: '',
  timezone: 'Australia/Sydney',
  fallbackNumber: '',
  clinikoConnected: false,
  activePractitioners: [],
  hoursEnabled: DEFAULT_HOURS,
  faqs: DEFAULT_FAQS,
  carrier: '',
  callForwardingSet: false,
  testCallDone: false,
  goLiveConfirmed: false,
};

export type OnboardingState = {
  currentStep: OnboardingStep;
  totalSteps: number;
  formData: OnboardingFormData;
  canGoNext: boolean;
  canGoBack: boolean;
  isLastStep: boolean;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: OnboardingStep) => void;
  updateForm: (patch: Partial<OnboardingFormData>) => void;
};

function canAdvance(step: OnboardingStep, data: OnboardingFormData): boolean {
  if (step === 0) return data.clinicName.trim().length > 0;
  if (step === 1) return true; // Cliniko connection optional for demo
  if (step === 2) return true; // Practitioners — any selection is fine
  if (step === 3) return Object.values(data.hoursEnabled).some(Boolean);
  if (step === 4) return data.faqs.some((f) => f.enabled);
  if (step === 5) return true; // Call forwarding — optional
  if (step === 6) return true; // Test call — optional
  if (step === 7) return data.goLiveConfirmed;
  return true;
}

export function useOnboardingState(): OnboardingState {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM);

  const updateForm = useCallback((patch: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => (s < TOTAL_STEPS - 1 ? ((s + 1) as OnboardingStep) : s));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((s) => (s > 0 ? ((s - 1) as OnboardingStep) : s));
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    formData,
    canGoNext: canAdvance(currentStep, formData),
    canGoBack: currentStep > 0,
    isLastStep: currentStep === TOTAL_STEPS - 1,
    goNext,
    goBack,
    goToStep,
    updateForm,
  };
}
