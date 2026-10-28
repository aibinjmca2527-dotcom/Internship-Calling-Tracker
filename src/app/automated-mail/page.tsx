'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { AutomatedMailDashboard } from '@/components/mail/AutomatedMailDashboard';
import { TeamMemberName } from '@/types';

export default function AutomatedMailPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ displayName: string; email: string }>({
    displayName: 'Aibin',
    email: 'aibinj.mca2527@saintgits.org',
  });
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser({
            displayName: data.user.displayName || 'Aibin',
            email: data.user.email || 'aibinj.mca2527@saintgits.org',
          });
        } else {
          // If in demo mode
          setIsDemoMode(true);
        }
      } catch {
        setIsDemoMode(true);
      }
    }
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // Ignore
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        currentUser={currentUser}
        connectionStatus="connected"
        isDemoMode={isDemoMode}
        selectedPhase="Phase 1"
        onSelectPhase={() => router.push('/')}
        onSwitchTeammate={(name: TeamMemberName) => {
          setCurrentUser((prev) => ({ ...prev, displayName: name }));
        }}
        onRefreshData={() => {
          setIsRefreshing(true);
          setTimeout(() => setIsRefreshing(false), 800);
        }}
        isRefreshing={isRefreshing}
        onSignOut={handleSignOut}
        activeTab="mail"
      />

      <main className="flex-1 pb-16">
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-slate-500">
              Loading automated mail dashboard...
            </div>
          }
        >
          <AutomatedMailDashboard />
        </React.Suspense>
      </main>
    </div>
  );
}
