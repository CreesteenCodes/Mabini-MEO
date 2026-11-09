interface ActivityLogEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
}

export async function recordClientActivity(user: string, action: string, details: string): Promise<void> {
  const response = await fetch('/api/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, action, details }),
  });
  const payload = await response.json();

  if (!response.ok || !payload.log) {
    throw new Error(payload?.message || 'Unable to record activity.');
  }

  window.dispatchEvent(new CustomEvent<ActivityLogEntry>('activity-log-created', { detail: payload.log }));
}
