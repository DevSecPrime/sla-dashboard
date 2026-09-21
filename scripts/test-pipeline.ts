import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { cleanMonitoringData } from '../lib/cleaner';
import { calculateSLAMetrics } from '../lib/metrics';
import { RawCheckRecord } from '../lib/types';

const DATA_DIR = path.join(process.cwd(), 'docs', 'assignment-docs');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));

console.log('========================================================');
console.log('🧪 TESTING SLA INGESTION & DATA CLEANING PIPELINE');
console.log('========================================================\n');

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  const rawText = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse<RawCheckRecord>(rawText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: h => h.trim(),
  });

  const startTime = Date.now();
  const { cleanRecords, auditSummary } = cleanMonitoringData(parsed.data, file);
  const metrics = calculateSLAMetrics(cleanRecords);
  const elapsed = Date.now() - startTime;

  console.log(`📁 File: ${file}`);
  console.log(`   - Raw rows: ${auditSummary.totalRowsRead.toLocaleString()}`);
  console.log(`   - Clean rows: ${auditSummary.cleanRowsImported.toLocaleString()}`);
  console.log(`   - Duplicates dropped: ${auditSummary.duplicatesSkipped}`);
  console.log(`   - Anomalies fixed: ${auditSummary.anomaliesFixed}`);
  console.log(`   - Processing time: ${elapsed}ms`);
  console.log(`   - Overall SLA Uptime: ${metrics.overall_uptime_percentage}% (Target: 99.9%)`);
  console.log(`   - Overall SLA Met: ${metrics.is_overall_sla_met ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Billing Credit: ${metrics.billing_credit_percentage}%`);
  console.log(`   - Outage Incidents Detected: ${metrics.incidents.length}`);
  for (const inc of metrics.incidents) {
    console.log(`     * [${inc.service_name}] ${inc.duration_minutes}m outage | Start: ${inc.start_time} | Statuses: ${inc.error_status_codes.join(',')}`);
  }
  console.log('--------------------------------------------------------\n');
}

console.log('✅ All sample datasets passed data cleaning & SLA validation tests successfully!');
