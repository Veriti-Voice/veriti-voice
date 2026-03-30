import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useOnboardingState } from './use-onboarding-state';
import type { OnboardingStep } from './use-onboarding-state';
import {
  PracticeBasicsStep,
  ConnectClinikoStep,
  ReviewPractitionersStep,
  SetHoursStep,
  AddFaqsStep,
  CallForwardingStep,
  TestCallStep,
  GoLiveStep,
} from './OnboardingSteps';

const STEPS = [
  { title: 'Practice details', subtitle: 'Clinic name, timezone and fallback number' },
  { title: 'Connect Cliniko', subtitle: 'Link your practice management system' },
  { title: 'Practitioners', subtitle: 'Choose who the AI can book appointments with' },
  { title: 'Opening hours', subtitle: 'Set the days the AI is active' },
  { title: 'FAQs', subtitle: 'Enable answers to common caller questions' },
  { title: 'Call forwarding', subtitle: 'Route your clinic line to Veriti Voice' },
  { title: 'Test call', subtitle: 'Make sure everything works before going live' },
  { title: 'Go live', subtitle: 'Activate your AI receptionist' },
];

function ProgressBar({
  currentStep,
  totalSteps,
  onStepClick,
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick: (i: OnboardingStep) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => i < currentStep && onStepClick(i as OnboardingStep)}
          disabled={i > currentStep}
          className={`h-1.5 rounded-full transition-all ${
            i === currentStep
              ? 'flex-1 bg-copper-clay'
              : i < currentStep
              ? 'flex-1 bg-deep-eucalypt cursor-pointer hover:bg-deep-eucalypt/80'
              : 'w-6 bg-slate-fog cursor-not-allowed'
          }`}
          aria-label={`Step ${i + 1}`}
        />
      ))}
    </div>
  );
}

export function OnboardingWizard() {
  const state = useOnboardingState();
  const { currentStep, totalSteps, formData, updateForm, canGoNext, canGoBack, isLastStep } = state;

  const stepInfo = STEPS[currentStep];

  const StepComponent = [
    PracticeBasicsStep,
    ConnectClinikoStep,
    ReviewPractitionersStep,
    SetHoursStep,
    AddFaqsStep,
    CallForwardingStep,
    TestCallStep,
    GoLiveStep,
  ][currentStep];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-deep-eucalypt uppercase tracking-wider">
          Step {currentStep + 1} of {totalSteps}
        </p>
        <h2 className="text-xl font-semibold text-ironwood mt-1">{stepInfo.title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{stepInfo.subtitle}</p>
      </div>

      {/* Progress */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        onStepClick={(i) => state.goToStep(i)}
      />

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm min-h-[280px]">
        <StepComponent formData={formData} updateForm={updateForm} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={state.goBack}
          disabled={!canGoBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium text-ironwood hover:bg-soft-sand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {!isLastStep ? (
          <button
            type="button"
            onClick={state.goNext}
            disabled={!canGoNext}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-copper-clay text-white text-sm font-medium hover:bg-copper-clay/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={state.goNext}
            disabled={!formData.goLiveConfirmed}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-deep-eucalypt text-white text-sm font-medium hover:bg-deep-eucalypt/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          >
            Finish setup
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Step dots overview */}
      <div className="hidden sm:grid grid-cols-4 gap-2">
        {STEPS.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={() => i <= currentStep && state.goToStep(i as 0)}
            disabled={i > currentStep}
            className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
              i === currentStep
                ? 'border-copper-clay/30 bg-copper-clay/5 text-copper-clay font-medium'
                : i < currentStep
                ? 'border-deep-eucalypt/20 bg-deep-eucalypt/5 text-deep-eucalypt cursor-pointer hover:bg-deep-eucalypt/10'
                : 'border-border bg-white text-muted-foreground cursor-not-allowed'
            }`}
          >
            <span className="block font-medium">{i + 1}. {step.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
