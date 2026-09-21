import { CleanCheckRecord, IncidentPeriod, ServiceMetric, SLAMetricsResponse } from './types';

const SLA_TARGET = 99.9;
const CHECK_INTERVAL_MINUTES = 15; // 15-minute interval between consecutive checks

/**
 * Computes percentile from a sorted array of numbers
 */
function calculatePercentile(sortedValues: number[], percentile: number): number | null {
  if (sortedValues.length === 0) return null;
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return Math.round(sortedValues[lower] * 100) / 100;
  }
  return Math.round((sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight) * 100) / 100;
}

/**
 * Calculates billing credit percentage according to industry standard SLA tiers
 */
export function calculateBillingCredit(uptimePercentage: number): number {
  if (uptimePercentage >= SLA_TARGET) return 0;
  if (uptimePercentage >= 99.0) return 10;
  if (uptimePercentage >= 95.0) return 25;
  return 50;
}

/**
 * Detects contiguous downtime incident periods for a list of service checks.
 */
function detectIncidents(records: CleanCheckRecord[]): IncidentPeriod[] {
  const incidents: IncidentPeriod[] = [];
  const serviceGroups = new Map<string, CleanCheckRecord[]>();

  // Group checks by service
  for (const r of records) {
    if (!serviceGroups.has(r.service_id)) {
      serviceGroups.set(r.service_id, []);
    }
    serviceGroups.get(r.service_id)!.push(r);
  }

  // Detect contiguous failed runs for each service
  for (const [serviceId, checks] of serviceGroups.entries()) {
    // Sort chronologically
    const sorted = [...checks].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    let inIncident = false;
    let incidentStart = '';
    let incidentEnd = '';
    let failedCount = 0;
    const errorCodes = new Set<number>();
    const serviceName = sorted[0]?.service_name || serviceId;

    for (let i = 0; i < sorted.length; i++) {
      const check = sorted[i];

      if (!check.is_success) {
        if (!inIncident) {
          inIncident = true;
          incidentStart = check.timestamp;
          failedCount = 0;
          errorCodes.clear();
        }
        failedCount++;
        incidentEnd = check.timestamp;
        errorCodes.add(check.status_code);
      } else {
        if (inIncident) {
          incidents.push({
            service_id: serviceId,
            service_name: serviceName,
            start_time: incidentStart,
            end_time: incidentEnd,
            duration_minutes: failedCount * CHECK_INTERVAL_MINUTES,
            failed_checks_count: failedCount,
            error_status_codes: Array.from(errorCodes),
          });
          inIncident = false;
        }
      }
    }

    // If still in incident at the end of the log
    if (inIncident) {
      incidents.push({
        service_id: serviceId,
        service_name: serviceName,
        start_time: incidentStart,
        end_time: incidentEnd,
        duration_minutes: failedCount * CHECK_INTERVAL_MINUTES,
        failed_checks_count: failedCount,
        error_status_codes: Array.from(errorCodes),
      });
    }
  }

  // Sort incidents by start time descending (newest first)
  return incidents.sort((a, b) => b.start_time.localeCompare(a.start_time));
}

/**
 * Calculates all executive SLA metrics from clean records.
 */
