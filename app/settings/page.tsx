'use client';

import { VirtualMeetingSettings } from '@/components/settings/virtual-meeting-settings';
import { useAuth } from '@/lib/auth-context';

interface User {
  role?: 'team_member' | 'supervisor' | 'executive';
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isSupervisor = (user as User)?.role === 'supervisor' || (user as User)?.role === 'executive';

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