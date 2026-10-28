'use client';

import React, { useState } from 'react';
import { X, Send, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TestMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail: string;
  defaultSubject: string;
  defaultBody: string;
  onSuccess: () => void;
}

export function TestMailModal({
  isOpen,
  onClose,
  defaultEmail,
  defaultSubject,
  defaultBody,
  onSuccess,
}: TestMailModalProps) {
  const [recipient, setRecipient] = useState(defaultEmail || 'aibinjoseph9605573691@gmail.com');
  const [testCompany, setTestCompany] = useState('Google India / TechCorp');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: recipient,
          companyName: testCompany,
          subject: defaultSubject,
          body: defaultBody,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          message: data.message || `Test email successfully sent to ${recipient}!`,
        });
        onSuccess();
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send test email.',
        });
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Network error sending test email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <h3 className="font-bold text-base">Send Live Test Email</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            This will send an email with <strong>all 5 student resumes attached</strong> to verify that your Gmail SMTP is working and to inspect how the email looks in a real inbox.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Recipient Email (Friend / Your Own):
            </label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. yourfriend@gmail.com"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Test Company Name:
            </label>
            <input
              type="text"
              required
              value={testCompany}
              onChange={(e) => setTestCompany(e.target.value)}
              placeholder="e.g. Infopark Tech Hub"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Replaces {'{{company_name}}'} in your template for testing.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">📎 5 Resumes Included:</div>
            <div className="text-[11px] text-slate-500">
              • Aibin Joseph, Milan Sijo, Edwin Joseph, Seba M Thampy, Lakshmi Sabu
            </div>
          </div>

          {result && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                result.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending with 5 Resumes...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
