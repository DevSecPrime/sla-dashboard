import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CleanCheckRecord, IngestionAuditSummary, LogFilterParams, PaginatedLogsResponse } from './types';

interface SqliteMonitoringCheckRow {
  id: number;
  service_id: string;
  service_name: string;
  timestamp: string;
  status_code: number;
  is_success: number;
  latency_ms: number | null;
  raw_latency: string;
  latency_unit: string;
  agent: string;
  region: string;
  quality_flags: string | null;
  created_at?: string;
}

interface SqliteCountRow {
  count: number;
}

interface SqliteUploadSessionRow {
  id: number;
  file_name: string;
  total_rows: number;
  clean_rows: number;
  duplicates_skipped: number;
  anomalies_fixed: number;
  date_range_start: string | null;
  date_range_end: string | null;
  quality_breakdown: string | null;
  created_at?: string;
}

// Determine if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder'));

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseKey!);
}

// Local SQLite fallback instance
let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    const dbDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
        // In serverless environments where local filesystem might be read-only (if fallback is used), use memory
        sqliteDb = new Database(':memory:');
        initSqliteSchema(sqliteDb);
        return sqliteDb;
      }
    }
    const dbPath = path.join(dbDir, 'sla_dashboard.db');
    sqliteDb = new Database(dbPath);
    initSqliteSchema(sqliteDb);
  }
  return sqliteDb;
}

function initSqliteSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      is_success INTEGER NOT NULL,
      latency_ms REAL,
      raw_latency TEXT,
      latency_unit TEXT,
      agent TEXT NOT NULL,
      region TEXT NOT NULL,
      quality_flags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(service_id, timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_checks_timestamp ON monitoring_checks(timestamp);
    CREATE INDEX IF NOT EXISTS idx_checks_service_id ON monitoring_checks(service_id);
    CREATE INDEX IF NOT EXISTS idx_checks_status_code ON monitoring_checks(status_code);

    CREATE TABLE IF NOT EXISTS upload_sessions (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      clean_rows INTEGER NOT NULL,
      duplicates_skipped INTEGER NOT NULL DEFAULT 0,
      anomalies_fixed INTEGER NOT NULL DEFAULT 0,
      quality_breakdown TEXT,
      date_range_start TEXT,
      date_range_end TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Persists cleaned check records and upload audit log into database.
 */
export async function saveCleanedRecords(
  records: CleanCheckRecord[],
  auditSummary: IngestionAuditSummary
): Promise<{ success: boolean; insertedCount: number; isCloud: boolean }> {
  if (isSupabaseConfigured && supabaseClient) {
    try {
      // 1. Batch upsert into Supabase monitoring_checks (chunk by 1,000 to respect request limits)
      const chunkSize = 1000;
      let insertedCount = 0;

      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize).map(r => ({
          service_id: r.service_id,
          service_name: r.service_name,
          timestamp: r.timestamp,
          status_code: r.status_code,
          is_success: r.is_success,
          latency_ms: r.latency_ms,
          raw_latency: r.raw_latency,
          latency_unit: r.latency_unit,
          agent: r.agent,
          region: r.region,
          quality_flags: r.quality_flags,
        }));

        const { error } = await supabaseClient
          .from('monitoring_checks')
          .upsert(chunk, { onConflict: 'service_id,timestamp' });

        if (error) {
          console.error('Supabase batch insert error:', error);
          throw error;
        }
        insertedCount += chunk.length;
      }

      // 2. Insert upload session record
      await supabaseClient.from('upload_sessions').insert({
        file_name: auditSummary.fileName,
        total_rows: auditSummary.totalRowsRead,
        clean_rows: auditSummary.cleanRowsImported,
        duplicates_skipped: auditSummary.duplicatesSkipped,
        anomalies_fixed: auditSummary.anomaliesFixed,
        quality_breakdown: auditSummary.qualityBreakdown,
        date_range_start: auditSummary.dateRangeStart,
        date_range_end: auditSummary.dateRangeEnd,
      });

      return { success: true, insertedCount, isCloud: true };
    } catch (err) {
      console.warn('Supabase write failed, falling back to local SQLite:', err);
    }
  }

  // SQLite Fallback
  const db = getSqliteDb();
  const insertCheck = db.prepare(`
    INSERT INTO monitoring_checks (
      service_id, service_name, timestamp, status_code, is_success,
      latency_ms, raw_latency, latency_unit, agent, region, quality_flags
    ) VALUES (
      @service_id, @service_name, @timestamp, @status_code, @is_success,
      @latency_ms, @raw_latency, @latency_unit, @agent, @region, @quality_flags
    ) ON CONFLICT(service_id, timestamp) DO UPDATE SET
      latency_ms = excluded.latency_ms,
      quality_flags = excluded.quality_flags
  `);

  const insertSession = db.prepare(`
    INSERT INTO upload_sessions (
      id, file_name, total_rows, clean_rows, duplicates_skipped,
      anomalies_fixed, quality_breakdown, date_range_start, date_range_end
    ) VALUES (
      @id, @file_name, @total_rows, @clean_rows, @duplicates_skipped,
      @anomalies_fixed, @quality_breakdown, @date_range_start, @date_range_end
    )
  `);

  const insertTransaction = db.transaction((rows: CleanCheckRecord[]) => {
    let count = 0;
    for (const r of rows) {
      insertCheck.run({
        service_id: r.service_id,
        service_name: r.service_name,
        timestamp: r.timestamp,
        status_code: r.status_code,
        is_success: r.is_success ? 1 : 0,
        latency_ms: r.latency_ms,
        raw_latency: r.raw_latency,
        latency_unit: r.latency_unit,
        agent: r.agent,
        region: r.region,
        quality_flags: JSON.stringify(r.quality_flags),
      });
      count++;
    }

    insertSession.run({
      id: Math.random().toString(36).substring(2, 15),
      file_name: auditSummary.fileName,
      total_rows: auditSummary.totalRowsRead,
      clean_rows: auditSummary.cleanRowsImported,
      duplicates_skipped: auditSummary.duplicatesSkipped,
      anomalies_fixed: auditSummary.anomaliesFixed,
      quality_breakdown: JSON.stringify(auditSummary.qualityBreakdown),
      date_range_start: auditSummary.dateRangeStart,
      date_range_end: auditSummary.dateRangeEnd,
    });

    return count;
  });

  const insertedCount = insertTransaction(records);
  return { success: true, insertedCount, isCloud: false };
}

/**
 * Clears existing check records for fresh dataset testing.
 */
export async function clearAllRecords(): Promise<void> {
  if (isSupabaseConfigured && supabaseClient) {
    try {
      await supabaseClient.from('monitoring_checks').delete().neq('id', 0);
      await supabaseClient.from('upload_sessions').delete().neq('file_name', '');
      return;
    } catch (err) {
      console.warn('Supabase clear failed, using local DB:', err);
    }
  }

  const db = getSqliteDb();
  db.exec('DELETE FROM monitoring_checks; DELETE FROM upload_sessions;');
}

/**
 * Queries all records matching the date filter for calculating aggregated SLA metrics.
 */
