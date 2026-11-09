import { NextResponse } from 'next/server';
import { addActivityLog, deleteInspection, listArchivedInspections, listInspections, listRoads, permanentlyDeleteInspection, restoreInspection, saveInspection, saveRoad, syncAnnualFollowUps } from '@/lib/local-database';

export const runtime = 'nodejs';

export async function GET() {
  syncAnnualFollowUps();
  return NextResponse.json({ data: listInspections(), archived: listArchivedInspections() });
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

  const inspection = { ...payload, id: crypto.randomUUID() };
  saveInspection(inspection, road.id);
  addActivityLog({ user: String(inspection.inspector || 'system'), action: 'Inspection Created', details: `Created inspection ${inspection.id}` });

  const condition =
    Number(inspection.conditionRating) <= 0 ? 'Not rated' :
    Number(inspection.conditionRating) >= 8 ? 'Good' :
    Number(inspection.conditionRating) >= 5 ? 'Fair' : 'Poor';
  saveRoad({ ...road, condition, lastInspection: inspection.date });

  return NextResponse.json({ success: true, data: inspection });
}

function refreshRoadCondition(roadId: string) {
  const road = listRoads().find((item) => item.id === roadId);
  if (!road) return null;

  const latestInspection = listInspections()
    .filter((inspection) =>
      inspection.localRoadId === roadId &&
      inspection.isScheduledAnnualFollowUp !== true &&
      inspection.isPendingValidationInspection !== true &&
      !(inspection.isValidationInspection === true && inspection.isPendingValidationInspection !== false)
    )
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];

  const condition = latestInspection
    ? Number(latestInspection.conditionRating) <= 0
      ? 'Not rated'
      : Number(latestInspection.conditionRating) >= 8
      ? 'Good'
      : Number(latestInspection.conditionRating) >= 5
        ? 'Fair'
        : 'Poor'
    : 'Not rated';
  const updatedRoad = {
    ...road,
    condition,
    lastInspection: latestInspection?.date || '',
  };
  saveRoad(updatedRoad);

  return {
    id: roadId,
    condition: updatedRoad.condition,
    lastInspection: updatedRoad.lastInspection,
  };
}

export async function PUT(request: Request) {
  const payload = await request.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof payload.id !== 'string' ||
    !payload.id ||
    typeof payload.localRoadId !== 'string' ||
    !payload.localRoadId
  ) {
    return NextResponse.json({ message: 'A valid inspection and road ID are required.' }, { status: 400 });
  }

  const existingInspection = listInspections().find((item) => item.id === payload.id);
  if (!existingInspection) return NextResponse.json({ message: 'Inspection not found.' }, { status: 404 });

  const road = listRoads().find((item) => item.id === payload.localRoadId);
  if (!road) return NextResponse.json({ message: 'Road not found.' }, { status: 404 });

  const inspection = {
    ...existingInspection,
    ...payload,
    id: existingInspection.id,
    ...(existingInspection.isScheduledAnnualFollowUp === true ? { isScheduledAnnualFollowUp: false } : {}),
    ...(existingInspection.isPendingValidationInspection === true ? { isPendingValidationInspection: false } : {}),
  };
  saveInspection(inspection, road.id);
  addActivityLog({ user: String(inspection.inspector || 'system'), action: 'Inspection Updated', details: `Updated inspection ${inspection.id}` });

  const roadIds = new Set([String(existingInspection.localRoadId), road.id]);
  const roadUpdates = Array.from(roadIds)
    .map(refreshRoadCondition)
    .filter((update) => update !== null);

  return NextResponse.json({ success: true, data: inspection, roadUpdates });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'An inspection ID is required.' }, { status: 400 });

  const inspection = listInspections().find((item) => item.id === id);
  if (!inspection) return NextResponse.json({ message: 'Inspection not found.' }, { status: 404 });
  if (inspection.isScheduledAnnualFollowUp === true) {
    return NextResponse.json({ message: 'Automatically scheduled annual follow-up inspections cannot be deleted.' }, { status: 400 });
  }
  const permanent = new URL(request.url).searchParams.get('permanent') === 'true';
  const changed = permanent ? permanentlyDeleteInspection(id) : deleteInspection(id);
  if (!changed) return NextResponse.json({ message: 'Inspection could not be deleted.' }, { status: 500 });

  const roadUpdate = refreshRoadCondition(String(inspection.localRoadId));

  addActivityLog({ user: 'admin', action: permanent ? 'Inspection Permanently Deleted' : 'Inspection Archived', details: `${permanent ? 'Permanently deleted' : 'Archived'} inspection ${id}` });
  return NextResponse.json({ success: true, roadUpdates: roadUpdate ? [roadUpdate] : [] });
}

export async function PATCH(request: Request) {
  const { id, action } = await request.json();
  if (typeof id !== 'string' || (action !== 'restore' && action !== 'archive')) {
    return NextResponse.json({ message: 'A valid inspection ID and action are required.' }, { status: 400 });
  }
  const inspection = listInspections().find((item) => item.id === id);
  if (inspection?.isScheduledAnnualFollowUp === true) {
    return NextResponse.json({ message: 'Automatically scheduled annual follow-up inspections cannot be archived.' }, { status: 400 });
  }
  const changed = action === 'restore' ? restoreInspection(id) : deleteInspection(id);
  if (!changed) return NextResponse.json({ message: 'Inspection not found.' }, { status: 404 });
  addActivityLog({ user: 'admin', action: action === 'restore' ? 'Inspection Restored' : 'Inspection Archived', details: `${action === 'restore' ? 'Restored' : 'Archived'} inspection ${id}` });
  return NextResponse.json({ success: true });
}
