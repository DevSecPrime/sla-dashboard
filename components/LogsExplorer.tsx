"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { PaginatedLogsResponse, SLAMetricsResponse } from "@/lib/types";

interface LogsExplorerProps {
  metrics: SLAMetricsResponse | null;
  selectedServiceId: string;
  onSelectService: (serviceId: string) => void;
}

export default function LogsExplorer({
  metrics,
  selectedServiceId,
  onSelectService,
}: LogsExplorerProps) {
  const [logsData, setLogsData] = useState<PaginatedLogsResponse>({
    logs: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<
    "ALL" | "SINGLE" | "RANGE"
  >("ALL");
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "SUCCESS" | "FAILED" | "5XX" | "999"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sync page reset when external service selection changes
  const [prevServiceId, setPrevServiceId] = useState(selectedServiceId);
  if (prevServiceId !== selectedServiceId) {
    setPrevServiceId(selectedServiceId);
    setPage(1);
  }

  const availableDates = metrics?.date_range.available_dates || [];

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function getLogs() {
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());

        if (selectedServiceId && selectedServiceId !== "ALL") {
          params.append("serviceId", selectedServiceId);
        }

        if (statusFilter !== "ALL") {
          params.append("statusFilter", statusFilter);
        }

        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim());
        }

        if (dateFilterMode === "SINGLE" && selectedSingleDate) {
          params.append("date", selectedSingleDate);
        } else if (dateFilterMode === "RANGE") {
          if (startDate)
            params.append("startDate", `${startDate}T00:00:00.000Z`);
          if (endDate) params.append("endDate", `${endDate}T23:59:59.999Z`);
        }

        const res = await fetch(`/api/logs?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setLogsData(data);
          }
        }
      } catch (err: unknown) {
        if (!ignore && (err as Error)?.name !== "AbortError") {
          console.error("Failed to fetch logs:", err);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    getLogs();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    page,
    pageSize,
    selectedServiceId,
    statusFilter,
    searchQuery,
    dateFilterMode,
    selectedSingleDate,
    startDate,
    endDate,
  ]);

  const handleResetFilters = () => {
    onSelectService("ALL");
    setDateFilterMode("ALL");
    setSelectedSingleDate("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("ALL");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Controls / Filter Header */}
      <div className="border-b border-zinc-800/80 p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Filter className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">
                Monitoring Health Checks Explorer
              </h2>
              <p className="text-xs text-zinc-400 hidden xs:block truncate">
                Inspect raw cleaned ping checks, response latencies, and anomaly
                correction tags
              </p>
            </div>
          </div>

          {/* Search Box & Reset */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search agent, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 pl-8.5 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="flex items-center justify-center space-x-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 sm:px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
          {/* Date Filter Mode Selector */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-1 text-xs">
            <button
              onClick={() => setDateFilterMode("ALL")}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition font-medium text-[11px] sm:text-xs ${
                dateFilterMode === "ALL"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Dates
            </button>
            <button
              onClick={() => {
                setDateFilterMode("SINGLE");
                if (!selectedSingleDate && availableDates.length > 0) {
                  setSelectedSingleDate(availableDates[0]);
                }
              }}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition font-medium text-[11px] sm:text-xs ${
                dateFilterMode === "SINGLE"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Single Date
            </button>
            <button
              onClick={() => {
                setDateFilterMode("RANGE");
                if (!startDate && availableDates.length > 0) {
                  setStartDate(availableDates[0]);
                  setEndDate(availableDates[availableDates.length - 1]);
                }
              }}
              className={`rounded-md px-2 sm:px-2.5 py-1 transition font-medium text-[11px] sm:text-xs ${
                dateFilterMode === "RANGE"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Date Range
            </button>
          </div>

          {/* Single Date Picker */}
          {dateFilterMode === "SINGLE" && (
            <div className="flex items-center space-x-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950 px-2.5 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedSingleDate}
                onChange={(e) => setSelectedSingleDate(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-zinc-900 text-zinc-100">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Inputs */}
          {dateFilterMode === "RANGE" && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-zinc-400">
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-zinc-500">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-zinc-500">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

          {/* Status Code Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500 text-[11px] font-medium mr-0.5 hidden xs:inline">
              Status:
            </span>
            {(
              [
                { id: "ALL", label: "All" },
                { id: "SUCCESS", label: "2xx OK" },
                { id: "FAILED", label: "Failures" },
                { id: "5XX", label: "5xx" },
                { id: "999", label: "999 Outage" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] font-medium transition shrink-0 ${
                  statusFilter === st.id
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-zinc-950/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
              <th className="px-3.5 sm:px-4 py-3">Timestamp (UTC)</th>
              <th className="px-3.5 sm:px-4 py-3">Service</th>
              <th className="px-3.5 sm:px-4 py-3">Status</th>
              <th className="px-3.5 sm:px-4 py-3">Latency</th>
              <th className="px-3.5 sm:px-4 py-3">Agent / Region</th>
              <th className="px-3.5 sm:px-4 py-3">Cleansing Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="text-xs">Loading health checks...</span>
                  </div>
                </td>
              </tr>
            ) : logsData.logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-zinc-500 font-sans"
                >
                  <Info className="mx-auto h-6 w-6 text-zinc-600 mb-2" />
                  No monitoring records matched the selected criteria.
                </td>
              </tr>
            ) : (
              logsData.logs.map((row, idx) => {
                const isSuccess = row.is_success;
                const is999 = row.status_code === 999;

                return (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-zinc-800/30 transition-colors font-sans"
                  >
                    {/* Timestamp */}
                    <td className="px-3.5 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-zinc-300 font-mono text-[11px]">
                      {new Date(row.timestamp)
                        .toISOString()
                        .replace(".000Z", "Z")}
                    </td>

                    {/* Service */}
                    <td className="px-3.5 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <span className="font-semibold text-zinc-200 text-xs">
                          {row.service_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {row.service_id}
                        </span>
                      </div>
                    </td>

                    {/* Status Code */}
                    <td className="px-3.5 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[11px] font-semibold ${
                          isSuccess
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : is999
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        <span>{row.status_code}</span>
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="px-3.5 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                      {row.latency_ms !== null ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-zinc-300 text-xs">
                            {row.latency_ms} ms
                          </span>
                          <div className="w-12 sm:w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden hidden xs:block">
                            <div
                              className={`h-full rounded-full ${
                                row.latency_ms > 800
                                  ? "bg-rose-500"
                                  : row.latency_ms > 400
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                              }`}
                              style={{
                                width: `${Math.min(100, (row.latency_ms / 1000) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs italic">
                          null
                        </span>
                      )}
                    </td>

                    {/* Agent / Region */}
                    <td className="px-3.5 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-zinc-400 text-xs">
                      <span className="text-zinc-300 font-medium">
                        {row.agent}
                      </span>
                      <span className="text-zinc-600 mx-1">•</span>
                      <span className="text-zinc-400">{row.region}</span>
                    </td>

                    {/* Quality Flags */}
                    <td className="px-3.5 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px] sm:max-w-xs">
                        {row.quality_flags && row.quality_flags.length > 0 ? (
                          row.quality_flags.map((flag, fi) => (
                            <span
                              key={fi}
                              className="inline-flex items-center space-x-1 rounded bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 whitespace-nowrap"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                              <span>{flag.replace(/_/g, " ")}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-zinc-600 font-sans">
                            Clean
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800/80 px-4 sm:px-5 py-3 text-xs text-zinc-400 gap-3">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
          <span>
            Showing{" "}
            <span className="text-zinc-200 font-semibold">
              {logsData.logs.length}
            </span>{" "}
            of{" "}
            <span className="text-zinc-200 font-semibold">
              {logsData.total.toLocaleString()}
            </span>{" "}
            checks
          </span>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500 text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-zinc-400 text-xs">
            Page {logsData.page} of {logsData.totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            aria-label="Previous Page"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/60 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(logsData.totalPages, p + 1))}
            disabled={page >= logsData.totalPages || isLoading}
            aria-label="Next Page"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/60 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
