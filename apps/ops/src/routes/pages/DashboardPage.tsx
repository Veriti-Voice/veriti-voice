import { Phone, Calendar } from 'lucide-react';
import { useDashboardData } from '@/features/dashboard/use-dashboard-data';
import {
  StatusBar,
  MetricCard,
  AlertBanner,
  RecentCallsList,
  SavingsCard,
  ActionQueueCard,
  QuickStats,
} from '@/features/dashboard/DashboardComponents';

export function DashboardPage() {
  const data = useDashboardData();

  return (
    <div className="space-y-6">
      <StatusBar
        isLive={data.isLive}
        clinicName={data.profile?.clinic_name ?? ''}
        onRefresh={data.refresh}
        isLoading={data.isLoading}
      />

      <AlertBanner actionItems={data.actionItems} />

      {/* Primary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Calls handled"
          value={data.callsHandled}
          icon={<Phone className="h-4 w-4 text-deep-eucalypt" />}
          isLoading={data.isLoading}
          sub={data.callsHandled === 0 ? 'Make a test call in the Lab' : undefined}
        />
        <MetricCard
          label="Bookings made"
          value={data.bookingsMade}
          icon={<Calendar className="h-4 w-4 text-deep-eucalypt" />}
          isLoading={data.isLoading}
        />
        <MetricCard
          label="Est. savings"
          value={`$${data.savingsEstimate}`}
          icon={null}
          isLoading={data.isLoading}
          sub="Receptionist time saved"
          accent
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent calls — wide */}
        <div className="lg:col-span-2 space-y-4">
          <RecentCallsList calls={data.recentCalls} isLoading={data.isLoading} />
          <QuickStats
            escalations={data.escalations}
            faqsAnswered={data.faqsAnswered}
            isLoading={data.isLoading}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <SavingsCard
            savingsEstimate={data.savingsEstimate}
            callsHandled={data.callsHandled}
            isLoading={data.isLoading}
          />
          <ActionQueueCard items={data.actionItems} isLoading={data.isLoading} />
        </div>
      </div>
    </div>
  );
}
