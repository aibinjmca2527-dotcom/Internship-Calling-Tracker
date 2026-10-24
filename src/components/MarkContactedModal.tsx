'use client';

import React, { useState, useEffect } from 'react';
import { Company, ContactStatus, TEAM_MEMBERS } from '@/types';
import { X, CheckCircle2, Phone, AlertCircle, User, PhoneOff, PhoneCall } from 'lucide-react';

interface MarkContactedModalProps {
  company: Company | null;
  isOpen: boolean;
  currentUserName: string;
  onClose: () => void;
  onConfirm: (companyId: string, callerName: string, status: ContactStatus) => Promise<{ success: boolean; message?: string }>;
}

export function MarkContactedModal({
  company,
  isOpen,
  currentUserName,
  onClose,
  onConfirm,
}: MarkContactedModalProps) {
  const [selectedCaller, setSelectedCaller] = useState<string>(currentUserName);
  const [callOutcome, setCallOutcome] = useState<'CONTACTED' | 'NO_ANSWER'>('CONTACTED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCaller(currentUserName);
      // If company was already marked as NO_ANSWER, default to CONTACTED so they can easily update to answered
      setCallOutcome('CONTACTED');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentUserName]);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaller) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await onConfirm(company.id, selectedCaller, callOutcome);
      if (!result.success) {
        setErrorMessage(result.message || 'Failed to update company call record.');
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full border-t sm:border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              callOutcome === 'CONTACTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {callOutcome === 'CONTACTED' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <PhoneOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Record Call Result</h2>
              <p className="text-xs text-slate-500">Log outreach status and teammate attribution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Target Company Box */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                #{company.serial_number}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Infopark Kochi {company.phase || 'Phase 1'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 leading-snug">{company.company_name}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium">{company.phone_number}</span>
            </div>
          </div>

          {/* Conflict / Error Message */}
          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 leading-relaxed font-semibold">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Call Result Selection (Did they answer or not?) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Call Result
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCallOutcome('CONTACTED')}
                disabled={isSubmitting}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  callOutcome === 'CONTACTED'
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    callOutcome === 'CONTACTED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  {callOutcome === 'CONTACTED' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Call Answered</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Spoke with company</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCallOutcome('NO_ANSWER')}
                disabled={isSubmitting}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  callOutcome === 'NO_ANSWER'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    callOutcome === 'NO_ANSWER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <PhoneOff className="w-4 h-4" />
                  </div>
                  {callOutcome === 'NO_ANSWER' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Did Not Pick Up</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No answer / busy</p>
                </div>
              </button>
            </div>
          </div>

          {/* Who contacted this company? */}
          <div className="space-y-1.5">
            <label htmlFor="caller-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Who made this call?
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="caller-select"
                value={selectedCaller}
                onChange={(e) => setSelectedCaller(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-3 sm:py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member} {member === currentUserName ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500">
              Your Google identity must match the selected caller.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCaller}
              className={`w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px] ${
                callOutcome === 'CONTACTED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                  : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : callOutcome === 'CONTACTED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Contacted</span>
                </>
              ) : (
                <>
                  <PhoneOff className="w-4 h-4" />
                  <span>Save as Did Not Pick Up</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
