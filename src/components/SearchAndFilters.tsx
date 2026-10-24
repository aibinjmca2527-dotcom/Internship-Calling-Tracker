'use client';

import React from 'react';
import { Search, Filter, X, ArrowUpDown, Phone, UserCheck, Layers } from 'lucide-react';
import { TEAM_MEMBERS, TeamMemberName } from '@/types';

export type StatusFilter = 'ALL' | 'NOT_CONTACTED' | 'CONTACTED' | 'NO_ANSWER';
export type SortOption = 'SERIAL_ASC' | 'SERIAL_DESC' | 'NAME_ASC' | 'NAME_DESC';
export type PageSizeOption = 25 | 50 | 100 | 'ALL';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
  teammateFilter: string;
  onTeammateFilterChange: (val: string) => void;
  sortBy: SortOption;
  onSortByChange: (val: SortOption) => void;
  pageSize: PageSizeOption;
  onPageSizeChange: (val: PageSizeOption) => void;
  totalFiltered: number;
  totalOriginal: number;
  onResetFilters: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchAndFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  teammateFilter,
  onTeammateFilterChange,
  sortBy,
  onSortByChange,
  pageSize,
  onPageSizeChange,
  totalFiltered,
  totalOriginal,
  onResetFilters,
  searchInputRef,
}: SearchAndFiltersProps) {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    teammateFilter !== 'ALL' ||
    sortBy !== 'SERIAL_ASC';

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
      {/* Top row: Search input + Sort Dropdown */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company name or phone number... (Press / to focus)"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full pl-9 pr-9 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px] sm:min-h-0"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 sm:w-60">
          <ArrowUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortOption)}
            className="w-full py-2.5 sm:py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-h-[44px] sm:min-h-0"
          >
            <option value="SERIAL_ASC">Sl. No. (1 &rarr; 208)</option>
            <option value="SERIAL_DESC">Sl. No. (208 &rarr; 1)</option>
            <option value="NAME_ASC">Company Name (A &rarr; Z)</option>
            <option value="NAME_DESC">Company Name (Z &rarr; A)</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Filter Chips, Caller Select, Page Size, Results Count */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
        {/* Left: Status Filter and Caller Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Segmented Buttons */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => onStatusFilterChange('ALL')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-colors text-center ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange('NOT_CONTACTED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-colors text-center ${
                statusFilter === 'NOT_CONTACTED'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Not Contacted
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange('CONTACTED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-colors text-center ${
                statusFilter === 'CONTACTED'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contacted
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange('NO_ANSWER')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition-colors text-center ${
                statusFilter === 'NO_ANSWER'
                  ? 'bg-white text-amber-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              No Answer
            </button>
          </div>

          {/* Filter by Teammate */}
          <div className="inline-flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={teammateFilter}
              onChange={(e) => onTeammateFilterChange(e.target.value)}
              className="w-full sm:w-auto py-2 sm:py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-h-[40px] sm:min-h-0"
            >
              <option value="ALL">All Callers</option>
              {TEAM_MEMBERS.map((member) => (
                <option key={member} value={member}>
                  Contacted by {member}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Results Count, Page Size Selector & Reset */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 pt-1 sm:pt-0">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-900">{totalFiltered}</strong> of{' '}
              {totalOriginal}
            </span>

            {/* Page Size Segment */}
            <div className="hidden sm:inline-flex items-center gap-1 bg-slate-100 rounded-md p-0.5 border border-slate-200 text-[11px]">
              <span className="text-slate-400 px-1">Per page:</span>
              {([25, 50, 100, 'ALL'] as PageSizeOption[]).map((size) => (
                <button
                  key={size}
                  onClick={() => onPageSizeChange(size)}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                    pageSize === size
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors border border-blue-200/60"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