export async function getRecordsForMetrics(params?: {
  startDate?: string;
  endDate?: string;
  serviceId?: string;
}): Promise<CleanCheckRecord[]> {
  if (isSupabaseConfigured && supabaseClient) {
    try {
      let query = supabaseClient.from('monitoring_checks').select('*');

      if (params?.startDate) {
        query = query.gte('timestamp', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('timestamp', params.endDate);
      }
      if (params?.serviceId && params.serviceId !== 'ALL') {
        query = query.eq('service_id', params.serviceId);
      }

      query = query.order('timestamp', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        service_id: r.service_id,
        service_name: r.service_name,
        timestamp: r.timestamp,
        status_code: r.status_code,
        is_success: r.is_success,
        latency_ms: r.latency_ms,
        raw_latency: r.raw_latency,
        latency_unit: r.latency_unit,
        agent: r.agent,
        region: r.region,
        quality_flags: Array.isArray(r.quality_flags) ? r.quality_flags : [],
      }));
    } catch (err) {
      console.warn('Supabase query failed, using local DB:', err);
    }
  }

  // SQLite Fallback
  const db = getSqliteDb();
  let sql = 'SELECT * FROM monitoring_checks WHERE 1=1';
  const queryParams: Record<string, string | number> = {};

  if (params?.startDate) {
    sql += ' AND timestamp >= @startDate';
    queryParams.startDate = params.startDate;
  }
  if (params?.endDate) {
    sql += ' AND timestamp <= @endDate';
    queryParams.endDate = params.endDate;
  }
  if (params?.serviceId && params.serviceId !== 'ALL') {
    sql += ' AND service_id = @serviceId';
    queryParams.serviceId = params.serviceId;
  }

  sql += ' ORDER BY timestamp ASC';
  const stmt = db.prepare(sql);
  const rows = stmt.all(queryParams) as SqliteMonitoringCheckRow[];

  return rows.map(r => ({
    id: r.id,
    service_id: r.service_id,
    service_name: r.service_name,
    timestamp: r.timestamp,
    status_code: r.status_code,
    is_success: Boolean(r.is_success),
    latency_ms: r.latency_ms,
    raw_latency: r.raw_latency,
    latency_unit: r.latency_unit,
    agent: r.agent,
    region: r.region,
    quality_flags: r.quality_flags ? JSON.parse(r.quality_flags) : [],
  }));
}

/**
 * Queries paginated logs with dynamic filters.
 */
