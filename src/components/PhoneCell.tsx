'use client';

import React, { useState } from 'react';
import { Phone, Copy, Check } from 'lucide-react';
import { formatTelHref } from '@/lib/phone-utils';

interface PhoneCellProps {
  phoneNumber: string;
  className?: string;
  isFullWidthOnMobile?: boolean;
}

export function PhoneCell({
  phoneNumber,
  className = '',
  isFullWidthOnMobile = false,
}: PhoneCellProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = phoneNumber;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const telHref = formatTelHref(phoneNumber);

  return (
    <div
      className={`inline-flex items-center gap-2 ${
        isFullWidthOnMobile ? 'w-full' : ''
      } ${className}`}
    >
      {/* Click-to-Call Link */}
      <a
        href={telHref}
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 active:bg-blue-200 text-blue-700 hover:text-blue-900 border border-blue-200/80 font-mono text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-98 min-h-[44px] sm:min-h-0 ${
          isFullWidthOnMobile ? 'flex-1' : ''
        }`}
        title={`Click to call ${phoneNumber}`}
      >
        <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-600 flex-shrink-0" />
        <span className="whitespace-nowrap">{phoneNumber}</span>
      </a>

      {/* Copy Phone Number Button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`p-2 sm:p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${
          copied
            ? 'bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-200'
            : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
        }`}
        title={copied ? 'Phone number copied!' : 'Copy phone number'}
        aria-label="Copy phone number"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : (
          <Copy className="w-4 h-4 text-slate-500" />
        )}
      </button>
    </div>
  );
}
