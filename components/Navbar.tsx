'use client';

import React, { useState } from 'react';
import { Upload, Database, ShieldAlert, Sparkles, RefreshCw, ChevronDown, Check } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onLoadSample: (sampleId: string) => Promise<void>;
  isLoadingSample: boolean;
  activeDatasetName?: string;
  isCloudDb?: boolean;
}

const SAMPLE_OPTIONS = [
  { id: '9d', name: '9-Day Multi-Agent Log (Seed 101)', days: '9 Days', incidents: 'svc-reports (Day 5)' },
  { id: '12d', name: '12-Day Multi-Agent Log (Seed 505)', days: '12 Days', incidents: 'svc-search (Day 4, 8)' },
  { id: '14d', name: '14-Day Multi-Agent Log (Seed 202)', days: '14 Days', incidents: 'svc-notify (Day 0, 6)' },
  { id: '21d', name: '21-Day Multi-Agent Log (Seed 303)', days: '21 Days', incidents: 'svc-payments (Day 2)' },
  { id: '30d', name: '30-Day Multi-Agent Log (Seed 404)', days: '30 Days', incidents: 'svc-auth (Day 16), svc-reports (Day 3)' },
];

export default function Navbar({
  onOpenUpload,
  onLoadSample,
  isLoadingSample,
  activeDatasetName,
  isCloudDb = false,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/20">
            <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white truncate">
                SLA Sentinel
              </h1>
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400">
                SLA 99.9%
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 hidden xs:block truncate">
              Stateless Cloud Pipeline & Reliability Monitoring
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Quick Dataset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={isLoadingSample}
              aria-label="Select test dataset"
              className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
            >
              {isLoadingSample ? (
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-emerald-400" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              )}
              <span className="hidden md:inline max-w-[140px] truncate">
                {activeDatasetName ? `Dataset: ${activeDatasetName}` : 'Load Test Data'}
              </span>
              <span className="hidden sm:inline md:hidden">
                {activeDatasetName ? activeDatasetName : 'Datasets'}
              </span>
              <span className="sm:hidden text-[11px]">Datasets</span>
              <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-72 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl shadow-black/80 ring-1 ring-white/10">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80">
                    Sample Incident Logs
                  </div>
                  <div className="mt-1 space-y-1">
                    {SAMPLE_OPTIONS.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={async () => {
                          setDropdownOpen(false);
                          await onLoadSample(sample.id);
                        }}
                        className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-xs transition hover:bg-zinc-800 focus:bg-zinc-800"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-zinc-200">{sample.days} Dataset</div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            Incidents: {sample.incidents}
                          </div>
                        </div>
                        {activeDatasetName?.toLowerCase().includes(sample.id) && (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Database Indicator Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
            <Database className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{isCloudDb ? 'PostgreSQL (Supabase)' : 'Local SQLite DB'}</span>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            aria-label="Upload CSV File"
            className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-zinc-950 shadow-md shadow-emerald-500/20 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 shrink-0"
          >
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Upload CSV</span>
            <span className="xs:hidden">Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}
