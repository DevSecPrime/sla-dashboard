import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { cleanMonitoringData } from '@/lib/cleaner';
import { clearAllRecords, saveCleanedRecords } from '@/lib/db';
import { RawCheckRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SAMPLES = [
  { id: '9d', name: '9-Day Dataset (Seed 101)', file: 'monitoring_checks_9d_seed101.csv' },
  { id: '12d', name: '12-Day Dataset (Seed 505)', file: 'monitoring_checks_12d_seed505.csv' },
  { id: '14d', name: '14-Day Dataset (Seed 202)', file: 'monitoring_checks_14d_seed202.csv' },
  { id: '21d', name: '21-Day Dataset (Seed 303)', file: 'monitoring_checks_21d_seed303.csv' },
  { id: '30d', name: '30-Day Dataset (Seed 404)', file: 'monitoring_checks_30d_seed404.csv' },
];

export async function GET() {
  return NextResponse.json({ samples: SAMPLES });
}

export async function POST(req: NextRequest) {
  try {
    const { sampleId, clearExisting = true } = await req.json();
    const sample = SAMPLES.find(s => s.id === sampleId);

    if (!sample) {
      return NextResponse.json({ error: 'Sample dataset not found' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'docs', 'assignment-docs', sample.file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File ${sample.file} not found on server` }, { status: 404 });
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    const parsed = Papa.parse<RawCheckRecord>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    const { cleanRecords, auditSummary } = cleanMonitoringData(parsed.data, sample.file);

    if (clearExisting) {
      await clearAllRecords();
    }

    const saveResult = await saveCleanedRecords(cleanRecords, auditSummary);

    return NextResponse.json({
      success: true,
      message: `Loaded ${sample.name} (${cleanRecords.length} clean checks imported).`,
      auditSummary,
      database: {
        isCloud: saveResult.isCloud,
        insertedCount: saveResult.insertedCount,
      },
    });
  } catch (error: any) {
    console.error('Sample loader error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load sample dataset' },
      { status: 500 }
    );
  }
}
