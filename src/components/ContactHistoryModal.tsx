'use client';

import React, { useEffect, useState } from 'react';
import { Company, ContactHistoryItem } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { History, X, Clock, User, CheckCircle2, RotateCcw, PhoneOff } from 'lucide-react';
import { formatContactDate } from '@/lib/phone-utils';

interface ContactHistoryModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactHistoryModal({
  company,
  isOpen,
  onClose,
}: ContactHistoryModalProps) {
  const [historyItems, setHistoryItems] = useState<ContactHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !company) return;

    let isMounted = true;
    setLoading(true);

    async function loadHistory() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('contact_history')
          .select('*')
          .eq('company_id', company!.id)
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          setHistoryItems(data as ContactHistoryItem[]);
        }
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, company]);

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Outreach History</h2>
              <p className="text-xs text-slate-500 font-medium">#{company.serial_number} &bull; {company.company_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading history records...</div>
          ) : historyItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No previous contact history recorded for this company.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {historyItems.map((item) => (
                <div key={item.id} className="relative pl-6">
                  {/* Timeline icon */}
                  <div
                    className={`absolute -left-2.5 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                      item.action === 'MARK_CONTACTED'
                        ? 'bg-emerald-500 text-white'
                        : item.action === 'MARK_NO_ANSWER'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-500 text-white'
                    }`}
                  >
                    {item.action === 'MARK_CONTACTED' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : item.action === 'MARK_NO_ANSWER' ? (
                      <PhoneOff className="w-3 h-3" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {item.action === 'MARK_CONTACTED'
                          ? 'Marked as Contacted'
                          : item.action === 'MARK_NO_ANSWER'
                          ? 'Marked as Did Not Pick Up'
                          : 'Reset to Not Contacted'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatContactDate(item.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>By <strong>{item.changed_by_name}</strong></span>
                    </div>
                    {item.notes && (
                      <p className="text-slate-500 italic pt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