export function calculateSLAMetrics(records: CleanCheckRecord[]): SLAMetricsResponse {
  if (records.length === 0) {
    return {
      overall_uptime_percentage: 100,
      sla_target: SLA_TARGET,
      is_overall_sla_met: true,
      billing_credit_percentage: 0,
      total_services: 0,
      total_checks: 0,
      total_downtime_minutes: 0,
      services: [],
      incidents: [],
      date_range: {
        min_date: null,
        max_date: null,
        available_dates: [],
      },
    };
  }

  const serviceMap = new Map<string, {
    service_id: string;
    service_name: string;
    checks: CleanCheckRecord[];
    latencies: number[];
    statusCounts: Record<string, number>;
  }>();

  const availableDatesSet = new Set<string>();
  let minDate = records[0].timestamp;
  let maxDate = records[0].timestamp;

  let totalSuccessful = 0;

  for (const record of records) {
    if (record.is_success) totalSuccessful++;

    // Extract YYYY-MM-DD
    const dateStr = record.timestamp.split('T')[0];
    availableDatesSet.add(dateStr);

    if (record.timestamp < minDate) minDate = record.timestamp;
    if (record.timestamp > maxDate) maxDate = record.timestamp;

    if (!serviceMap.has(record.service_id)) {
      serviceMap.set(record.service_id, {
        service_id: record.service_id,
        service_name: record.service_name,
        checks: [],
        latencies: [],
        statusCounts: {},
      });
    }

    const s = serviceMap.get(record.service_id)!;
    s.checks.push(record);

    if (record.latency_ms !== null && record.latency_ms >= 0) {
      s.latencies.push(record.latency_ms);
    }

    const codeKey = record.status_code.toString();
    s.statusCounts[codeKey] = (s.statusCounts[codeKey] || 0) + 1;
  }

  const incidents = detectIncidents(records);

  const serviceMetrics: ServiceMetric[] = [];
  let totalDowntimeMinutes = 0;

  for (const s of serviceMap.values()) {
    const totalChecks = s.checks.length;
    const successfulChecks = s.checks.filter(c => c.is_success).length;
    const failedChecks = totalChecks - successfulChecks;
    const uptimePct = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;
    const roundedUptime = Math.round(uptimePct * 1000) / 1000;
    const downtimeMinutes = failedChecks * CHECK_INTERVAL_MINUTES;
    totalDowntimeMinutes += downtimeMinutes;

    s.latencies.sort((a, b) => a - b);
    const avgLatency =
      s.latencies.length > 0
        ? Math.round((s.latencies.reduce((sum, v) => sum + v, 0) / s.latencies.length) * 100) / 100
        : null;

    const serviceIncidents = incidents.filter(i => i.service_id === s.service_id).length;

    serviceMetrics.push({
      service_id: s.service_id,
      service_name: s.service_name,
      total_checks: totalChecks,
      successful_checks: successfulChecks,
      failed_checks: failedChecks,
      uptime_percentage: roundedUptime,
      is_sla_met: roundedUptime >= SLA_TARGET,
      total_downtime_minutes: downtimeMinutes,
      latency_avg: avgLatency,
      latency_p50: calculatePercentile(s.latencies, 50),
      latency_p95: calculatePercentile(s.latencies, 95),
      latency_p99: calculatePercentile(s.latencies, 99),
      status_counts: s.statusCounts,
      incidents_count: serviceIncidents,
    });
  }

  // Sort services by service_id
  serviceMetrics.sort((a, b) => a.service_id.localeCompare(b.service_id));

  const overallUptime =
    records.length > 0 ? Math.round((totalSuccessful / records.length) * 100000) / 1000 : 100;

  // Any individual service breaching 99.9% constitutes an SLA breach
  const anyServiceBreached = serviceMetrics.some(s => !s.is_sla_met);
  const isOverallSlaMet = overallUptime >= SLA_TARGET && !anyServiceBreached;

  const minServiceUptime = serviceMetrics.length > 0
    ? Math.min(...serviceMetrics.map(s => s.uptime_percentage))
    : 100;

  const billingCredit = calculateBillingCredit(minServiceUptime);

  const availableDates = Array.from(availableDatesSet).sort();

  return {
    overall_uptime_percentage: overallUptime,
    sla_target: SLA_TARGET,
    is_overall_sla_met: isOverallSlaMet,
    billing_credit_percentage: billingCredit,
    total_services: serviceMetrics.length,
    total_checks: records.length,
    total_downtime_minutes: totalDowntimeMinutes,
    services: serviceMetrics,
    incidents,
    date_range: {
      min_date: minDate,
      max_date: maxDate,
      available_dates: availableDates,
    },
  };
}
