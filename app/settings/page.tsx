import { VirtualMeetingSettings } from '@/components/settings/virtual-meeting-settings';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'executive';

  return (
    <div className="container max-w-5xl py-6 space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      {/* Only show virtual meeting settings to supervisors and executives */}
      {isSupervisor && (
        <div className="bg-white rounded-lg border p-6">
          <VirtualMeetingSettings />
        </div>
      )}
      
      {/* Other settings sections */}
    </div>
  );
} 