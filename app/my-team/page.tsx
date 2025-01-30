'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/loading-screen';

const DynamicSupervisorDashboard = dynamic(
  () => import('@/components/supervisor-dashboard'),
  { ssr: false }
);

export default function MyTeamPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div>
        <DynamicSupervisorDashboard />
      </div>
    </Suspense>
  );
} 