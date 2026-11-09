import { NextResponse } from 'next/server';
import {
  archiveLocalUser,
  createLocalUser,
  listArchivedLocalUsers,
  listLocalUsers,
  permanentlyDeleteLocalUser,
  restoreLocalUser,
  updateLocalUser,
  updateLocalUserStatus,
} from '@/lib/local-database';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ users: listLocalUsers(), archivedUsers: listArchivedLocalUsers() });
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  const { email, status } = payload;

  if (status !== 'Active' && status !== 'Inactive') {
    return NextResponse.json(
      { message: 'Invalid email or status.' },
      { status: 400 }
    );
  }

  if (typeof payload.id === 'string') {
    if (!String(payload.name ?? '').trim() || !String(payload.email ?? '').trim() || !String(payload.username ?? '').trim() || !String(payload.role ?? '').trim()) {
      return NextResponse.json({ message: 'Name, email, username, and role are required.' }, { status: 400 });
    }
    try {
      if (updateLocalUser(payload.id, payload)) return NextResponse.json({ success: true });
    } catch (error) {
      const message = error instanceof Error && error.message.includes('UNIQUE')
        ? 'That email or username is already registered.'
        : 'Unable to update the user account.';
      return NextResponse.json({ message }, { status: 409 });
    }
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  if (!email) return NextResponse.json({ message: 'Invalid email or status.' }, { status: 400 });
  if (updateLocalUserStatus(String(email), status)) return NextResponse.json({ success: true, status });
  return NextResponse.json({ message: 'User not found.' }, { status: 404 });
}

export async function PUT(request: Request) {
  const { userId, action } = await request.json();
  if (typeof userId !== 'string' || (action !== 'archive' && action !== 'restore')) {
    return NextResponse.json({ message: 'A valid user ID and action are required.' }, { status: 400 });
  }

  const changed = action === 'archive' ? archiveLocalUser(userId) : restoreLocalUser(userId);
  if (!changed) return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const userId = new URL(request.url).searchParams.get('id');
  if (!userId) return NextResponse.json({ message: 'A user ID is required.' }, { status: 400 });
  if (!permanentlyDeleteLocalUser(userId)) {
    return NextResponse.json({ message: 'Archived user not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const { name, email, username, password, role, status } = await request.json();
  if (!String(name ?? '').trim() || !String(email ?? '').trim() || !String(password ?? '') || !String(role ?? '').trim()) {
    return NextResponse.json({ message: 'Name, email, password, and role are required.' }, { status: 400 });
  }
  if (status !== 'Active' && status !== 'Inactive') {
    return NextResponse.json({ message: 'Invalid account status.' }, { status: 400 });
  }

  const generatedUsername = String(username ?? '').trim() || String(email).split('@')[0];
  try {
    const user = createLocalUser({ name, email, username: generatedUsername, password, role, status });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('UNIQUE')
      ? 'That email or username is already registered.'
      : 'Unable to create the user account.';
    return NextResponse.json({ message }, { status: 409 });
  }
}
