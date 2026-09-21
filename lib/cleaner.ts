import { CleanCheckRecord, IngestionAuditSummary, QualityFlag, RawCheckRecord } from './types';

/**
 * Normalizes any timestamp representation (Unix Epoch, ISO with offsets, or standard UTC)
 * into a standard UTC ISO-8601 string.
 */
export function normalizeTimestamp(rawTimestamp: string): { isoTimestamp: string; flags: QualityFlag[] } {
  const flags: QualityFlag[] = [];
  const trimmed = rawTimestamp?.trim();

  if (!trimmed) {
    return { isoTimestamp: new Date().toISOString(), flags };
  }

  // Case 1: Pure digits (Unix Epoch)
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    // If 10 digits -> seconds, if 13 digits -> milliseconds
    const date = num < 1e11 ? new Date(num * 1000) : new Date(num);
    flags.push('EPOCH_TIMESTAMP_CONVERTED');
    return { isoTimestamp: date.toISOString(), flags };
  }

  // Case 2: Timezone offset string (e.g. +05:30 or -04:00)
  if (trimmed.includes('+') || (trimmed.lastIndexOf('-') > 10 && !trimmed.endsWith('Z'))) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      flags.push('TIMEZONE_OFFSET_NORMALIZED');
      return { isoTimestamp: date.toISOString(), flags };
    }
  }

  // Case 3: Standard ISO string (e.g. 2025-05-13T12:45:00Z)
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return { isoTimestamp: parsed.toISOString(), flags };
  }

  // Fallback
  return { isoTimestamp: new Date().toISOString(), flags };
}

/**
 * Normalizes latency value and unit into milliseconds (ms).
 * Sanitizes negative values and empty fields.
 */
export function normalizeLatency(
  rawLatency: string | undefined,
  rawUnit: string | undefined
): { latencyMs: number | null; flags: QualityFlag[] } {
  const flags: QualityFlag[] = [];
  const unit = rawUnit?.trim().toLowerCase() || 'ms';
  const valStr = rawLatency?.trim();

  if (!valStr || valStr === '') {
    flags.push('EMPTY_LATENCY_IMPUTED');
    return { latencyMs: null, flags };
  }

  const parsed = parseFloat(valStr);
  if (isNaN(parsed)) {
    flags.push('EMPTY_LATENCY_IMPUTED');
    return { latencyMs: null, flags };
  }

  if (parsed < 0) {
    flags.push('NEGATIVE_LATENCY_SANITIZED');
    return { latencyMs: null, flags };
  }

  if (unit === 's' || unit === 'sec' || unit === 'seconds') {
    flags.push('SECONDS_TO_MS_CONVERTED');
    return { latencyMs: Math.round(parsed * 1000 * 100) / 100, flags };
  }

  return { latencyMs: Math.round(parsed * 100) / 100, flags };
}

/**
 * Parses, cleans, validates, and deduplicates an array of raw CSV check rows.
 */
