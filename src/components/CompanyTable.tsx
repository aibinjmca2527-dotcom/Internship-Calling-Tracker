'use client';

import React from 'react';
import { Company } from '@/types';
import { PhoneCell } from './PhoneCell';
import { CheckCircle2, Circle, Clock, RotateCcw } from 'lucide-react';
import { formatContactDate } from '@/lib/phone-utils';

interface CompanyTableProps {
  companies: Company[];
  onOpenMarkModal: (company: Company) => void;
  onOpenResetModal: (company: Company) => void;
  onOpenHistoryModal?: (company: Company) => void;
}

export function CompanyTable({
  companies,
  onOpenMarkModal,
  onOpenResetModal,
  onOpenHistoryModal,
}: CompanyTableProps) {
  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <p className="text-sm font-medium text-slate-500">No companies found matching your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto max-h-[75vh]">
        <table className="min-w-full divide-y divide-slate-200 text-left border-collapse">
          {/* Sticky Header */}
          <thead className="bg-slate-50/95 backdrop-blur-xs text-xs font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
            <tr>
              <th scope="col" className="px-4 py-3.5 w-16 text-center">
                Sl.
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[240px]">
                Company Name
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[200px]">
                Contact Number
              </th>
              <th scope="col" className="px-4 py-3.5 w-36">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[160px]">
                Contacted By
              </th>
              <th scope="col" className="px-4 py-3.5 min-w-[150px]">
                Date & Time
              </th>
              <th scope="col" className="px-4 py-3.5 w-44 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {companies.map((company) => {
              const isContacted = company.status === 'CONTACTED';

              return (
                <tr
                  key={company.id}
                  className={`hover:bg-blue-50/40 transition-colors group ${
                    isContacted ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  {/* Sl. No. */}
                  <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-500">
                    #{company.serial_number}
                  </td>

                  {/* Company Name */}
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    <span className="leading-snug group-hover:text-blue-900 transition-colors">
                      {company.company_name}
                    </span>
                  </td>

                  {/* Contact Number */}
                  <td className="px-4 py-3.5">
                    <PhoneCell phoneNumber={company.phone_number} />
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5">
                    {isContacted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contacted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <Circle className="w-3 h-3 text-slate-400" />
                        <span>Not Contacted</span>
                      </span>
                    )}
                  </td>

                  {/* Contacted By */}
                  <td className="px-4 py-3.5 text-xs text-slate-700">
                    {isContacted && company.called_by_name ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                          {company.called_by_name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">
                          {company.called_by_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                    {isContacted && company.contacted_at ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{formatContactDate(company.contacted_at)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>

                  {/* Action Button */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {!isContacted ? (
                      <button
                        type="button"
                        onClick={() => onOpenMarkModal(company)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Contacted</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenResetModal(company)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 transition-colors"
                          title="Reset status back to Not Contacted"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>Reset</span>
                        </button>
                        {onOpenHistoryModal && (
                          <button
                            type="button"
                            onClick={() => onOpenHistoryModal(company)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                            title="View contact audit history"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
