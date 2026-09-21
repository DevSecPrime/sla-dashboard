import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { cleanMonitoringData } from '@/lib/cleaner';
import { clearAllRecords, saveCleanedRecords } from '@/lib/db';
import { RawCheckRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const shouldClear = formData.get('clearExisting') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    // Parse CSV with PapaParse
    const parsed = Papa.parse<RawCheckRecord>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse CSV file', details: parsed.errors },
        { status: 400 }
      );
    }

    // Execute stateless cleaning engine
    const { cleanRecords, auditSummary } = cleanMonitoringData(parsed.data, file.name);

    if (shouldClear) {
      await clearAllRecords();
    }

    // Persist clean records into database
    const saveResult = await saveCleanedRecords(cleanRecords, auditSummary);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${cleanRecords.length} records.`,
      auditSummary,
      database: {
        isCloud: saveResult.isCloud,
        insertedCount: saveResult.insertedCount,
      },
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error processing CSV upload';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
