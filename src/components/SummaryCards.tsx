'use client';

import React from 'react';
import { Building2, PhoneCall, PhoneOff, CheckCircle2, Users, CircleDot } from 'lucide-react';
import { Company, TEAM_MEMBERS } from '@/types';

interface SummaryCardsProps {
  companies: Company[];
}

export function SummaryCards({ companies }: SummaryCardsProps) {
  const total = companies.length;
  const contacted = companies.filter((c) => c.status === 'CONTACTED').length;
  const noAnswer = companies.filter((c) => c.status === 'NO_ANSWER').length;
  const notContacted = companies.filter((c) => c.status === 'NOT_CONTACTED').length;
  const percentage = total > 0 ? ((contacted / total) * 100).toFixed(1) : '0.0';

  // Count per teammate (Contacted and No Answer)
  const teammateCounts = TEAM_MEMBERS.map((member) => {
    const contactedCount = companies.filter(
      (c) => c.status === 'CONTACTED' && c.called_by_name?.toLowerCase() === member.toLowerCase()
    ).length;
    const noAnswerCount = companies.filter(
      (c) => c.status === 'NO_ANSWER' && c.called_by_name?.toLowerCase() === member.toLowerCase()
    ).length;
    return { name: member, contacted: contactedCount, noAnswer: noAnswerCount };
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
            <CheckCircle2 className="w-5 h-5" />
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

        {/* Card 3: Did Not Pick Up */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
            <PhoneOff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Did Not Pick Up</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-amber-700 leading-tight">
                {noAnswer}
              </span>
              <span className="text-xs font-medium text-slate-400">
                to retry
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Remaining (Not Contacted) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0 border border-slate-200">
            <CircleDot className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Remaining</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
                {notContacted}
              </span>
              <span className="text-xs font-medium text-slate-400">
                to call
              </span>
            </div>
          </div>
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
              <span className="text-emerald-700 font-bold">{t.contacted}</span>
              {t.noAnswer > 0 && (
                <span className="text-amber-700 font-medium">({t.noAnswer} missed)</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
