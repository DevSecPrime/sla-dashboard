import { NextRequest, NextResponse } from 'next/server';
import { getLatestUploadAudit, getRecordsForMetrics } from '@/lib/db';
import { calculateSLAMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const serviceId = searchParams.get('serviceId') || undefined;

    // Fetch records from database
    const records = await getRecordsForMetrics({ startDate, endDate, serviceId });

    // Compute SLA metrics
    const metrics = calculateSLAMetrics(records);

    // Attach latest upload audit information if available
    const latestAudit = await getLatestUploadAudit();
    metrics.audit_summary = latestAudit;

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SLA metrics' },
      { status: 500 }
    );
  }
}
