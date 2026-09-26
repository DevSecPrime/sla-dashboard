'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Clock,
  Activity,
  Server,
  BarChart3,
} from 'lucide-react';
import { SLAMetricsResponse } from '@/lib/types';

interface StatsOverviewProps {
  metrics: SLAMetricsResponse | null;
  selectedServiceId: string;
  onSelectService: (serviceId: string) => void;
  isLoading?: boolean;
}

export default function StatsOverview({
  metrics,
  selectedServiceId,
  onSelectService,
  isLoading = false,
}: StatsOverviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showIncidentsModal, setShowIncidentsModal] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-emerald-400">
          <Activity className="h-6 w-6 animate-spin" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-200">Loading SLA Analytics...</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Calculating multi-agent uptime, error budgets, and SLA compliance metrics.
        </p>
      </div>
    );
  }

  if (!metrics || metrics.total_checks === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-200">No Monitoring Data Loaded</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Upload a monitoring CSV or select a test dataset from the top bar to view SLA analytics.
        </p>
      </div>
    );
  }

  const {
    overall_uptime_percentage,
    sla_target,
    is_overall_sla_met,
    billing_credit_percentage,
    total_checks,
    total_downtime_minutes,
    services,
    incidents,
  } = metrics;

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-xl backdrop-blur-md transition-all overflow-hidden">
      {/* Collapsible Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 px-4 sm:px-5 py-3.5 sm:py-4 gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">Executive SLA & Reliability Overview</h2>
            <p className="text-xs text-zinc-400 hidden xs:block truncate">
              Aggregated availability, breach thresholds, and latency percentiles
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Quick Summary Pill when collapsed */}
          {isCollapsed && (
            <div className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg sm:rounded-full border border-zinc-700 bg-zinc-800 px-2.5 sm:px-3 py-1 text-xs">
              <span className="text-zinc-400">Uptime:</span>
              <span
                className={`font-bold ${
                  is_overall_sla_met ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {overall_uptime_percentage.toFixed(3)}%
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Credit:</span>
              <span className="font-bold text-amber-400">{billing_credit_percentage}%</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center space-x-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 shrink-0"
          >
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Stats Content */}
      {!isCollapsed && (
        <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-5 animate-in fade-in duration-300">
          {/* SLA & Billing Status Banner */}
          <div
            className={`rounded-xl border p-3.5 sm:p-4 transition ${
              is_overall_sla_met
                ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900'
                : 'border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div className="flex items-start space-x-3 sm:space-x-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${
                    is_overall_sla_met
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/10'
                  }`}
                >
                  {is_overall_sla_met ? (
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {is_overall_sla_met ? 'SLA Target Compliant' : 'SLA Breach Detected'}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider shrink-0 ${
                        is_overall_sla_met
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      Target: {sla_target}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {is_overall_sla_met
                      ? 'All microservices satisfied the minimum 99.9% uptime requirement. No billing credit owed.'
                      : `One or more services dipped below 99.9% availability during the period. Customers qualify for automated billing credit.`}
                  </p>
                </div>
              </div>

              {/* Billing Credit Box */}
              <div className="flex items-center justify-between md:justify-start space-x-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 sm:px-4 shrink-0">
                <div>
                  <div className="text-[10px] sm:text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Billing Credit Owed
                  </div>
                  <div
                    className={`text-lg sm:text-xl font-extrabold ${
                      billing_credit_percentage > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {billing_credit_percentage}% Credit
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top High-Level Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {/* Overall Availability */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 sm:p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>System Availability</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold mt-2 ${
                  overall_uptime_percentage >= 99.9 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {overall_uptime_percentage.toFixed(3)}%
              </div>
              <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-zinc-500 truncate">
                <span>{total_checks.toLocaleString()} total valid health pings</span>
              </div>
            </div>

            {/* Total Downtime */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Cumulative Downtime</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-2">
                {total_downtime_minutes}{' '}
                <span className="text-sm font-normal text-zinc-400">mins</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500 truncate">
                15 min checks × failed periods
              </div>
            </div>

            {/* Detected Incidents */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Outage Incidents</span>
                <AlertOctagon className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-2">
                {incidents.length}{' '}
                <span className="text-sm font-normal text-zinc-400">
                  {incidents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              {incidents.length > 0 ? (
                <button
                  onClick={() => setShowIncidentsModal(true)}
                  className="mt-2 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 block text-left"
                >
                  View Incident Timeline →
                </button>
              ) : (
                <div className="mt-2 text-[11px] text-emerald-400 font-medium">Zero outages</div>
              )}
            </div>

            {/* Monitored Services */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Monitored Services</span>
                <Server className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-2">{services.length} Services</div>
              <div className="mt-2 text-[11px] text-zinc-500 truncate">
                {services.filter((s) => s.is_sla_met).length} Healthy /{' '}
                {services.filter((s) => !s.is_sla_met).length} Breached
              </div>
            </div>
          </div>

          {/* Per-Service Health Cards */}
          <div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2.5 sm:mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Microservice Health & SLA Breakdown
              </h3>
              <span className="text-[11px] sm:text-xs text-zinc-500">Click a card to filter logs below</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc.service_id;
                return (
                  <button
                    key={svc.service_id}
                    onClick={() =>
                      onSelectService(isSelected ? 'ALL' : svc.service_id)
                    }
                    className={`flex flex-col text-left rounded-xl p-3 sm:p-3.5 border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/30'
                        : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs text-zinc-200 truncate pr-2">
                        {svc.service_name}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          svc.is_sla_met ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500 shadow-sm shadow-rose-500'
                        }`}
                      />
                    </div>

                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {svc.service_id}
                    </div>

                    {/* Availability % */}
                    <div className="mt-3 flex items-baseline justify-between w-full">
                      <span
                        className={`text-base sm:text-lg font-bold ${
                          svc.is_sla_met ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {svc.uptime_percentage.toFixed(2)}%
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          svc.is_sla_met
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {svc.is_sla_met ? 'PASS' : 'BREACH'}
                      </span>
                    </div>

                    {/* Latency & Incidents */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1 text-[11px] text-zinc-400 w-full">
                      <div className="flex justify-between">
                        <span>p95 Latency:</span>
                        <span className="font-medium text-zinc-200">
                          {svc.latency_p95 !== null ? `${svc.latency_p95} ms` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downtime:</span>
                        <span
                          className={`font-medium ${
                            svc.total_downtime_minutes > 0 ? 'text-rose-400' : 'text-zinc-400'
                          }`}
                        >
                          {svc.total_downtime_minutes}m ({svc.incidents_count} inc)
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Incidents Timeline Modal */}
      {showIncidentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-semibold text-white">Outage Incidents Timeline</h3>
              </div>
              <button
                onClick={() => setShowIncidentsModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 overflow-y-auto space-y-3 pr-1 flex-1">
              {incidents.map((inc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-3.5 sm:p-4 space-y-2.5"
                >
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-zinc-100">{inc.service_name}</span>
                      <span className="text-xs font-mono text-zinc-400">({inc.service_id})</span>
                    </div>
                    <span className="self-start xs:self-auto rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
                      {inc.duration_minutes} Minutes Outage
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-zinc-400">
                    <div className="break-words">
                      <span className="text-zinc-500">Start:</span>{' '}
                      {new Date(inc.start_time).toUTCString()}
                    </div>
                    <div className="break-words">
                      <span className="text-zinc-500">Resolved:</span>{' '}
                      {new Date(inc.end_time).toUTCString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1 border-t border-rose-950/40">
                    <div>
                      <span className="text-zinc-500">Failed Checks:</span>{' '}
                      <span className="font-semibold text-zinc-200">{inc.failed_checks_count}</span>
                    </div>
                    <span className="text-zinc-600 hidden sm:inline">•</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-zinc-500">HTTP Codes:</span>
                      <div className="flex flex-wrap gap-1">
                        {inc.error_status_codes.map((code) => (
                          <span
                            key={code}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-mono text-rose-400"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end shrink-0 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowIncidentsModal(false)}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
