'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, LogOut, RefreshCw, UserCheck, ChevronDown, Layers, Mail, Phone } from 'lucide-react';
import { TEAM_MEMBERS, TeamMemberName, CallingPhase } from '@/types';

interface HeaderProps {
  currentUser: {
    displayName: string;
    email: string;
  };
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  isDemoMode?: boolean;
  selectedPhase: CallingPhase;
  onSelectPhase: (phase: CallingPhase) => void;
  phase1Count?: number;
  phase2Count?: number;
  onSwitchTeammate?: (name: TeamMemberName) => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  onSignOut: () => void;
  activeTab?: 'calls' | 'mail';
}

export function Header({
  currentUser,
  connectionStatus,
  isDemoMode = false,
  selectedPhase,
  onSelectPhase,
  phase1Count,
  phase2Count,
  onSwitchTeammate,
  onRefreshData,
  isRefreshing,
  onSignOut,
  activeTab = 'calls',
}: HeaderProps) {
  const [isTeammateDropdownOpen, setIsTeammateDropdownOpen] = React.useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Brand & Titles */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight truncate">
                  Infopark Calling Tracker
                </h1>
                {/* Live Realtime Indicator */}
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border flex-shrink-0"
                  title={
                    connectionStatus === 'connected'
                      ? 'Live synchronization connected with Supabase'
                      : connectionStatus === 'reconnecting'
                      ? 'Reconnecting to live channel...'
                      : 'Offline'
                  }
                  style={{
                    backgroundColor:
                      connectionStatus === 'connected'
                        ? '#f0fdf4'
                        : connectionStatus === 'reconnecting'
                        ? '#fffbeb'
                        : '#f8fafc',
                    borderColor:
                      connectionStatus === 'connected'
                        ? '#bbf7d0'
                        : connectionStatus === 'reconnecting'
                        ? '#fde68a'
                        : '#e2e8f0',
                    color:
                      connectionStatus === 'connected'
                        ? '#166534'
                        : connectionStatus === 'reconnecting'
                        ? '#92400e'
                        : '#64748b',
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      connectionStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : connectionStatus === 'reconnecting'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    {connectionStatus === 'connected'
                      ? 'Live'
                      : connectionStatus === 'reconnecting'
                      ? 'Reconnecting'
                      : 'Offline'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate hidden sm:block">
                Team Internship Outreach &bull; Infopark Kochi &bull; <span className="font-semibold text-blue-700">{selectedPhase}</span>
              </p>
            </div>
          </div>

          {/* Center (Desktop / Tablet): Nav Tabs + Phase Selector */}
          <div className="hidden md:flex items-center gap-3">
            {/* Feature Tabs: Calls vs Automated Mail */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <Link
                href="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'calls'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Call Tracker</span>
              </Link>
              <Link
                href="/automated-mail"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'mail'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Mail className={`w-3.5 h-3.5 ${activeTab === 'mail' ? 'text-white' : 'text-indigo-600'}`} />
                <span>Automated Mail</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                    activeTab === 'mail' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  NEW
                </span>
              </Link>
            </div>

            {/* Prominent Phase Selector (when on calling tab) */}
            {activeTab === 'calls' && (
              <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onSelectPhase('Phase 1')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    selectedPhase === 'Phase 1'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Phase 1</span>
                  {phase1Count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPhase === 'Phase 1'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {phase1Count}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPhase('Phase 2')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    selectedPhase === 'Phase 2'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Phase 2</span>
                  {phase2Count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPhase === 'Phase 2'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {phase2Count}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Teammate Profile, Refresh & Sign Out */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Manual Sync Button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
              title="Force sync data from database"
              aria-label="Sync with database"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Teammate Identity Badge & Switcher */}
            <div className="relative">
              {isDemoMode ? (
                <div className="relative">
                  <button
                    onClick={() => setIsTeammateDropdownOpen(!isTeammateDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-800 transition-colors min-h-[40px]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{currentUser.displayName}</span>
                    <ChevronDown className="w-3 h-3 text-blue-500" />
                  </button>

                  {isTeammateDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-40 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                        Active Teammate:
                      </div>
                      {TEAM_MEMBERS.map((member) => (
                        <button
                          key={member}
                          onClick={() => {
                            onSwitchTeammate?.(member);
                            setIsTeammateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between ${
                            member === currentUser.displayName
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{member}</span>
                          {member === currentUser.displayName && (
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 min-h-[40px]">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <span className="max-w-[70px] sm:max-w-none truncate">{currentUser.displayName}</span>
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors min-h-[40px] active:scale-95"
              title="Sign out of calling tracker"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation & Phase Switcher Row */}
      <div className="md:hidden flex flex-col px-3.5 py-1.5 bg-slate-50 border-t border-slate-200/80 gap-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Mobile Tabs */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60 text-xs w-full">
            <Link
              href="/"
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'calls' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Phone className="w-3 h-3 text-blue-600" />
              <span>Calls</span>
            </Link>
            <Link
              href="/automated-mail"
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'mail' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Mail className={`w-3 h-3 ${activeTab === 'mail' ? 'text-white' : 'text-indigo-600'}`} />
              <span>Auto Mail</span>
              <span className={`px-1 rounded-full text-[8px] font-extrabold ${activeTab === 'mail' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                NEW
              </span>
            </Link>
          </div>
        </div>

        {activeTab === 'calls' && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Phase:
            </span>
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60 text-xs">
              <button
                type="button"
                onClick={() => onSelectPhase('Phase 1')}
                className={`px-3 py-0.5 rounded-md text-xs font-bold transition-all ${
                  selectedPhase === 'Phase 1'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phase 1 {phase1Count !== undefined ? `(${phase1Count})` : ''}
              </button>
              <button
                type="button"
                onClick={() => onSelectPhase('Phase 2')}
                className={`px-3 py-0.5 rounded-md text-xs font-bold transition-all ${
                  selectedPhase === 'Phase 2'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phase 2 {phase2Count !== undefined ? `(${phase2Count})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
