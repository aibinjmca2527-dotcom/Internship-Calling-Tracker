'use client';

import React, { useState } from 'react';
import { Company } from '@/types';
import { RotateCcw, X } from 'lucide-react';

interface ResetStatusModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (companyId: string) => Promise<{ success: boolean; message?: string }>;
}

export function ResetStatusModal({
  company,
  isOpen,
  onClose,
  onConfirm,
}: ResetStatusModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !company) return null;

  const handleReset = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await onConfirm(company.id);
      if (!res.success) {
        setErrorMessage(res.message || 'Failed to reset status.');
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resetting status.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full border-t sm:border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-200">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Reset to Not Contacted?</h3>
              <p className="text-xs text-slate-500">Correct outreach mistakes or false updates</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-900 text-sm leading-snug">{company.company_name}</p>
            <p className="text-slate-500">
              Previously marked by{' '}
              <strong className="text-slate-900">{company.called_by_name || 'Teammate'}</strong>
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            Are you sure you want to revert this company&apos;s status to <strong>Not Contacted</strong>? This correction will be permanently logged in the contact history and synchronized across all connected team devices.
          </p>

          {errorMessage && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Confirm Reset</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