export function cleanMonitoringData(
  rawRecords: RawCheckRecord[],
  fileName: string = 'upload.csv'
): {
  cleanRecords: CleanCheckRecord[];
  auditSummary: IngestionAuditSummary;
} {
  const cleanRecords: CleanCheckRecord[] = [];
  const seenMap = new Map<string, CleanCheckRecord>();
  const servicesSet = new Set<string>();

  const breakdown = {
    epochTimestamps: 0,
    timezoneOffsets: 0,
    secondsToMs: 0,
    negativeLatencies: 0,
    emptyLatencies: 0,
    status999Outages: 0,
    duplicateAgentRecords: 0,
  };

  let minTimestamp: string | null = null;
  let maxTimestamp: string | null = null;

  for (const raw of rawRecords) {
    if (!raw.service_id || !raw.timestamp) {
      continue;
    }

    const serviceId = raw.service_id.trim();
    const serviceName = raw.service_name?.trim() || serviceId;
    servicesSet.add(serviceId);

    // 1. Normalize Timestamp
    const { isoTimestamp, flags: tsFlags } = normalizeTimestamp(raw.timestamp);
    if (tsFlags.includes('EPOCH_TIMESTAMP_CONVERTED')) breakdown.epochTimestamps++;
    if (tsFlags.includes('TIMEZONE_OFFSET_NORMALIZED')) breakdown.timezoneOffsets++;

    // Track min/max dates
    if (!minTimestamp || isoTimestamp < minTimestamp) minTimestamp = isoTimestamp;
    if (!maxTimestamp || isoTimestamp > maxTimestamp) maxTimestamp = isoTimestamp;

    // 2. Normalize Latency
    const { latencyMs, flags: latFlags } = normalizeLatency(raw.latency, raw.latency_unit);
    if (latFlags.includes('SECONDS_TO_MS_CONVERTED')) breakdown.secondsToMs++;
    if (latFlags.includes('NEGATIVE_LATENCY_SANITIZED')) breakdown.negativeLatencies++;
    if (latFlags.includes('EMPTY_LATENCY_IMPUTED')) breakdown.emptyLatencies++;

    // 3. Status Code & SLA Availability status
    const statusCode = parseInt(raw.status_code?.trim() || '500', 10);
    const codeFlags: QualityFlag[] = [];
    let isSuccess = false;

    if (statusCode === 999) {
      codeFlags.push('STATUS_999_MARKED_OUTAGE');
      breakdown.status999Outages++;
      isSuccess = false;
    } else {
      isSuccess = statusCode >= 200 && statusCode < 400;
    }

    const allFlags: QualityFlag[] = [...tsFlags, ...latFlags, ...codeFlags];

    const cleanRecord: CleanCheckRecord = {
      service_id: serviceId,
      service_name: serviceName,
      timestamp: isoTimestamp,
      status_code: statusCode,
      is_success: isSuccess,
      latency_ms: latencyMs,
      raw_latency: raw.latency || '',
      latency_unit: raw.latency_unit || 'ms',
      agent: raw.agent?.trim() || 'unknown-agent',
      region: raw.region?.trim() || 'unknown-region',
      quality_flags: allFlags,
    };

    // 4. Deduplicate (service_id, normalized_timestamp)
    const dedupKey = `${serviceId}___${isoTimestamp}`;
    if (seenMap.has(dedupKey)) {
      breakdown.duplicateAgentRecords++;
      const existing = seenMap.get(dedupKey)!;
      if (!existing.quality_flags.includes('DUPLICATE_AGENT_MERGED')) {
        existing.quality_flags.push('DUPLICATE_AGENT_MERGED');
      }
      // If the duplicate entry has valid latency while existing was null, update latency
      if (existing.latency_ms === null && cleanRecord.latency_ms !== null) {
        existing.latency_ms = cleanRecord.latency_ms;
      }
    } else {
      seenMap.set(dedupKey, cleanRecord);
      cleanRecords.push(cleanRecord);
    }
  }

  // Sort clean records chronologically
  cleanRecords.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const totalAnomalies =
    breakdown.epochTimestamps +
    breakdown.timezoneOffsets +
    breakdown.secondsToMs +
    breakdown.negativeLatencies +
    breakdown.emptyLatencies +
    breakdown.status999Outages +
    breakdown.duplicateAgentRecords;

  const auditSummary: IngestionAuditSummary = {
    fileName,
    totalRowsRead: rawRecords.length,
    cleanRowsImported: cleanRecords.length,
    duplicatesSkipped: breakdown.duplicateAgentRecords,
    anomaliesFixed: totalAnomalies,
    dateRangeStart: minTimestamp,
    dateRangeEnd: maxTimestamp,
    qualityBreakdown: breakdown,
    servicesFound: Array.from(servicesSet),
  };

  return { cleanRecords, auditSummary };
}
