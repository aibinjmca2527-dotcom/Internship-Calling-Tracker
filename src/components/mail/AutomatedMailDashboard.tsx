'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  Users,
  Search,
  RefreshCw,
  Power,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Inbox,
  Loader2,
  FileCheck2,
} from 'lucide-react';
import { EmailCompany, EmailConfig, ResumeAttachment, SenderAccount } from '@/types/email';

export function AutomatedMailDashboard() {
  const [companies, setCompanies] = useState<EmailCompany[]>([]);
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [resumes, setResumes] = useState<ResumeAttachment[]>([]);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'schedule' | 'template' | 'resumes'>('queue');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SENT' | 'REPLIED' | 'FAILED'>('ALL');
  const [senderFilter, setSenderFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // State
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Form states for template & schedule
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState<{ id: string; label: string; time: string; count: number; enabled: boolean }[]>([]);
  const [todayStr, setTodayStr] = useState<string>('');

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
  }, []);

  const showAlert = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setActionAlert({ type, message });
    setTimeout(() => setActionAlert(null), 7000);
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [compRes, confRes] = await Promise.all([
        fetch('/api/mail/companies'),
        fetch('/api/mail/config'),
      ]);

      const compData = await compRes.json();
      const confData = await confRes.json();

      if (compData.success) {
        // Discard any stale local cache to guarantee 100% cross-device consistency
        try {
          localStorage.removeItem('infopark_email_companies_cache');
        } catch {
          // ignore
        }
        setCompanies(compData.companies || []);
      }
      if (confData.success && confData.config) {
        setConfig(confData.config);
        setResumes(confData.resumes || []);
        setSenders(confData.senders || []);
        setTemplateSubject(confData.config.template.subject);
        setTemplateBody(confData.config.template.body);
        setScheduleSlots(confData.config.schedules || []);
      }
    } catch (err: unknown) {
      console.error('Error loading mail data:', err);
      showAlert('error', 'Failed to connect to email service.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = companies.length;
    const sentOrReplied = companies.filter((c) => c.status === 'SENT' || c.status === 'REPLIED').length;
    const replied = companies.filter((c) => c.status === 'REPLIED').length;
    const failed = companies.filter((c) => c.status === 'FAILED').length;
    const pending = companies.filter((c) => c.status === 'PENDING').length;
    const sentToday = todayStr ? companies.filter((c) => c.sent_at && c.sent_at.startsWith(todayStr)).length : 0;

    const aibinSent = companies.filter((c) => c.sent_by_name?.toLowerCase().includes('aibin')).length;
    const aibinReplied = companies.filter((c) => c.sent_by_name?.toLowerCase().includes('aibin') && c.status === 'REPLIED').length;

    const lakshmiSent = companies.filter((c) => c.sent_by_name?.toLowerCase().includes('lakshmi')).length;
    const lakshmiReplied = companies.filter((c) => c.sent_by_name?.toLowerCase().includes('lakshmi') && c.status === 'REPLIED').length;

    const sebaSent = companies.filter((c) => c.sent_by_name?.toLowerCase().includes('seba')).length;
    const sebaReplied = companies.filter((c) => c.sent_by_name?.toLowerCase().includes('seba') && c.status === 'REPLIED').length;

    return {
      total,
      sent: sentOrReplied,
      replied,
      failed,
      pending,
      sentToday,
      aibinSent,
      aibinReplied,
      lakshmiSent,
      lakshmiReplied,
      sebaSent,
      sebaReplied,
    };
  }, [companies, todayStr]);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SENT' && (c.status === 'SENT' || c.status === 'REPLIED')) ||
        c.status === statusFilter;

      const matchesSender =
        senderFilter === 'ALL' ||
        (c.sent_by_name && c.sent_by_name.toLowerCase().includes(senderFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesSender;
    });
  }, [companies, searchQuery, statusFilter, senderFilter]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage]);

  // Toggle master active state
  const handleToggleActive = async () => {
    if (!config) return;
    const newActive = !config.active;
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/mail/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => (prev ? { ...prev, active: newActive } : null));
        showAlert('success', `Automated Mailer is now ${newActive ? 'ACTIVE (Will send on schedule at 10 AM, 12 PM, 2 PM)' : 'PAUSED'}.`);
      }
    } catch {
      showAlert('error', 'Failed to toggle active state.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Save Schedule Settings
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/mail/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_count: 39,
          schedules: scheduleSlots,
          test_mode: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', 'Daily schedule and 39-mail batch configuration saved successfully!');
      } else {
        showAlert('error', data.error || 'Failed to save schedule');
      }
    } catch {
      showAlert('error', 'Network error saving schedule');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Save Template Settings
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/mail/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: {
            subject: templateSubject,
            body: templateBody,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('success', 'Email template updated successfully!');
      } else {
        showAlert('error', data.error || 'Failed to save template');
      }
    } catch {
      showAlert('error', 'Network error saving template');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Check Replies via IMAP for all active senders
  const handleCheckReplies = async () => {
    setIsCheckingReplies(true);
    showAlert('info', 'Scanning Gmail inboxes for Aibin, Lakshmi, and Seba for replies...');
    try {
      const res = await fetch('/api/mail/check-replies', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        // Immediate optimistic UI update for all newly mapped replies
        if (Array.isArray(data.updatedCompanies) && data.updatedCompanies.length > 0) {
          const replyMap = new Map(data.updatedCompanies.map((u: any) => [u.serial_number, u]));
          setCompanies((prev) => {
            const next = prev.map((c) => {
              const match: any = replyMap.get(c.serial_number);
              if (match) {
                return {
                  ...c,
                  status: 'REPLIED' as const,
                  replied_at: match.replied_at,
                  reply_snippet: match.reply_snippet,
                  sent_by_name: match.receivedBy || c.sent_by_name,
                };
              }
              return c;
            });


            return next;
          });
        }
        showAlert('success', data.message);
      } else {
        showAlert('error', data.error || 'Failed to check replies');
      }
    } catch {
      showAlert('error', 'Error connecting to Gmail IMAP');
    } finally {
      await fetchData();
      setIsCheckingReplies(false);
    }
  };

  // Safe manual batch trigger with confirmation and real-time dashboard refresh
  const handleTriggerBatchNow = async () => {
    if (isSendingBatch) return;

    const remaining = stats.pending;
    if (remaining === 0) {
      showAlert('info', 'All 229 companies have already been contacted!');
      return;
    }

    const batchSize = Math.min(39, remaining);
    const confirmed = window.confirm(
      `Trigger ${batchSize === remaining ? `final batch of ${batchSize}` : `batch of ${batchSize}`} emails now?\n\n` +
      `• Emails will be distributed evenly across active sender accounts (Aibin, Lakshmi, Seba)\n` +
      `• All 5 student resumes are attached\n\n` +
      `Strict 1-email-per-company duplicate protection is fully active.\n\n` +
      `Click OK to begin sending.`
    );

    if (!confirmed) return;

    setIsSendingBatch(true);
    showAlert('info', `Dispatching ${batchSize} emails across 3 sender accounts... High-speed mode enabled (~15 seconds).`);

    try {
      const res = await fetch('/api/mail/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchSize }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error('Error parsing response JSON:', jsonErr);
      }

      if (data?.success) {
        // Immediate optimistic UI update for all sent companies
        if (Array.isArray(data.results) && data.results.length > 0) {
          const sentMap = new Map<string, any>();
          data.results.forEach((r: any) => {
            if (r.status === 'SENT') {
              sentMap.set(r.email.toLowerCase().trim(), r);
            }
          });

          setCompanies((prev) => {
            const next = prev.map((c) => {
              const match = sentMap.get(c.email.toLowerCase().trim());
              if (match) {
                return {
                  ...c,
                  status: 'SENT' as const,
                  sent_at: new Date().toISOString(),
                  sent_by_name: match.sentByName,
                  sent_by_email: match.sentByEmail || null,
                  last_error: null,
                };
              }
              return c;
            });


            return next;
          });
        }

        showAlert('success', `Batch successfully sent! ${data.sentCount} emails delivered. Dashboard refreshed.`);
      } else {
        showAlert('error', data?.message || data?.error || 'Batch trigger encountered an issue.');
      }
    } catch (err) {
      console.error('Batch trigger error:', err);
      showAlert('error', 'Network issue or timeout triggering batch. Checking latest status...');
    } finally {
      await fetchData();
      setIsSendingBatch(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Alert Notification */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : actionAlert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {actionAlert.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {actionAlert.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            {actionAlert.type === 'info' && <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-xs font-bold px-2 py-1 hover:bg-black/5 rounded-md"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: Status & Master Switch */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Multi-Sender Automated Outreach
            </span>
            <span className="text-xs text-slate-400">• Saintgits MCA Team</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
            Daily Scheduled Mailer & Reply Hub
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Automatically sends personalized internship emails with <strong>all 5 team resumes attached</strong> in 3 daily batches of 39 (13 each from Aibin, Lakshmi, and Seba) with a 6-second anti-spam delay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Manual Trigger Button */}
          <button
            onClick={handleTriggerBatchNow}
            disabled={isSendingBatch || stats.pending === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
            title="Trigger next batch of 39 emails immediately"
          >
            {isSendingBatch ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending {Math.min(39, stats.pending)} Emails (~15s)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {stats.pending === 0
                    ? 'All 229 Sent! 🎉'
                    : stats.pending <= 39
                    ? `Trigger Final Batch Now (${stats.pending} Emails) 🚀`
                    : `Trigger Batch Now (${Math.min(39, stats.pending)} Emails) 🚀`}
                </span>
              </>
            )}
          </button>

          {/* Master Active / Pause Toggle */}
          <button
            onClick={handleToggleActive}
            disabled={isSavingConfig}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ${
              config?.active
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{config?.active ? 'Scheduler ACTIVE 🟢' : 'Scheduler PAUSED ⏸️'}</span>
          </button>
        </div>
      </div>

      {/* 3 Sender Accounts Pool Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sender Team Pool (Multi-Account Rotation)
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Batches rotate across all 3 active accounts (13 emails each per slot) with a 6-second natural delay to protect account health.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Aibin Account */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">Aibin Joseph</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ACTIVE 🟢
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-600 truncate" title="aibinjoseph9605573691@gmail.com">
              aibinjoseph9605573691@gmail.com
            </p>
            <div className="text-[11px] text-slate-600 pt-1 flex justify-between border-t border-emerald-200/60 font-semibold">
              <span>Sent: <strong className="text-blue-700">{stats.aibinSent}</strong></span>
              <span className="text-emerald-700 font-bold">Replies: {stats.aibinReplied} 🔥</span>
            </div>
          </div>

          {/* Lakshmi Account */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">Lakshmi Sabu</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ACTIVE 🟢
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-600 truncate" title="sabulakshmi801@gmail.com">
              sabulakshmi801@gmail.com
            </p>
            <div className="text-[11px] text-slate-600 pt-1 flex justify-between border-t border-emerald-200/60 font-semibold">
              <span>Sent: <strong className="text-blue-700">{stats.lakshmiSent}</strong></span>
              <span className="text-emerald-700 font-bold">Replies: {stats.lakshmiReplied} 🔥</span>
            </div>
          </div>

          {/* Seba Account */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">Seba M Thampy</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ACTIVE 🟢
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-600 truncate" title="sebatiji15@gmail.com">
              sebatiji15@gmail.com
            </p>
            <div className="text-[11px] text-slate-600 pt-1 flex justify-between border-t border-emerald-200/60 font-semibold">
              <span>Sent: <strong className="text-blue-700">{stats.sebaSent}</strong></span>
              <span className="text-emerald-700 font-bold">Replies: {stats.sebaReplied} 🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Companies</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Phase 1 Directory</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sent Total</div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1">{stats.sent}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stats.pending} remaining</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sent Today</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">{stats.sentToday}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">39 per batch</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            <span>Replies</span>
            <Flame className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{stats.replied}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-semibold">Incoming HR responses</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Failed / Bounced</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{stats.failed}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Isolated safely</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">5 Student Resumes</div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 mt-1">Ready</div>
          <div className="text-[10px] text-purple-600 mt-0.5 font-semibold">Updated & Attached</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Email Directory & Queue ({filteredCompanies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Daily Schedule (10 AM, 12 PM, 2 PM)</span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'template'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Edit Template Content</span>
          </button>

          <button
            onClick={() => setActiveTab('resumes')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'resumes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Attached Resumes (5 PDFs)</span>
          </button>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={handleCheckReplies}
            disabled={isCheckingReplies}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg transition-colors"
          >
            {isCheckingReplies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5 text-emerald-600" />}
            <span>Check Replies</span>
          </button>
        </div>
      </div>

      {/* TAB 1: QUEUE & DIRECTORY TABLE */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search company or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Status:</span>
              {(['ALL', 'PENDING', 'SENT', 'REPLIED', 'FAILED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}

              <span className="text-[11px] font-bold text-slate-400 uppercase ml-2 mr-1">Sender:</span>
              {['ALL', 'Aibin', 'Lakshmi', 'Seba'].map((sn) => (
                <button
                  key={sn}
                  onClick={() => {
                    setSenderFilter(sn);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    senderFilter === sn
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sn}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 w-12">#</th>
                  <th className="px-3 py-2.5">Company Name</th>
                  <th className="px-3 py-2.5">Email Address</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Sent By</th>
                  <th className="px-3 py-2.5">Sent At</th>
                  <th className="px-3 py-2.5">Reply Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                      Loading 229 company emails...
                    </td>
                  </tr>
                ) : paginatedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      No companies match your search or filter.
                    </td>
                  </tr>
                ) : (
                  paginatedCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{c.serial_number}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{c.company_name}</span>
                          {c.website && (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600"
                              title="Visit website"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">{c.email}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'REPLIED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                              : c.status === 'SENT'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.status === 'REPLIED' && <Flame className="w-3 h-3 text-emerald-600" />}
                          {c.status === 'SENT' && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px]">
                        {c.sent_by_name ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.sent_by_name.toLowerCase().includes('lakshmi')
                                ? 'bg-purple-100 text-purple-800'
                                : c.sent_by_name.toLowerCase().includes('seba')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {c.sent_by_name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-500">
                        {c.sent_at
                          ? new Date(c.sent_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px]">
                        {c.status === 'REPLIED' ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span>{c.reply_snippet || `Replied: ${c.replied_at ? new Date(c.replied_at).toLocaleDateString() : 'Yes'}`}</span>
                          </span>
                        ) : c.last_error ? (
                          <span className="text-rose-600 truncate block max-w-xs" title={c.last_error}>
                            {c.last_error}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <div>
              Showing {filteredCompanies.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredCompanies.length)} of {filteredCompanies.length} companies
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                Previous
              </button>
              <span className="font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE MANAGER */}
      {activeTab === 'schedule' && (
        <form onSubmit={handleSaveSchedule} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Configure Daily Automated Schedule</h3>
            <p className="text-xs text-slate-500 mt-1">
              Customize the 3 daily sending windows and the batch size (39 emails = 13 from each teammate). Emails are dispatched automatically on schedule with 6-second natural delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scheduleSlots.map((slot, index) => (
              <div key={slot.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{slot.label}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={(e) => {
                        const updated = [...scheduleSlots];
                        updated[index].enabled = e.target.checked;
                        setScheduleSlots(updated);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Time (24h IST):</label>
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => {
                      const updated = [...scheduleSlots];
                      updated[index].time = e.target.value;
                      setScheduleSlots(updated);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Emails in this Batch:</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={slot.count}
                    onChange={(e) => {
                      const updated = [...scheduleSlots];
                      updated[index].count = parseInt(e.target.value, 10) || 39;
                      setScheduleSlots(updated);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Automated Completion Protection:</span>
              <p className="mt-0.5 text-blue-800">
                When all 229 companies have received their emails, the scheduler will automatically and safely turn itself off with zero errors.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              <span>Save Schedule Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: TEMPLATE EDITOR */}
      {activeTab === 'template' && (
        <form onSubmit={handleSaveTemplate} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Email Format & Template Editor</h3>
            <p className="text-xs text-slate-500 mt-1">
              Edit the subject and body text directly. Use {'{{company_name}}'} to dynamically insert the company name.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Subject Line:
              </label>
              <input
                type="text"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Message Body:
                </label>
                <button
                  type="button"
                  onClick={() => setTemplateBody((b) => b + ' {{company_name}}')}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  + Insert {'{{company_name}}'}
                </button>
              </div>
              <textarea
                rows={11}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Sample Preview (with 9Commerce Technologies):</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-2">
              <div className="font-bold border-b pb-1 text-slate-900">
                Subject: {templateSubject.replace(/{{company_name}}/gi, '9Commerce Technologies')}
              </div>
              <div className="whitespace-pre-line text-slate-700 leading-relaxed font-sans text-xs">
                {templateBody.replace(/{{company_name}}/gi, '9Commerce Technologies')}
              </div>
              <div className="pt-2 border-t text-[11px] text-slate-400">
                📎 Attached: 5 Student Resumes (Aibin, Milan, Edwin, Seba, Lakshmi)
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
              <span>Save Template Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: ATTACHED RESUMES */}
      {activeTab === 'resumes' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Attached Student Resumes (5 Updated PDFs)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Every email automatically attaches all 5 updated resumes from your Saintgits MCA team. You can view or download each file below to verify its contents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((res, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Updated Ready
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{res.studentName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono truncate" title={res.displayName}>
                    {res.filename}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Size: {(res.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>

                <a
                  href={res.relativePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>View / Download Resume</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Total Resumes Size: ~160 KB</span>
              <p className="mt-0.5 text-blue-800">
                Lightweight PDF attachments send fast and reach recipients without hitting spam filters.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
