import { NextResponse } from 'next/server';
import {
  listMaintenanceRecords,
  listRoads,
  deleteMaintenanceRecord,
  addActivityLog,
  listArchivedMaintenanceRecords,
  permanentlyDeleteMaintenanceRecord,
  restoreMaintenanceRecord,
  saveMaintenanceRecord,
} from '@/lib/local-database';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ data: listMaintenanceRecords(), archived: listArchivedMaintenanceRecords() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof payload.localRoadId !== 'string' ||
    !payload.localRoadId
  ) {
    return NextResponse.json({ message: 'A valid road ID is required.' }, { status: 400 });
  }

  const road = listRoads().find((item) => item.id === payload.localRoadId);
  if (!road) return NextResponse.json({ message: 'Road not found.' }, { status: 404 });

  const record = { ...payload, id: crypto.randomUUID() };
  saveMaintenanceRecord(record, road.id);
  addActivityLog({ user: 'admin', action: 'Maintenance Created', details: `Created maintenance record ${record.id}` });
  return NextResponse.json({ success: true, data: record });
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  if (!payload || typeof payload.id !== 'string' || !payload.id) {
    return NextResponse.json({ message: 'A valid maintenance record ID is required.' }, { status: 400 });
  }

  const record = listMaintenanceRecords().find((item) => item.id === payload.id);
  if (!record) return NextResponse.json({ message: 'Maintenance record not found.' }, { status: 404 });

  const isStatusOnlyUpdate =
    payload.status !== undefined &&
    payload.localRoadId === undefined &&
    payload.type === undefined &&
    payload.scheduledDate === undefined &&
    payload.description === undefined &&
    payload.cost === undefined;

  if (isStatusOnlyUpdate) {
    if (!['Scheduled', 'In Progress', 'Completed', 'Deferred'].includes(payload.status)) {
      return NextResponse.json({ message: 'A valid maintenance status is required.' }, { status: 400 });
    }
    const updated = {
      ...record,
      status: payload.status,
      ...(payload.completedDate !== undefined ? { completedDate: payload.completedDate } : {}),
    };
    saveMaintenanceRecord(updated, String(record.localRoadId));
      addActivityLog({ user: 'admin', action: 'Maintenance Updated', details: `Updated maintenance record ${updated.id}` });
    return NextResponse.json({ success: true, data: updated });
  }

  if (
    typeof payload.localRoadId !== 'string' ||
    typeof payload.type !== 'string' ||
    typeof payload.scheduledDate !== 'string' ||
    typeof payload.description !== 'string' ||
    !Number.isFinite(Number(payload.cost))
  ) {
    return NextResponse.json({ message: 'Valid maintenance details are required.' }, { status: 400 });
  }

  const road = listRoads().find((item) => item.id === payload.localRoadId);
  if (!road) return NextResponse.json({ message: 'Road not found.' }, { status: 404 });

  const updated = {
    ...record,
    localRoadId: road.id,
    localRoadName: String(road.name || road.roadName || ''),
    type: payload.type,
    scheduledDate: payload.scheduledDate,
    status: record.status === 'Deferred' && payload.scheduledDate !== record.scheduledDate
      ? 'Scheduled'
      : record.status,
    cost: Number(payload.cost),
    description: payload.description,
  };
  saveMaintenanceRecord(updated, road.id);
  addActivityLog({ user: 'admin', action: 'Maintenance Updated', details: `Updated maintenance record ${updated.id}` });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request) {
  const payload = await request.json();
  if (!payload || typeof payload.id !== 'string' || !payload.id) {
    return NextResponse.json({ message: 'A valid maintenance record ID is required.' }, { status: 400 });
  }

  const permanent = new URL(request.url).searchParams.get('permanent') === 'true';
  const changed = permanent ? permanentlyDeleteMaintenanceRecord(payload.id) : deleteMaintenanceRecord(payload.id);
  if (!changed) {
    return NextResponse.json({ message: 'Maintenance record not found.' }, { status: 404 });
  }
  addActivityLog({ user: 'admin', action: permanent ? 'Maintenance Permanently Deleted' : 'Maintenance Archived', details: `${permanent ? 'Permanently deleted' : 'Archived'} maintenance record ${payload.id}` });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const { id, action } = await request.json();
  if (typeof id !== 'string' || (action !== 'restore' && action !== 'archive')) {
    return NextResponse.json({ message: 'A valid maintenance ID and action are required.' }, { status: 400 });
  }
  const changed = action === 'restore' ? restoreMaintenanceRecord(id) : deleteMaintenanceRecord(id);
  if (!changed) return NextResponse.json({ message: 'Maintenance record not found.' }, { status: 404 });
  addActivityLog({ user: 'admin', action: action === 'restore' ? 'Maintenance Restored' : 'Maintenance Archived', details: `${action === 'restore' ? 'Restored' : 'Archived'} maintenance record ${id}` });
  return NextResponse.json({ success: true });
}
