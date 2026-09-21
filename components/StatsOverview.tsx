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
  Zap,
  Server,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { SLAMetricsResponse } from '@/lib/types';

interface StatsOverviewProps {
  metrics: SLAMetricsResponse | null;
  selectedServiceId: string;
  onSelectService: (serviceId: string) => void;
}

export default function StatsOverview({
  metrics,
  selectedServiceId,
  onSelectService,
}: StatsOverviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showIncidentsModal, setShowIncidentsModal] = useState(false);

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
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-xl backdrop-blur-md transition-all">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Executive SLA & Reliability Overview</h2>
            <p className="text-xs text-zinc-400">
              Aggregated availability, breach thresholds, and latency percentiles
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Summary Pill when collapsed */}
          {isCollapsed && (
            <div className="flex items-center space-x-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs">
              <span className="text-zinc-400">Availability:</span>
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
            className="flex items-center space-x-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            <span>{isCollapsed ? 'Expand Stats' : 'Collapse Stats'}</span>
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Stats Content */}
      {!isCollapsed && (
        <div className="p-5 space-y-5 animate-in fade-in duration-300">
          {/* SLA & Billing Status Banner */}
          <div
            className={`rounded-xl border p-4 transition ${
              is_overall_sla_met
                ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900'
                : 'border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    is_overall_sla_met
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/10'
                  }`}
                >
                  {is_overall_sla_met ? (
                    <ShieldCheck className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">
                      {is_overall_sla_met ? 'SLA Target Compliant' : 'SLA Breach Detected'}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
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
              <div className="flex items-center space-x-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 sm:px-4 shrink-0">
                <div>
                  <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Billing Credit Owed
                  </div>
                  <div
                    className={`text-xl font-extrabold ${
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Overall Availability */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>System Availability</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div
                className={`text-2xl font-bold mt-2 ${
                  overall_uptime_percentage >= 99.9 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {overall_uptime_percentage.toFixed(3)}%
              </div>
              <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-zinc-500">
                <span>{total_checks.toLocaleString()} total valid health pings</span>
              </div>
            </div>

            {/* Total Downtime */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Cumulative Downtime</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {total_downtime_minutes}{' '}
                <span className="text-sm font-normal text-zinc-400">mins</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">
                15 min checks × failed periods
              </div>
            </div>

            {/* Detected Incidents */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Outage Incidents</span>
                <AlertOctagon className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {incidents.length}{' '}
                <span className="text-sm font-normal text-zinc-400">
                  {incidents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              {incidents.length > 0 ? (
                <button
                  onClick={() => setShowIncidentsModal(true)}
                  className="mt-2 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  View Incident Timeline →
                </button>
              ) : (
                <div className="mt-2 text-[11px] text-emerald-400 font-medium">Zero outages</div>
              )}
            </div>

            {/* Monitored Services */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Monitored Services</span>
                <Server className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{services.length} Services</div>
              <div className="mt-2 text-[11px] text-zinc-500">
                {services.filter((s) => s.is_sla_met).length} Healthy /{' '}
                {services.filter((s) => !s.is_sla_met).length} Breached
              </div>
            </div>
          </div>

          {/* Per-Service Health Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Microservice Health & SLA Breakdown
              </h3>
              <span className="text-xs text-zinc-500">Click a card to filter logs below</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc.service_id;
                return (
                  <button
                    key={svc.service_id}
                    onClick={() =>
                      onSelectService(isSelected ? 'ALL' : svc.service_id)
                    }
                    className={`flex flex-col text-left rounded-xl p-3.5 border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/30'
                        : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-zinc-200 truncate">
                        {svc.service_name}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          svc.is_sla_met ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500 shadow-sm shadow-rose-500'
                        }`}
                      />
                    </div>

                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {svc.service_id}
                    </div>

                    {/* Availability % */}
                    <div className="mt-3 flex items-baseline justify-between">
                      <span
                        className={`text-lg font-bold ${
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
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1 text-[11px] text-zinc-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-semibold text-white">Outage Incidents Timeline</h3>
              </div>
              <button
                onClick={() => setShowIncidentsModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-3 pr-1">
              {incidents.map((inc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-zinc-100">{inc.service_name}</span>
                      <span className="text-xs font-mono text-zinc-400">({inc.service_id})</span>
                    </div>
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
                      {inc.duration_minutes} Minutes Outage
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Incident Start:</span>{' '}
                      {new Date(inc.start_time).toUTCString()}
                    </div>
                    <div>
                      <span className="text-zinc-500">Resolved At:</span>{' '}
                      {new Date(inc.end_time).toUTCString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-zinc-400">
                    <span className="text-zinc-500">Failed Checks:</span>
                    <span className="font-semibold text-zinc-200">{inc.failed_checks_count}</span>
                    <span className="text-zinc-500">| HTTP Codes:</span>
                    <div className="flex space-x-1">
                      {inc.error_status_codes.map((code) => (
                        <span
                          key={code}
                          className="rounded bg-zinc-800 px-1.5 py-0.2 text-[11px] font-mono text-rose-400"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
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
