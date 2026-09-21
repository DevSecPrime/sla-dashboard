export type QualityFlag =
  | 'EPOCH_TIMESTAMP_CONVERTED'
  | 'TIMEZONE_OFFSET_NORMALIZED'
  | 'SECONDS_TO_MS_CONVERTED'
  | 'NEGATIVE_LATENCY_SANITIZED'
  | 'EMPTY_LATENCY_IMPUTED'
  | 'STATUS_999_MARKED_OUTAGE'
  | 'DUPLICATE_AGENT_MERGED';

export interface RawCheckRecord {
  service_id: string;
  service_name: string;
  timestamp: string;
  status_code: string;
  latency?: string;
  latency_unit?: string;
  agent: string;
  region: string;
}

export interface CleanCheckRecord {
  id?: number | string;
  service_id: string;
  service_name: string;
  timestamp: string; // ISO 8601 UTC string (e.g. 2025-05-13T12:45:00.000Z)
  status_code: number;
  is_success: boolean;
  latency_ms: number | null;
  raw_latency: string;
  latency_unit: string;
  agent: string;
  region: string;
  quality_flags: QualityFlag[];
}

export interface IngestionAuditSummary {
  fileName: string;
  totalRowsRead: number;
  cleanRowsImported: number;
  duplicatesSkipped: number;
  anomaliesFixed: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  qualityBreakdown: {
    epochTimestamps: number;
    timezoneOffsets: number;
    secondsToMs: number;
    negativeLatencies: number;
    emptyLatencies: number;
    status999Outages: number;
    duplicateAgentRecords: number;
  };
  servicesFound: string[];
}

export interface ServiceMetric {
  service_id: string;
  service_name: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  is_sla_met: boolean;
  total_downtime_minutes: number;
  latency_avg: number | null;
  latency_p50: number | null;
  latency_p95: number | null;
  latency_p99: number | null;
  status_counts: Record<string, number>;
  incidents_count: number;
}

export interface IncidentPeriod {
  service_id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  failed_checks_count: number;
  error_status_codes: number[];
}

export interface SLAMetricsResponse {
  overall_uptime_percentage: number;
  sla_target: number; // e.g. 99.9
  is_overall_sla_met: boolean;
  billing_credit_percentage: number; // e.g. 0, 10, 25, 50
  total_services: number;
  total_checks: number;
  total_downtime_minutes: number;
  services: ServiceMetric[];
  incidents: IncidentPeriod[];
  date_range: {
    min_date: string | null;
    max_date: string | null;
    available_dates: string[];
  };
  audit_summary?: IngestionAuditSummary | null;
}

export interface LogFilterParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
  statusFilter?: 'ALL' | 'SUCCESS' | 'FAILED' | '5XX' | '999';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedLogsResponse {
  logs: CleanCheckRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
