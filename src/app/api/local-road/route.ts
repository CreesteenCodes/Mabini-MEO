import { NextResponse } from 'next/server';
import { addActivityLog, deleteRoad, listArchivedInspections, listArchivedRoads, listInspections, listRoads, permanentlyDeleteRoad, restoreRoad, saveInspection, saveRoad, syncAnnualFollowUps } from '@/lib/local-database';

export const runtime = 'nodejs';

function getValidationStartDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  if (
    date.getUTCFullYear() !== Number(yearText) ||
    date.getUTCMonth() !== Number(monthText) - 1 ||
    date.getUTCDate() !== Number(dayText)
  ) return null;
  date.setUTCDate(date.getUTCDate() - 30);
  return date;
}

export async function GET() {
  syncAnnualFollowUps();
  return NextResponse.json({ data: listRoads(), archived: listArchivedRoads() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ message: 'A road record is required.' }, { status: 400 });
  }

  const newItem = {
    ...payload,
    id: typeof payload.id === 'string' && payload.id ? payload.id : crypto.randomUUID(),
  };
  saveRoad(newItem);
  syncAnnualFollowUps();
  addActivityLog({ user: 'admin', action: 'Project Created', details: `Created project ${String(newItem.projectName || newItem.name || newItem.id)}` });

  return NextResponse.json({ success: true, data: listRoads().find((road) => road.id === newItem.id) ?? newItem });
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  if (!payload || typeof payload.id !== 'string' || !payload.id) {
    return NextResponse.json({ message: 'A road ID is required.' }, { status: 400 });
  }

  const current = listRoads().find((road) => road.id === payload.id);
  if (!current) return NextResponse.json({ message: 'Road not found.' }, { status: 404 });
  if (payload.annualValidationYear === undefined && payload.validationResult !== undefined) {
    const validationStartDate = getValidationStartDate(current.actualCompletionDate);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (!validationStartDate || today < validationStartDate.getTime()) {
      return NextResponse.json({ message: 'This project is available for validation starting 30 days before its actual completion date.' }, { status: 400 });
    }
  }
  if (
    payload.annualValidationYear === undefined &&
    payload.validationResult !== undefined &&
    (!['Validated', 'Return for Revision'].includes(payload.validationResult) ||
      typeof payload.validationRemarks !== 'string' ||
      !payload.validationRemarks.trim())
  ) {
    return NextResponse.json({ message: 'A valid validation result and remarks are required.' }, { status: 400 });
  }
  let updated = { ...current, ...payload, id: current.id };
  if (payload.annualValidationYear !== undefined) {
    if (
      !Number.isInteger(payload.annualValidationYear) ||
      !['Validated', 'Return for Revision'].includes(payload.validationResult) ||
      typeof payload.validationRemarks !== 'string' ||
      !payload.validationRemarks.trim()
    ) {
      return NextResponse.json({ message: 'A valid annual validation year and result are required.' }, { status: 400 });
    }
    const entries = Array.isArray(current.annualValidationEntries) ? current.annualValidationEntries as Array<Record<string, unknown>> : [];
    const entryIndex = entries.findIndex((entry) => entry.year === payload.annualValidationYear);
    if (entryIndex < 0) return NextResponse.json({ message: 'Annual validation entry not found.' }, { status: 404 });
    const annualValidationEntries = entries.map((entry, index) => index === entryIndex
      ? {
          ...entry,
          result: payload.validationResult,
          remarks: payload.validationRemarks.trim(),
          resolvedAt: new Date().toISOString(),
        }
      : entry
    );
    updated = { ...current, annualValidationEntries, id: current.id };
  }
  saveRoad(updated);
  let createdInspection: Record<string, unknown> & { id: string } | undefined;
  if (
    payload.annualValidationYear === undefined &&
    payload.validationResult === 'Validated' &&
    typeof current.actualCompletionDate === 'string' &&
    current.actualCompletionDate
  ) {
    const inspections = [...listInspections(), ...listArchivedInspections()];
    const hasValidationInspection = inspections.some((inspection) =>
      inspection.localRoadId === current.id && inspection.isValidationInspection === true
    );
    if (!hasValidationInspection) {
      createdInspection = {
        id: `validation-inspection-${current.id}`,
        localRoadId: current.id,
        localRoadName: String(current.name || current.projectName || current.roadName || ''),
        projectName: String(current.projectName || current.name || ''),
        projectCategory: String(current.projectCategory || current.type || ''),
        location: String(current.location || ''),
        date: current.actualCompletionDate,
        conditionRating: 0,
        conditionRatings: {
          Concrete: 'N/A',
          Asphalt: 'N/A',
          Gravel: 'N/A',
          Earth: 'N/A',
          Shoulder: 'N/A',
          'Side Drain': 'N/A',
          Sidewalk: 'N/A',
        },
        remarks: '',
        inspector: '',
        inspectionType: 'Acceptance Inspection',
        validationStatus: 'Validated',
        isAnnualFollowUp: false,
        isScheduledAnnualFollowUp: false,
        isValidationInspection: true,
        isPendingValidationInspection: true,
      };
      saveInspection(createdInspection, current.id);
    }
  }
  syncAnnualFollowUps();
  addActivityLog({ user: 'admin', action: 'Project Updated', details: `Updated project ${String(updated.projectName || updated.name || updated.id)}` });
  return NextResponse.json({
    success: true,
    data: listRoads().find((road) => road.id === updated.id) ?? updated,
    ...(createdInspection ? { inspection: createdInspection } : {}),
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'A road ID is required.' }, { status: 400 });
  const permanent = new URL(request.url).searchParams.get('permanent') === 'true';
  const changed = permanent ? permanentlyDeleteRoad(id) : deleteRoad(id);
  if (!changed) return NextResponse.json({ message: 'Road not found.' }, { status: 404 });
  addActivityLog({ user: 'admin', action: permanent ? 'Project Permanently Deleted' : 'Project Archived', details: `${permanent ? 'Permanently deleted' : 'Archived'} project ${id}` });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const { id, action } = await request.json();
  if (typeof id !== 'string' || (action !== 'restore' && action !== 'archive')) {
    return NextResponse.json({ message: 'A valid road ID and action are required.' }, { status: 400 });
  }
  const changed = action === 'restore' ? restoreRoad(id) : deleteRoad(id);
  if (!changed) return NextResponse.json({ message: 'Road not found.' }, { status: 404 });
  addActivityLog({ user: 'admin', action: action === 'restore' ? 'Project Restored' : 'Project Archived', details: `${action === 'restore' ? 'Restored' : 'Archived'} project ${id}` });
  return NextResponse.json({ success: true });
}
