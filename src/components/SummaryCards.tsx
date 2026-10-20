'use client';

import React from 'react';
import { Building2, PhoneCall, PhoneOff, CheckCircle2, Users } from 'lucide-react';
import { Company, TEAM_MEMBERS } from '@/types';

interface SummaryCardsProps {
  companies: Company[];
}

export function SummaryCards({ companies }: SummaryCardsProps) {
  const total = companies.length;
  const contacted = companies.filter((c) => c.status === 'CONTACTED').length;
  const notContacted = total - contacted;
  const percentage = total > 0 ? ((contacted / total) * 100).toFixed(1) : '0.0';

  // Count per teammate
  const teammateCounts = TEAM_MEMBERS.map((member) => {
    const count = companies.filter(
      (c) => c.status === 'CONTACTED' && c.called_by_name?.toLowerCase() === member.toLowerCase()
    ).length;
    return { name: member, count };
  });

  return (
    <div className="space-y-4">
      {/* 4 Primary Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Companies */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Companies</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{total}</p>
          </div>
        </div>

        {/* Card 2: Contacted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contacted</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-emerald-700 leading-tight">
                {contacted}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                ({percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Not Contacted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
            <PhoneOff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Remaining</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-amber-700 leading-tight">
                {notContacted}
              </span>
              <span className="text-xs font-medium text-slate-400">
                to call
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Progress Percentage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Progress</span>
            <span className="text-xs font-bold text-blue-700">{percentage}%</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(percentage)))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {contacted} of {total} companies contacted
          </p>
        </div>
      </div>

      {/* Team Contribution Bar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Outreach Breakdown:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {teammateCounts.map((t) => (
            <div
              key={t.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="font-semibold text-slate-900">{t.name}:</span>
              <span className="text-slate-600 font-bold">{t.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
