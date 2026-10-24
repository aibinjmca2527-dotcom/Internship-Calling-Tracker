'use client';

import React from 'react';
import { Company } from '@/types';
import { PhoneCell } from './PhoneCell';
import { CheckCircle2, Circle, Clock, RotateCcw, User, PhoneCall, PhoneOff, PhoneForwarded } from 'lucide-react';
import { formatContactDate } from '@/lib/phone-utils';

interface CompanyCardProps {
  company: Company;
  onOpenMarkModal: (company: Company) => void;
  onOpenResetModal: (company: Company) => void;
}

export function CompanyCard({
  company,
  onOpenMarkModal,
  onOpenResetModal,
}: CompanyCardProps) {
  const isContacted = company.status === 'CONTACTED';
  const isNoAnswer = company.status === 'NO_ANSWER';

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isContacted
          ? 'bg-emerald-50/40 border-emerald-200/90 shadow-xs'
          : isNoAnswer
          ? 'bg-amber-50/40 border-amber-200/90 shadow-xs'
          : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
      }`}
    >
      {/* Top Header: Sl. No and Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/80">
          #{company.serial_number}
        </span>

        {isContacted ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Contacted</span>
          </span>
        ) : isNoAnswer ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
            <PhoneOff className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>Did Not Pick Up</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Circle className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span>Not Contacted</span>
          </span>
        )}
      </div>

      {/* Company Name */}
      <h3 className="text-base font-bold text-slate-900 leading-snug mb-3 tracking-tight">
        {company.company_name}
      </h3>

      {/* Phone Number Call / Copy Bar (Full Width on Mobile) */}
      <div className="mb-3">
        <PhoneCell phoneNumber={company.phone_number} isFullWidthOnMobile={true} />
      </div>

      {/* Contacted / Outreach Details Banner (if caller name is recorded) */}
      {company.called_by_name && (
        <div className={`mb-3 p-2.5 bg-white/90 rounded-lg text-xs space-y-1.5 border ${
          isNoAnswer ? 'border-amber-200/80' : 'border-emerald-200/80'
        }`}>
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 font-medium">
              {isNoAnswer ? 'Attempted by:' : 'Contacted by:'}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isNoAnswer ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
              }`}>
                {company.called_by_name?.charAt(0) || 'U'}
              </span>
              <span>{company.called_by_name}</span>
            </div>
          </div>
          {company.contacted_at && (
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono pt-0.5 border-t border-slate-100">
              <span>Timestamp:</span>
              <span>{formatContactDate(company.contacted_at)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Button: Accessible touch targets */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        {company.status === 'NOT_CONTACTED' ? (
          <button
            type="button"
            onClick={() => onOpenMarkModal(company)}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Mark Call</span>
          </button>
        ) : isNoAnswer ? (
          <>
            <button
              type="button"
              onClick={() => onOpenMarkModal(company)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <PhoneForwarded className="w-4 h-4" />
              <span>Call Again / Update</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenResetModal(company)}
              className="w-full min-h-[40px] py-2 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 active:bg-amber-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset to Not Contacted</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpenResetModal(company)}
            className="w-full min-h-[42px] py-2 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 active:bg-amber-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset to Not Contacted</span>
          </button>
        )}
      </div>
    </div>
  );
}
