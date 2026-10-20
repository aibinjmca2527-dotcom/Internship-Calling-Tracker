'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Company, ContactStatus, TeamMemberName, TEAM_MEMBERS } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { SearchAndFilters, StatusFilter, SortOption, PageSizeOption } from '@/components/SearchAndFilters';
import { CompanyTable } from '@/components/CompanyTable';
import { CompanyCard } from '@/components/CompanyCard';
import { MarkContactedModal } from '@/components/MarkContactedModal';
import { ResetStatusModal } from '@/components/ResetStatusModal';
import { ContactHistoryModal } from '@/components/ContactHistoryModal';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import initialCompaniesData from '@/data/companies.json';

// Local storage key for demo testing across tabs
const LOCAL_STORAGE_COMPANIES_KEY = 'infopark_calling_companies_cache';

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Current logged in user state
  const [currentUser, setCurrentUser] = useState<{ displayName: string; email: string }>({
    displayName: 'Aibin',
    email: 'aibinj.mca2527@saintgits.org',
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [teammateFilter, setTeammateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('SERIAL_ASC');

  // Pagination states
  const [pageSize, setPageSize] = useState<PageSizeOption>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Floating Back to Top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Search input ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [markModalCompany, setMarkModalCompany] = useState<Company | null>(null);
  const [resetModalCompany, setResetModalCompany] = useState<Company | null>(null);
  const [historyModalCompany, setHistoryModalCompany] = useState<Company | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 0. Fetch logged-in user from session cookie
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Fetch Authoritative Companies from Supabase Database
  const fetchAuthoritativeCompanies = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabase = supabaseUrl && !supabaseUrl.includes('placeholder');

    if (!hasSupabase) {
      // Local demo mode: Load from local cache or seed JSON
      setIsDemoMode(true);
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCompanies(parsed);
            setIsLoading(false);
            if (isManualRefresh) setIsRefreshing(false);
            return;
          }
        }
      } catch {
        // ignore cache parse error
      }

      // Initialize from 208 companies dataset
      const seeded: Company[] = initialCompaniesData.map((c) => ({
        id: `comp-${c.serial_number}`,
        serial_number: c.serial_number,
        company_name: c.company_name,
        phone_number: c.phone_number,
        status: 'NOT_CONTACTED',
        called_by_user_id: null,
        called_by_name: null,
        contacted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setCompanies(seeded);
      try {
        localStorage.setItem(LOCAL_STORAGE_COMPANIES_KEY, JSON.stringify(seeded));
      } catch {
        // ignore
      }
      setIsLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('serial_number', { ascending: true });

      if (error) {
        console.error('[Supabase Fetch Error]:', error);
        addToast('error', 'Could not sync latest company list from server.');
      } else if (data && data.length > 0) {
        setCompanies(data as Company[]);
        setConnectionStatus('connected');
      } else {
        console.warn('Companies table is empty in Supabase. Check database seed.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setConnectionStatus('offline');
    } finally {
      setIsLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [addToast]);

  // 2. Initialize Authentication & Realtime Subscriptions
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabase = supabaseUrl && !supabaseUrl.includes('placeholder');

    if (hasSupabase) {
      const supabase = getSupabaseBrowserClient();

      // Check current Supabase auth session
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const { data: member } = await supabase
            .from('approved_team_members')
            .select('display_name, email')
            .eq('lower(email)', (user.email || '').toLowerCase().trim())
            .single();

          if (member) {
            setCurrentUser({
              displayName: member.display_name,
              email: member.email,
            });
          } else {
            setCurrentUser({
              displayName: user.user_metadata?.full_name || 'Aibin',
              email: user.email || '',
            });
          }
        }
      });

      // Setup Supabase Realtime channel
      const channel = supabase
        .channel('public:companies')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'companies' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Company;
              setCompanies((prev) =>
                prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              );

              if (updated.status === 'CONTACTED') {
                addToast('info', `${updated.called_by_name} marked ${updated.company_name} as Contacted.`);
              } else if (updated.status === 'NOT_CONTACTED') {
                addToast('info', `${updated.company_name} status was reset.`);
              }
            } else if (payload.eventType === 'INSERT') {
              const inserted = payload.new as Company;
              setCompanies((prev) => {
                if (prev.some((c) => c.id === inserted.id)) return prev;
                return [...prev, inserted].sort((a, b) => a.serial_number - b.serial_number);
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionStatus('reconnecting');
            fetchAuthoritativeCompanies();
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Offline/Local multi-tab broadcast channel
      setIsDemoMode(true);
      const savedMember = localStorage.getItem('infopark_dev_member');
      if (savedMember && TEAM_MEMBERS.includes(savedMember as TeamMemberName)) {
        setCurrentUser({
          displayName: savedMember,
          email: `${savedMember.toLowerCase()}@saintgits.org`,
        });
      }

      const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('infopark_realtime') : null;
      if (bc) {
        bc.onmessage = (event) => {
          if (event.data?.type === 'COMPANY_UPDATED') {
            const updated = event.data.company as Company;
            setCompanies((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
            if (updated.status === 'CONTACTED') {
              addToast('info', `${updated.called_by_name} marked ${updated.company_name} as Contacted.`);
            } else {
              addToast('info', `${updated.company_name} was reset to Not Contacted.`);
            }
          }
        };
      }

      return () => {
        if (bc) bc.close();
      };
    }
  }, [fetchAuthoritativeCompanies, addToast]);

  // 3. Network connection, visibility and scroll listeners
  useEffect(() => {
    fetchAuthoritativeCompanies();

    const handleOnline = () => {
      setConnectionStatus('connected');
      fetchAuthoritativeCompanies();
      addToast('success', 'Network reconnected. Latest company statuses synchronized.');
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      addToast('error', 'Network disconnected. Operating in offline mode.');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAuthoritativeCompanies();
      }
    };

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchAuthoritativeCompanies, addToast]);

  // 4. Handle Mark Company Contacted (Atomic RPC)
  const handleConfirmMarkContacted = async (
    companyId: string,
    callerName: string
  ): Promise<{ success: boolean; message?: string }> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabase = supabaseUrl && !supabaseUrl.includes('placeholder');

    if (!hasSupabase) {
      // Local/Demo Mode Atomic Simulation
      const currentList = [...companies];
      const target = currentList.find((c) => c.id === companyId);
      if (!target) return { success: false, message: 'Company not found.' };

      if (target.status === 'CONTACTED') {
        return {
          success: false,
          message: `This company was already marked as contacted by ${target.called_by_name}.`,
        };
      }

      const updatedCompany: Company = {
        ...target,
        status: 'CONTACTED',
        called_by_name: callerName,
        contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const nextList = currentList.map((c) => (c.id === companyId ? updatedCompany : c));
      setCompanies(nextList);
      try {
        localStorage.setItem(LOCAL_STORAGE_COMPANIES_KEY, JSON.stringify(nextList));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('infopark_realtime');
          bc.postMessage({ type: 'COMPANY_UPDATED', company: updatedCompany });
          bc.close();
        }
      } catch {
        // ignore
      }

      addToast('success', `Marked ${updatedCompany.company_name} as Contacted by ${callerName}.`);
      return { success: true };
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('mark_company_contacted', {
        p_company_id: companyId,
        p_caller_name: callerName,
      });

      if (error) {
        console.error('[RPC Error]:', error);
        return {
          success: false,
          message: error.message || 'Database error occurred while saving status.',
        };
      }

      if (data && !data.success) {
        if (data.company) {
          const freshCompany = data.company as Company;
          setCompanies((prev) =>
            prev.map((c) => (c.id === freshCompany.id ? freshCompany : c))
          );
        }
        return {
          success: false,
          message: data.message || `This company was already marked as contacted.`,
        };
      }

      if (data && data.success && data.company) {
        const freshCompany = data.company as Company;
        setCompanies((prev) =>
          prev.map((c) => (c.id === freshCompany.id ? freshCompany : c))
        );
        addToast('success', `Marked ${freshCompany.company_name} as Contacted.`);
        return { success: true };
      }

      return { success: false, message: 'Unrecognized response from server.' };
    } catch (err: unknown) {
      console.error('Fatal contact error:', err);
      const msg = err instanceof Error ? err.message : 'Network error.';
      return { success: false, message: msg };
    }
  };

  // 5. Handle Reset Company Status (Atomic RPC)
  const handleConfirmResetStatus = async (
    companyId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabase = supabaseUrl && !supabaseUrl.includes('placeholder');

    if (!hasSupabase) {
      const currentList = [...companies];
      const target = currentList.find((c) => c.id === companyId);
      if (!target) return { success: false, message: 'Company not found.' };

      const updatedCompany: Company = {
        ...target,
        status: 'NOT_CONTACTED',
        called_by_user_id: null,
        called_by_name: null,
        contacted_at: null,
        updated_at: new Date().toISOString(),
      };

      const nextList = currentList.map((c) => (c.id === companyId ? updatedCompany : c));
      setCompanies(nextList);
      try {
        localStorage.setItem(LOCAL_STORAGE_COMPANIES_KEY, JSON.stringify(nextList));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('infopark_realtime');
          bc.postMessage({ type: 'COMPANY_UPDATED', company: updatedCompany });
          bc.close();
        }
      } catch {
        // ignore
      }

      addToast('info', `Reset ${updatedCompany.company_name} to Not Contacted.`);
      return { success: true };
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('reset_company_status', {
        p_company_id: companyId,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data && data.success && data.company) {
        const freshCompany = data.company as Company;
        setCompanies((prev) =>
          prev.map((c) => (c.id === freshCompany.id ? freshCompany : c))
        );
        addToast('info', `Reset ${freshCompany.company_name} to Not Contacted.`);
        return { success: true };
      }

      return { success: false, message: 'Could not reset company status.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error resetting status.';
      return { success: false, message: msg };
    }
  };

  // 6. Sign Out Handler
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabase = supabaseUrl && !supabaseUrl.includes('placeholder');
    if (hasSupabase) {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('infopark_dev_member');
    localStorage.removeItem('infopark_user_session');
    window.location.href = '/login';
  };

  // 7. Filter and Sort Companies
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.phone_number.toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'NOT_CONTACTED') {
      result = result.filter((c) => c.status === 'NOT_CONTACTED');
    } else if (statusFilter === 'CONTACTED') {
      result = result.filter((c) => c.status === 'CONTACTED');
    }

    if (teammateFilter !== 'ALL') {
      result = result.filter(
        (c) =>
          c.status === 'CONTACTED' &&
          c.called_by_name?.toLowerCase() === teammateFilter.toLowerCase()
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'SERIAL_ASC') return a.serial_number - b.serial_number;
      if (sortBy === 'SERIAL_DESC') return b.serial_number - a.serial_number;
      if (sortBy === 'NAME_ASC') return a.company_name.localeCompare(b.company_name);
      if (sortBy === 'NAME_DESC') return b.company_name.localeCompare(a.company_name);
      return 0;
    });

    return result;
  }, [companies, searchQuery, statusFilter, teammateFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, teammateFilter, sortBy, pageSize]);

  // Total pages
  const totalPages = useMemo(() => {
    if (pageSize === 'ALL') return 1;
    return Math.max(1, Math.ceil(filteredCompanies.length / pageSize));
  }, [filteredCompanies.length, pageSize]);

  // Paginated Companies Slice
  const paginatedCompanies = useMemo(() => {
    if (pageSize === 'ALL') return filteredCompanies;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTeammateFilter('ALL');
    setSortBy('SERIAL_ASC');
    setPageSize(50);
    setCurrentPage(1);
  };

  const handleSwitchTeammate = async (name: TeamMemberName) => {
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: name, password: name }),
      });
    } catch {
      // ignore
    }
    localStorage.setItem('infopark_dev_member', name);
    setCurrentUser({
      displayName: name,
      email: `${name.toLowerCase()}@saintgits.org`,
    });
    addToast('info', `Switched active teammate to ${name}.`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Fixed Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navigation Header */}
      <Header
        currentUser={currentUser}
        connectionStatus={connectionStatus}
        isDemoMode={true}
        onSwitchTeammate={handleSwitchTeammate}
        onRefreshData={() => fetchAuthoritativeCompanies(true)}
        isRefreshing={isRefreshing}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Summary Statistics Cards */}
        <SummaryCards companies={companies} />

        {/* Search, Filter & Sort Controls */}
        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          teammateFilter={teammateFilter}
          onTeammateFilterChange={setTeammateFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalFiltered={filteredCompanies.length}
          totalOriginal={companies.length}
          onResetFilters={handleResetFilters}
          searchInputRef={searchInputRef}
        />

        {/* Companies List Container */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-slate-500">Loading Infopark company directory...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block">
              <CompanyTable
                companies={paginatedCompanies}
                onOpenMarkModal={(c) => setMarkModalCompany(c)}
                onOpenResetModal={(c) => setResetModalCompany(c)}
                onOpenHistoryModal={(c) => setHistoryModalCompany(c)}
              />
            </div>

            {/* Mobile Cards View (Hidden on desktop) */}
            <div className="block md:hidden space-y-3">
              {paginatedCompanies.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                  No companies found matching your search.
                </div>
              ) : (
                paginatedCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onOpenMarkModal={(c) => setMarkModalCompany(c)}
                    onOpenResetModal={(c) => setResetModalCompany(c)}
                  />
                ))
              )}
            </div>

            {/* Pagination Controls Bar */}
            {filteredCompanies.length > 0 && pageSize !== 'ALL' && totalPages > 1 && (
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="text-center sm:text-left">
                  Showing{' '}
                  <strong className="text-slate-900 font-bold">
                    {(currentPage - 1) * (typeof pageSize === 'number' ? pageSize : 50) + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-900 font-bold">
                    {Math.min(
                      currentPage * (typeof pageSize === 'number' ? pageSize : 50),
                      filteredCompanies.length
                    )}
                  </strong>{' '}
                  of <strong className="text-slate-900 font-bold">{filteredCompanies.length}</strong> companies
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="First page"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[36px] flex items-center gap-1 font-semibold"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  <span className="px-3 py-1 font-semibold text-slate-900 bg-slate-50 rounded-lg border border-slate-200 min-h-[36px] flex items-center justify-center">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[36px] flex items-center gap-1 font-semibold"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Last page"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Scroll to Top Button for phones & desktop */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg transition-all animate-in fade-in duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Scroll back to top"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Modals */}
      <MarkContactedModal
        company={markModalCompany}
        isOpen={!!markModalCompany}
        currentUserName={currentUser.displayName}
        onClose={() => setMarkModalCompany(null)}
        onConfirm={handleConfirmMarkContacted}
      />

      <ResetStatusModal
        company={resetModalCompany}
        isOpen={!!resetModalCompany}
        onClose={() => setResetModalCompany(null)}
        onConfirm={handleConfirmResetStatus}
      />

      <ContactHistoryModal
        company={historyModalCompany}
        isOpen={!!historyModalCompany}
        onClose={() => setHistoryModalCompany(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            Infopark Internship Calling Tracker &bull; Infopark Kochi Phase 1 Directory (208 Companies)
          </p>
        </div>
      </footer>
    </div>
  );
}