export async function getPaginatedLogs(params: LogFilterParams): Promise<PaginatedLogsResponse> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 25));
  const offset = (page - 1) * pageSize;

  if (isSupabaseConfigured && supabaseClient) {
    try {
      let query = supabaseClient.from('monitoring_checks').select('*', { count: 'exact' });

      if (params.date) {
        query = query.gte('timestamp', `${params.date}T00:00:00.000Z`).lte('timestamp', `${params.date}T23:59:59.999Z`);
      } else {
        if (params.startDate) query = query.gte('timestamp', params.startDate);
        if (params.endDate) query = query.lte('timestamp', params.endDate);
      }

      if (params.serviceId && params.serviceId !== 'ALL') {
        query = query.eq('service_id', params.serviceId);
      }

      if (params.statusFilter === 'SUCCESS') {
        query = query.eq('is_success', true);
      } else if (params.statusFilter === 'FAILED') {
        query = query.eq('is_success', false);
      } else if (params.statusFilter === '5XX') {
        query = query.gte('status_code', 500).lt('status_code', 600);
      } else if (params.statusFilter === '999') {
        query = query.eq('status_code', 999);
      }

      if (params.search) {
        query = query.or(`service_id.ilike.%${params.search}%,service_name.ilike.%${params.search}%,agent.ilike.%${params.search}%`);
      }

      query = query.order('timestamp', { ascending: false }).range(offset, offset + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      const total = count || 0;
      const logs: CleanCheckRecord[] = (data || []).map(r => ({
        id: r.id,
        service_id: r.service_id,
        service_name: r.service_name,
        timestamp: r.timestamp,
        status_code: r.status_code,
        is_success: r.is_success,
        latency_ms: r.latency_ms,
        raw_latency: r.raw_latency,
        latency_unit: r.latency_unit,
        agent: r.agent,
        region: r.region,
        quality_flags: Array.isArray(r.quality_flags) ? r.quality_flags : [],
      }));

      return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (err) {
      console.warn('Supabase logs query failed, falling back to SQLite:', err);
    }
  }

  // SQLite fallback
  const db = getSqliteDb();
  const whereClauses: string[] = ['1=1'];
  const queryParams: Record<string, string | number> = {};

  if (params.date) {
    whereClauses.push("timestamp >= @dateStart AND timestamp <= @dateEnd");
    queryParams.dateStart = `${params.date}T00:00:00.000Z`;
    queryParams.dateEnd = `${params.date}T23:59:59.999Z`;
  } else {
    if (params.startDate) {
      whereClauses.push("timestamp >= @startDate");
      queryParams.startDate = params.startDate;
    }
    if (params.endDate) {
      whereClauses.push("timestamp <= @endDate");
      queryParams.endDate = params.endDate;
    }
  }

  if (params.serviceId && params.serviceId !== 'ALL') {
    whereClauses.push("service_id = @serviceId");
    queryParams.serviceId = params.serviceId;
  }

  if (params.statusFilter === 'SUCCESS') {
    whereClauses.push("is_success = 1");
  } else if (params.statusFilter === 'FAILED') {
    whereClauses.push("is_success = 0");
  } else if (params.statusFilter === '5XX') {
    whereClauses.push("status_code >= 500 AND status_code < 600");
  } else if (params.statusFilter === '999') {
    whereClauses.push("status_code = 999");
  }

  if (params.search) {
    whereClauses.push("(service_id LIKE @search OR service_name LIKE @search OR agent LIKE @search)");
    queryParams.search = `%${params.search}%`;
  }

  const whereSql = whereClauses.join(' AND ');

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM monitoring_checks WHERE ${whereSql}`);
  const countRow = countStmt.get(queryParams) as SqliteCountRow | undefined;
  const total = countRow?.count || 0;

  const dataStmt = db.prepare(`
    SELECT * FROM monitoring_checks
    WHERE ${whereSql}
    ORDER BY timestamp DESC
    LIMIT @pageSize OFFSET @offset
  `);

  const rows = dataStmt.all({ ...queryParams, pageSize, offset }) as SqliteMonitoringCheckRow[];

  const logs: CleanCheckRecord[] = rows.map(r => ({
    id: r.id,
    service_id: r.service_id,
    service_name: r.service_name,
    timestamp: r.timestamp,
    status_code: r.status_code,
    is_success: Boolean(r.is_success),
    latency_ms: r.latency_ms,
    raw_latency: r.raw_latency,
    latency_unit: r.latency_unit,
    agent: r.agent,
    region: r.region,
    quality_flags: r.quality_flags ? JSON.parse(r.quality_flags) : [],
  }));

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Gets the latest upload audit session metadata.
 */
export async function getLatestUploadAudit(): Promise<IngestionAuditSummary | null> {
  if (isSupabaseConfigured && supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('upload_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        return {
          fileName: data.file_name,
          totalRowsRead: data.total_rows,
          cleanRowsImported: data.clean_rows,
          duplicatesSkipped: data.duplicates_skipped,
          anomaliesFixed: data.anomalies_fixed,
          dateRangeStart: data.date_range_start,
          dateRangeEnd: data.date_range_end,
          qualityBreakdown: data.quality_breakdown || {},
          servicesFound: [],
        };
      }
    } catch {
      // ignore
    }
  }

  const db = getSqliteDb();
  const row = db.prepare('SELECT * FROM upload_sessions ORDER BY created_at DESC LIMIT 1').get() as SqliteUploadSessionRow | undefined;
  if (!row) return null;

  return {
    fileName: row.file_name,
    totalRowsRead: row.total_rows,
    cleanRowsImported: row.clean_rows,
    duplicatesSkipped: row.duplicates_skipped,
    anomaliesFixed: row.anomalies_fixed,
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    qualityBreakdown: row.quality_breakdown ? JSON.parse(row.quality_breakdown) : {},
    servicesFound: [],
  };
}
