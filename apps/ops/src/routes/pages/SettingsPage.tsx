import { useState } from 'react';
import {
  ClinicProfileTab,
  VoiceAgentTab,
  IntegrationsTab,
  AdvancedTab,
} from '@/features/settings/SettingsFeature';

type SettingsTab = 'profile' | 'voice' | 'integrations' | 'advanced';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Clinic profile' },
  { id: 'voice', label: 'Voice agent' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'advanced', label: 'Advanced' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const Content = {
    profile: ClinicProfileTab,
    voice: VoiceAgentTab,
    integrations: IntegrationsTab,
    advanced: AdvancedTab,
  }[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ironwood">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI receptionist and integrations
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-copper-clay text-copper-clay'
                : 'border-transparent text-muted-foreground hover:text-ironwood'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-2">
        <Content />
      </div>
    </div>
  );
}
