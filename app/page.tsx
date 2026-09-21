'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import StatsOverview from '@/components/StatsOverview';
import LogsExplorer from '@/components/LogsExplorer';
import UploadModal from '@/components/UploadModal';
import { IngestionAuditSummary, SLAMetricsResponse } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [metrics, setMetrics] = useState<SLAMetricsResponse | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('ALL');
  const [activeDatasetName, setActiveDatasetName] = useState<string>('9d Seed 101');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoadingMetrics(true);
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const data: SLAMetricsResponse = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch SLA metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  const handleLoadSample = useCallback(async (sampleId: string) => {
    try {
      setIsLoadingSample(true);
      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId, clearExisting: true }),
      });

      const data = await res.json();
      if (res.ok) {
        setActiveDatasetName(sampleId.toUpperCase());
        setBannerNotice(`Loaded ${sampleId.toUpperCase()} dataset successfully (${data.auditSummary.cleanRowsImported.toLocaleString()} clean checks).`);
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to load sample dataset:', err);
    } finally {
      setIsLoadingSample(false);
    }
  }, [fetchMetrics]);

  const handleUploadSuccess = async (audit: IngestionAuditSummary) => {
    setActiveDatasetName(audit.fileName.replace('.csv', ''));
    setBannerNotice(`Successfully processed and persisted ${audit.cleanRowsImported.toLocaleString()} records.`);
    await fetchMetrics();
  };

  // Initial load: fetch metrics, or load default 9d sample if database is empty
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          const data: SLAMetricsResponse = await res.json();
          if (data.total_checks === 0) {
            // Auto-load 9d dataset for initial demonstration
            await handleLoadSample('9d');
          } else {
            setMetrics(data);
            if (data.audit_summary?.fileName) {
              setActiveDatasetName(data.audit_summary.fileName.replace('.csv', ''));
            }
          }
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    init();
  }, [handleLoadSample]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onLoadSample={handleLoadSample}
        isLoadingSample={isLoadingSample}
        activeDatasetName={activeDatasetName}
        isCloudDb={Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)}
      />

      {/* Main Single-Screen Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner notification if dataset changed */}
        {bannerNotice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-xs text-emerald-300 animate-in fade-in duration-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{bannerNotice}</span>
            </div>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-emerald-400/80 hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: Collapsible Executive SLA Overview */}
        <section aria-label="Executive SLA Overview">
          <StatsOverview
            metrics={metrics}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
            isLoading={isLoadingMetrics}
          />
        </section>

        {/* Section 2: Health Checks Log Explorer */}
        <section aria-label="Logs Explorer">
          <LogsExplorer
            metrics={metrics}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
        </section>
      </main>

      {/* Upload CSV Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SLA Monitoring Dashboard • Production-Grade Serverless Pipeline</span>
          <span className="font-mono text-[11px] text-zinc-600">
            Next.js App Router • Tailwind CSS • PostgreSQL / Supabase
          </span>
        </div>
      </footer>
    </div>
  );
}
