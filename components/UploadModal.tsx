'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Zap,
  Layers,
  CopyX,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { IngestionAuditSummary } from '@/lib/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (audit: IngestionAuditSummary) => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<IngestionAuditSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv') {
        setFile(droppedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload a valid CSV file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setErrorMsg('Please select a CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clearExisting', clearExisting ? 'true' : 'false');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process CSV file');
      }

      setAuditResult(data.auditSummary);
      onUploadSuccess(data.auditSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during upload.';
      setErrorMsg(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetModal = () => {
    setFile(null);
    setAuditResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-2xl shadow-black ring-1 ring-white/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {auditResult ? 'Data Ingestion & Cleaning Audit' : 'Upload Monitoring CSV'}
              </h2>
              <p className="text-xs text-zinc-400 hidden xs:block truncate">
                {auditResult
                  ? 'Serverless pipeline executed cleaning & normalization rules'
                  : 'Stateless serverless function parses, cleans, and persists multi-agent logs'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModal}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
          {errorMsg && (
            <div className="flex items-start space-x-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!auditResult ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : file
                    ? 'border-emerald-500/50 bg-zinc-950/60'
                    : 'border-zinc-700 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</span>
                    <span className="text-xs text-zinc-400">
                      {(file.size / 1024).toFixed(1)} KB — Click or drop to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                      <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-zinc-200">
                      Drag & drop CSV file here, or{' '}
                      <span className="text-emerald-400 font-semibold underline underline-offset-2">browse</span>
                    </span>
                    <span className="text-[11px] sm:text-xs text-zinc-500 max-w-md">
                      Supports multi-agent logs with messy timestamps, mixed latency units, and duplicates
                    </span>
                  </div>
                )}
              </div>

              {/* Checkbox Options */}
              <div className="flex items-start sm:items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="clearExisting"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="h-4 w-4 mt-0.5 sm:mt-0 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-400 shrink-0"
                />
                <label htmlFor="clearExisting" className="text-xs text-zinc-300 select-none cursor-pointer">
                  Clear existing records in database before importing
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 sm:space-x-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="rounded-lg border border-zinc-700 px-3.5 sm:px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!file || isUploading}
                  onClick={handleUploadSubmit}
                  className="flex items-center space-x-2 rounded-lg bg-emerald-500 px-4 sm:px-5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      <span>Cleaning & Persisting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Process & Ingest</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Cleaning Audit Report View */
            <div className="space-y-3.5 sm:space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 sm:p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-emerald-300">
                      Ingestion & Cleansing Successful
                    </h3>
                    <p className="text-[11px] sm:text-xs text-emerald-400/80">
                      Imported {auditResult.cleanRowsImported.toLocaleString()} clean health checks into the database.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">Total Raw Rows</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-1">
                    {auditResult.totalRowsRead.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">Clean Rows Saved</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
                    {auditResult.cleanRowsImported.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">Duplicates Dropped</div>
                  <div className="text-base sm:text-lg font-bold text-amber-400 mt-1">
                    {auditResult.duplicatesSkipped.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 sm:p-3">
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">Anomalies Fixed</div>
                  <div className="text-base sm:text-lg font-bold text-cyan-400 mt-1">
                    {auditResult.anomaliesFixed.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Data Cleansing Breakdown */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3.5 sm:p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5 sm:mb-3">
                  Data Quality Audit Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="truncate">Epoch Timestamps Standardized</span>
                    </div>
                    <span className="font-semibold text-white ml-2">
                      {auditResult.qualityBreakdown.epochTimestamps}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="truncate">Timezone Offsets Converted</span>
                    </div>
                    <span className="font-semibold text-white ml-2">
                      {auditResult.qualityBreakdown.timezoneOffsets}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="truncate">Seconds to Milliseconds (ms)</span>
                    </div>
                    <span className="font-semibold text-white ml-2">
                      {auditResult.qualityBreakdown.secondsToMs}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <CopyX className="h-4 w-4 text-yellow-400 shrink-0" />
                      <span className="truncate">Duplicate Checkpoints Skipped</span>
                    </div>
                    <span className="font-semibold text-white ml-2">
                      {auditResult.qualityBreakdown.duplicateAgentRecords}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <AlertTriangle className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="truncate">Code 999 Marked Outage</span>
                    </div>
                    <span className="font-semibold text-white ml-2">
                      {auditResult.qualityBreakdown.status999Outages}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <Layers className="h-4 w-4 text-rose-400 shrink-0" />
                      <span className="truncate">Missing / Negative Latencies</span>
                    </div>
                    <span className="font-semibold text-white ml-2">
                      {auditResult.qualityBreakdown.emptyLatencies +
                        auditResult.qualityBreakdown.negativeLatencies}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Dashboard Button */}
              <div className="flex justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="flex items-center space-x-2 rounded-lg bg-emerald-500 px-4 sm:px-5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  <span>Explore Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
