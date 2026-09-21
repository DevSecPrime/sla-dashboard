import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedLogs } from '@/lib/db';
import { LogFilterParams } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const params: LogFilterParams = {
      date: searchParams.get('date') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      serviceId: searchParams.get('serviceId') || undefined,
      statusFilter: (searchParams.get('statusFilter') as LogFilterParams['statusFilter']) || 'ALL',
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '25', 10),
    };

    const result = await getPaginatedLogs(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Logs API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
