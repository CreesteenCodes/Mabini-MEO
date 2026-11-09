import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Plus, Edit, Trash2, Shield, X, Save, Users, Activity, Archive, Search, Lock, Unlock, CheckCircle2, Award, UserX, ChevronDown, KeyRound, Eye, EyeOff, CalendarDays, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface UserData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Locked';
  createdDate: string;
}

interface UserRecordFromApi {
  userId: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: 'Active' | 'Inactive';
  createdDate?: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
}

interface ArchivedRecord {
  id: string;
  projectName?: string;
  name?: string;
  roadName?: string;
  localRoadName?: string;
  type?: string;
  location?: string;
  projectCategory?: string;
  date?: string;
  inspectionType?: string;
  inspector?: string;
  validationStatus?: string;
  conditionRating?: number;
  remarks?: string;
  scheduledDate?: string;
  completedDate?: string;
  status?: string;
  cost?: number;
  description?: string;
}

const AVAILABLE_ROLES = ['Admin', 'Encoder', 'Validator', 'Inspector'] as const;

const getRoleDisplayName = (role: string) => {
  const displayNames: Record<string, string> = {
    Admin: 'Head Engineer',
    Encoder: 'Staff - Encoder',
    Inspector: 'Staff - Inspector',
    Validator: 'Staff - Validator',
  };

  return displayNames[role] ?? role;
};

const getNextEmployeeId = (userList: UserData[]) => {
  const ids = userList
    .map(user => Number.parseInt(user.employeeId.replace(/\D+/g, ''), 10))
    .filter(value => Number.isFinite(value));

  const nextNumber = ids.length ? Math.max(...ids) + 1 : 1;
  return `EMP-${String(nextNumber).padStart(4, '0')}`;
};

const mapUserRecords = (records: UserRecordFromApi[]): UserData[] => records.map((user, index) => ({
  id: user.userId,
  employeeId: `EMP-${String(index + 1).padStart(4, '0')}`,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  status: user.status,
  createdDate: user.createdDate || new Date().toISOString().split('T')[0],
}));

export function UserManagementModule({ currentUserEmail }: { currentUserEmail: string }) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'activity' | 'archived'>('accounts');
  const [archiveFilter, setArchiveFilter] = useState<'users' | 'projects' | 'inspections' | 'maintenance'>('users');
  const [activityDateFilter, setActivityDateFilter] = useState('');
  const [activityUserFilter, setActivityUserFilter] = useState('All Users');
  const [activeUserFormTab, setActiveUserFormTab] = useState<'account' | 'access'>('account');
  const userFormScrollRef = useRef<HTMLDivElement>(null);
  const userAccountSectionRef = useRef<HTMLElement>(null);
  const userAccessSectionRef = useRef<HTMLElement>(null);
  const [users, setUsers] = useState<UserData[]>([
    {
      id: '1',
      employeeId: 'EMP-0001',
      name: 'Admin User',
      email: 'admin@municipal.gov',
      username: 'admin',
      role: 'Head Engineer',
      status: 'Active',
      createdDate: '2026-01-15',
    },
    {
      id: '2',
      employeeId: 'EMP-0002',
      name: 'John Encoder',
      email: 'john.encoder@municipal.gov',
      username: 'encoder',
      role: 'Staff - Encoder',
      status: 'Active',
      createdDate: '2026-02-10',
    },
    {
      id: '3',
      employeeId: 'EMP-0003',
      name: 'Peter Inspector',
      email: 'peter.inspector@municipal.gov',
      username: 'inspector',
      role: 'Staff - Inspector',
      status: 'Active',
      createdDate: '2026-03-05',
    },
    {
      id: '4',
      employeeId: 'EMP-0004',
      name: 'Maria Validator',
      email: 'maria.validator@municipal.gov',
      username: 'validator',
      role: 'Staff - Validator',
      status: 'Active',
      createdDate: '2026-03-20',
    },
  ]);

  const [archivedUsers, setArchivedUsers] = useState<UserData[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<ArchivedRecord[]>([]);
  const [archivedInspections, setArchivedInspections] = useState<ArchivedRecord[]>([]);
  const [archivedMaintenance, setArchivedMaintenance] = useState<ArchivedRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    {
      id: '1',
      user: 'admin',
      action: 'User Created',
      timestamp: '2026-08-30 10:30:00',
      details: 'Created user John Encoder',
    },
    {
      id: '2',
      user: 'admin',
      action: 'Role Updated',
      timestamp: '2026-08-30 09:15:00',
      details: 'Changed Peter Inspector role to Inspector',
    },
    {
      id: '3',
      user: 'admin',
      action: 'User Activated',
      timestamp: '2026-08-29 14:45:00',
      details: 'Activated Maria Validator account',
    },
    {
      id: '4',
      user: 'admin',
      action: 'System Configuration',
      timestamp: '2026-08-29 11:20:00',
      details: 'Updated system settings',
    },
  ]);

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const generatedEmployeeId = getNextEmployeeId(users);
  const moveToUserFormTab = (tab: 'account' | 'access') => {
    const sectionRef = tab === 'account' ? userAccountSectionRef : userAccessSectionRef;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveUserFormTab(tab);
  };
  const updateActiveUserFormTab = () => {
    const scrollTop = userFormScrollRef.current?.getBoundingClientRect().top ?? 0;
    const accessTop = userAccessSectionRef.current?.getBoundingClientRect().top ?? Infinity;
    setActiveUserFormTab(accessTop <= scrollTop + 110 ? 'access' : 'account');
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'Admin',
    status: 'Active' as UserData['status'],
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [lockedUsers, setLockedUsers] = useState<Record<string, number>>({});
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'confirmation' | 'message' | 'error';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'message',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetch('/api/auth/status')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Unable to load local user accounts.');
        if (!Array.isArray(payload.users)) throw new Error('Local user account data is invalid.');
        setUsers(mapUserRecords(payload.users));
        if (!Array.isArray(payload.archivedUsers)) throw new Error('Archived user data is invalid.');
        setArchivedUsers(mapUserRecords(payload.archivedUsers));
      })
      .catch((error: unknown) => {
        console.error('Failed to load local user accounts.', error);
        setDialog({
          isOpen: true,
          type: 'error',
          title: 'Accounts Unavailable',
          message: error instanceof Error ? error.message : 'Unable to load local user accounts.',
        });
      });
  }, []);

  useEffect(() => {
    Promise.all([fetch('/api/activity-logs'), fetch('/api/local-road'), fetch('/api/inspections'), fetch('/api/maintenance')])
      .then(async ([logsResponse, roadsResponse, inspectionsResponse, maintenanceResponse]) => {
        const logsPayload = await logsResponse.json();
        const roadsPayload = await roadsResponse.json();
        const inspectionsPayload = await inspectionsResponse.json();
        const maintenancePayload = await maintenanceResponse.json();
        if (logsResponse.ok && Array.isArray(logsPayload.logs)) setActivityLogs(logsPayload.logs);
        if (roadsResponse.ok && Array.isArray(roadsPayload.archived)) setArchivedRecords(roadsPayload.archived);
        if (inspectionsResponse.ok && Array.isArray(inspectionsPayload.archived)) setArchivedInspections(inspectionsPayload.archived);
        if (maintenanceResponse.ok && Array.isArray(maintenancePayload.archived)) setArchivedMaintenance(maintenancePayload.archived);
      })
      .catch((error) => console.error('Failed to load activity logs and archived records.', error));
  }, []);

  useEffect(() => {
    const handleActivityLogCreated = (event: Event) => {
      const log = (event as CustomEvent<ActivityLog>).detail;
      if (log?.id) setActivityLogs((previous) => [log, ...previous.filter((entry) => entry.id !== log.id)]);
    };

    window.addEventListener('activity-log-created', handleActivityLogCreated);
    return () => window.removeEventListener('activity-log-created', handleActivityLogCreated);
  }, []);

  const refreshArchivedRecords = async () => {
    const responses = await Promise.all([fetch('/api/local-road'), fetch('/api/inspections'), fetch('/api/maintenance')]);
    const payloads = await Promise.all(responses.map((response) => response.json()));
    if (responses[0].ok && Array.isArray(payloads[0].archived)) setArchivedRecords(payloads[0].archived);
    if (responses[1].ok && Array.isArray(payloads[1].archived)) setArchivedInspections(payloads[1].archived);
    if (responses[2].ok && Array.isArray(payloads[2].archived)) setArchivedMaintenance(payloads[2].archived);
  };

  const refreshUserAccounts = async () => {
    const response = await fetch('/api/auth/status');
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.users) || !Array.isArray(payload.archivedUsers)) {
      throw new Error(payload?.message || 'Unable to refresh user accounts.');
    }
    setUsers(mapUserRecords(payload.users));
    setArchivedUsers(mapUserRecords(payload.archivedUsers));
  };

  const handleRestoreRecord = async (id: string) => {
    const response = await fetch('/api/local-road', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'restore' }),
    });
    if (!response.ok) {
      setDialog({ isOpen: true, type: 'error', title: 'Restore Failed', message: 'Unable to restore the archived record.' });
      return;
    }
    await refreshArchivedRecords();
    window.dispatchEvent(new Event('local-road-records-changed'));
  };

  const handleDeleteRecord = async (id: string) => {
    const response = await fetch(`/api/local-road?id=${encodeURIComponent(id)}&permanent=true`, { method: 'DELETE' });
    if (!response.ok) {
      setDialog({ isOpen: true, type: 'error', title: 'Delete Failed', message: 'Unable to permanently delete the archived record.' });
      return;
    }
    await refreshArchivedRecords();
    window.dispatchEvent(new Event('local-road-records-changed'));
  };

  const refreshLockStatus = async () => {
    try {
      const res = await fetch('/api/auth/lock-status');
      const payload = await res.json();
      setLockedUsers(payload?.locked ?? {});
    } catch {
      setLockedUsers({});
    }
  };

  useEffect(() => {
    refreshLockStatus();

    const interval = window.setInterval(() => {
      refreshLockStatus();
    }, 1000);

    const handleFocus = () => refreshLockStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab]);

  const roleColors: Record<string, string> = {
    'Head Engineer': 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    'Staff - Encoder': 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    'Staff - Inspector': 'bg-[#38bdf8]/10 text-[#38bdf8]',
    'Staff - Validator': 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
    Admin: 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    Encoder: 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    Inspector: 'bg-[#38bdf8]/10 text-[#38bdf8]',
    Validator: 'bg-[#7dd3fc]/10 text-[#7dd3fc]',
  };

  const activityAccounts = [...users, ...archivedUsers];
  const archivedItemCount =
    archivedUsers.length +
    archivedRecords.length +
    archivedInspections.length +
    archivedMaintenance.length;
  const getAccountRole = (role: string) => role.replace(/^Staff\s*-\s*/i, '').toLowerCase();
  const activityRoleGroups = [
    { role: 'Admin', accounts: activityAccounts.filter((user) => ['admin', 'head engineer'].includes(user.role.toLowerCase())) },
    { role: 'Encoder', accounts: activityAccounts.filter((user) => getAccountRole(user.role) === 'encoder') },
    { role: 'Inspector', accounts: activityAccounts.filter((user) => getAccountRole(user.role) === 'inspector') },
    { role: 'Validator', accounts: activityAccounts.filter((user) => getAccountRole(user.role) === 'validator') },
  ];
  const selectedActivityAccount = activityAccounts.find((user) => user.id === activityUserFilter);
  const filteredActivityLogs = activityLogs.filter((log) => {
    if (activityUserFilter !== 'All Users') {
      if (!selectedActivityAccount) return false;
      const logUser = log.user.toLowerCase();
      if (![selectedActivityAccount.username, selectedActivityAccount.name, selectedActivityAccount.email]
        .some((identity) => identity.toLowerCase() === logUser)) return false;
    }
    if (!activityDateFilter) return true;

    const timestamp = new Date(log.timestamp);
    if (Number.isNaN(timestamp.getTime())) return false;
    const localDate = [
      timestamp.getFullYear(),
      String(timestamp.getMonth() + 1).padStart(2, '0'),
      String(timestamp.getDate()).padStart(2, '0'),
    ].join('-');
    return localDate === activityDateFilter;
  });

  const handleAddUser = () => {
    const username = formData.username || formData.email.split('@')[0] || generatedEmployeeId.toLowerCase();
    if (!formData.name || !formData.email || !formData.password) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields',
      });
      return;
    }

    fetch('/api/auth/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, username }),
    }).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to create the user account.');
      const user = payload.user;
      setUsers(previous => [...previous, {
        id: user.userId,
        employeeId: generatedEmployeeId,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        createdDate: new Date().toISOString().split('T')[0],
      }]);
      void recordActivity('User Created', `Created user ${user.name}`);
      handleClose();
    }).catch(error => {
      setDialog({ isOpen: true, type: 'error', title: 'Create Account Failed', message: error instanceof Error ? error.message : 'Unable to create the user account.' });
    });
  };

  const handleEditUser = (user: UserData) => {
    setActiveUserFormTab('account');
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      status: user.status,
    });
    setShowAddForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch('/api/auth/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingUser.id, ...formData }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to update the user account.');
      await refreshUserAccounts();
      void recordActivity('User Updated', `Updated user ${formData.name}`);
    } catch (error) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Unable to update the user account.',
      });
      return;
    }

    setEditingUser(null);
    setFormData({ name: '', email: '', username: '', password: '', role: 'Encoder', status: 'Active' });
    setShowAddForm(false);
  };

  const handleArchiveUser = (id: string) => {
    const userToArchive = users.find(user => user.id === id);
    if (!userToArchive) return;
    if (userToArchive.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Cannot Archive Account',
        message: 'You cannot archive your own account while signed in.',
      });
      return;
    }

    setDialog({
      isOpen: true,
      type: 'confirmation',
      title: 'Archive User',
      message: `Are you sure you want to archive ${userToArchive.name}?`,
      onConfirm: async () => {
        try {
          const response = await fetch('/api/auth/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id, action: 'archive' }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.message || 'Unable to archive the user.');
          await refreshUserAccounts();
        } catch (error) {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Archive Failed',
            message: error instanceof Error ? error.message : 'Unable to archive the user.',
          });
          return;
        }
        setActivityLogs(prev => [...prev, {
          id: Date.now().toString(),
          user: 'admin',
          action: 'User Archived',
          timestamp: new Date().toLocaleString(),
          details: `Archived user ${userToArchive.name}`,
        }]);
        void recordActivity('User Archived', `Archived user ${userToArchive.name}`);
      },
    });
  };

  const handleToggleStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const activeAdmins = users.filter(u => u.status === 'Active' && u.role === 'Head Engineer');
    if (user.status === 'Active' && user.role === 'Head Engineer' && activeAdmins.length <= 1) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Cannot Deactivate',
        message: 'Cannot deactivate the last active Head Engineer.',
      });
      return;
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const prevUsers = users;

    setUsers(users.map(u =>
      u.id === id ? { ...u, status: newStatus } : u
    ));

    try {
      const res = await fetch('/api/auth/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, status: newStatus }),
      });

      if (!res.ok) {
        setUsers(prevUsers);
        setDialog({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update status. Please try again.',
        });
        return;
      }
    } catch {
      setUsers(prevUsers);
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update status. Please try again.',
      });
      return;
    }

    setActivityLogs([...activityLogs, {
      id: Date.now().toString(),
      user: 'admin',
      action: newStatus === 'Active' ? 'User Activated' : 'User Deactivated',
      timestamp: new Date().toLocaleString(),
      details: `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} user ${user.name}`,
    }]);
    void recordActivity(newStatus === 'Active' ? 'User Activated' : 'User Deactivated', `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} user ${user.name}`);
  };

  const handleUnlock = async (user: UserData) => {
    setDialog({
      isOpen: true,
      type: 'confirmation',
      title: 'Confirm Unlock',
      message: `Are you sure you want to unlock ${user.name}?`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/auth/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username }),
          });

          const payload = await res.json();

          if (!res.ok) {
            setDialog({
              isOpen: true,
              type: 'error',
              title: 'Unlock Failed',
              message: payload?.message || 'Failed to unlock account.',
            });
            return;
          }

          const next = { ...lockedUsers };
          delete next[user.username.toLowerCase()];
          setLockedUsers(next);
          await refreshLockStatus();

          setDialog({
            isOpen: true,
            type: 'message',
            title: 'Success',
            message: payload?.message || 'Account unlocked.',
          });

          setActivityLogs([...activityLogs, {
            id: Date.now().toString(),
            user: 'admin',
            action: 'Account Unlocked',
            timestamp: new Date().toLocaleString(),
            details: `Unlocked account for ${user.name}`,
          }]);
        } catch {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Unlock Failed',
            message: 'Failed to unlock account. Please try again.',
          });
        }
      },
      onCancel: () => {
        setDialog({ isOpen: false, type: 'message', title: '', message: '' });
      },
    });
  };

  const handleRestoreUser = async (id: string) => {
    const userToRestore = archivedUsers.find(user => user.id === id);
    if (!userToRestore) return;

    try {
      const response = await fetch('/api/auth/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, action: 'restore' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to restore the archived user.');
      await refreshUserAccounts();
      setActivityLogs(prev => [...prev, {
        id: Date.now().toString(),
        user: 'admin',
        action: 'User Restored',
        timestamp: new Date().toLocaleString(),
        details: `Restored user ${userToRestore.name}`,
      }]);
      void recordActivity('User Restored', `Restored user ${userToRestore.name}`);
    } catch (error) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Restore Failed',
        message: error instanceof Error ? error.message : 'Unable to restore the archived user.',
      });
    }
  };

  const handleDeleteArchivedUser = (id: string) => {
    const archivedUser = archivedUsers.find(user => user.id === id);
    if (!archivedUser) return;

    setDialog({
      isOpen: true,
      type: 'confirmation',
      title: 'Delete Archived User',
      message: `Are you sure you want to permanently delete ${archivedUser.name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/auth/status?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.message || 'Unable to permanently delete the archived user.');
          await refreshUserAccounts();
        } catch (error) {
          setDialog({
            isOpen: true,
            type: 'error',
            title: 'Delete Failed',
            message: error instanceof Error ? error.message : 'Unable to permanently delete the archived user.',
          });
          return;
        }
        setActivityLogs(prev => [...prev, {
          id: Date.now().toString(),
          user: 'admin',
          action: 'User Deleted Permanently',
          timestamp: new Date().toLocaleString(),
          details: `Permanently deleted archived user ${archivedUser.name}`,
        }]);
        void recordActivity('User Deleted Permanently', `Permanently deleted archived user ${archivedUser.name}`);
        setDialog({ isOpen: false, type: 'message', title: '', message: '' });
      },
      onCancel: () => {
        setDialog({ isOpen: false, type: 'message', title: '', message: '' });
      },
    });
  };

  const handlePasswordUpdate = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all password fields.',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'New password and confirmation do not match.',
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/unlock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setDialog({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: payload?.message || 'Failed to update master password.',
        });
        return;
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setDialog({
        isOpen: true,
        type: 'message',
        title: 'Success',
        message: payload?.message || 'Master password updated successfully.',
      });
    } catch {
      setDialog({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update master password. Please try again.',
      });
    }
  };

  const handleClose = () => {
    setShowAddForm(false);
    setShowPasswordForm(false);
    setActiveUserFormTab('account');
    setEditingUser(null);
    setFormData({ name: '', email: '', username: '', password: '', role: 'Encoder', status: 'Active' });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    const searchable = [
      user.employeeId,
      user.name,
      user.email,
      user.username,
      user.role,
      user.status,
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(term);
  });

  const recordActivity = async (action: string, details: string) => {
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'admin', action, details }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.log) setActivityLogs((previous) => [payload.log, ...previous]);
    } catch (error) {
      console.error('Failed to record activity log.', error);
    }
  };

  return (
    <div className="min-h-full space-y-6 bg-[#F4F7FB] p-6 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-blue-700">System Management</h1>
          <p className="mt-1 text-base text-slate-500">Personnel accounts, security access privileges, and system activity logs.</p>
        </div>
        {activeTab === 'accounts' && (
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingUser(null); setShowUserPassword(false); setFormData({ name: '', email: '', username: '', password: '', role: 'Encoder', status: 'Active' }); setActiveUserFormTab('account'); setShowAddForm(true); }} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 font-semibold text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] transition hover:brightness-105">
              <Plus className="w-5 h-5" />
              Create User Account
            </button>
            <button onClick={() => setShowPasswordForm(true)} className="flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-800">
              <Shield className="w-5 h-5" />
              Change Master Password
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 rounded-t-2xl px-6 py-4 font-semibold transition-colors ${
              activeTab === 'accounts'
                ? 'border-b-2 border-blue-600 bg-white text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Accounts
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700">{users.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 rounded-t-2xl px-6 py-4 font-semibold transition-colors ${
              activeTab === 'activity'
                ? 'border-b-2 border-blue-600 bg-white text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-5 h-5" />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex items-center gap-2 rounded-t-2xl px-6 py-4 font-semibold transition-colors ${
              activeTab === 'archived'
                ? 'border-b-2 border-blue-600 bg-white text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Archive className="w-5 h-5" />
            Archived ({archivedItemCount})
          </button>
        </div>
      </div>

      {/* Statistics */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-4xl font-bold text-blue-600">{users.length}</p><p className="mt-2 text-base text-slate-600">Total Users</p></div>
              <span className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-600"><Users className="h-6 w-6" /></span>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-4xl font-bold text-emerald-600">{users.filter(u => u.status === 'Active').length}</p><p className="mt-2 text-base text-slate-600">Active Users</p></div>
              <span className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></span>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-4xl font-bold text-indigo-600">{users.filter(u => u.role === 'Head Engineer').length}</p><p className="mt-2 text-base text-slate-600">Head Engineers</p></div>
              <span className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-600"><Award className="h-6 w-6" /></span>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-4xl font-bold text-slate-400">{users.filter(u => u.status === 'Inactive').length}</p><p className="mt-2 text-base text-slate-600">Inactive Users</p></div>
              <span className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-400"><UserX className="h-6 w-6" /></span>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <h2 className="text-xl font-bold text-slate-900">All Users <span className="ml-2 text-sm font-medium text-slate-400">({users.length} active records)</span></h2>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee ID, name, email, or role..."
                  className="h-[46px] w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button type="button" className="flex items-center justify-between gap-8 rounded-2xl border border-slate-200 px-5 py-3 text-left font-medium text-slate-700">All Roles <ChevronDown className="h-4 w-4 text-slate-400" /></button>
              <button type="button" className="flex items-center justify-between gap-8 rounded-2xl border border-slate-200 px-5 py-3 text-left font-medium text-slate-700">All Status <ChevronDown className="h-4 w-4 text-slate-400" /></button>
            </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{user.employeeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-[#0ea5e9]">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold leading-5 text-blue-700 opacity-100">{getRoleDisplayName(user.role)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          title={user.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer ${
                            user.status === 'Active' ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.status}
                        </button>
                        {lockedUsers[user.username.toLowerCase()] && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-500">
                            <Lock className="w-3 h-3" />Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {lockedUsers[user.username.toLowerCase()] && user.role !== 'Admin' && (
                          <button onClick={() => handleUnlock(user)} title="Unlock this account" className="text-green-500 hover:text-green-700 p-1" aria-label={`Unlock ${user.name}`}>
                            <Unlock className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => handleEditUser(user)} className="text-[#0ea5e9] hover:text-[#0284c7] p-1">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleArchiveUser(user.id)}
                          disabled={user.email.toLowerCase() === currentUserEmail.toLowerCase()}
                          title={user.email.toLowerCase() === currentUserEmail.toLowerCase() ? 'You cannot archive your own account' : 'Archive this account'}
                          aria-label={user.email.toLowerCase() === currentUserEmail.toLowerCase() ? 'Cannot archive your own account' : `Archive ${user.name}`}
                          className="p-1 text-slate-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Archive className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-b-lg shadow-lg p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#0ea5e9]">Activity Logs</h2>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Filter by user"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <User aria-hidden="true" className="h-4 w-4 text-slate-600" />
                    <span>Filter by User: {selectedActivityAccount?.name ?? 'All Users'}</span>
                    <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  className="z-[100] min-w-[190px] rounded-xl border border-blue-100 bg-white p-1.5 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                >
                  <DropdownMenuItem
                    onSelect={() => setActivityUserFilter('All Users')}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm focus:bg-blue-50 focus:text-blue-700"
                  >
                    <span className="flex-1">All Users</span>
                    {activityUserFilter === 'All Users' && <Check aria-hidden="true" className="h-4 w-4 text-blue-600" />}
                  </DropdownMenuItem>
                  {activityRoleGroups.map(({ role, accounts }) => (
                    <DropdownMenuSub key={role}>
                      <DropdownMenuSubTrigger className="cursor-pointer rounded-lg px-3 py-2 text-sm focus:bg-blue-50 focus:text-blue-700 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-700">
                        {role}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="z-[101] min-w-[210px] rounded-xl border border-blue-100 bg-white p-1.5 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                        {accounts.length ? accounts.map((user) => (
                          <DropdownMenuItem
                            key={user.id}
                            onSelect={() => setActivityUserFilter(user.id)}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm focus:bg-blue-50 focus:text-blue-700"
                          >
                            <span className="flex-1">{user.name}</span>
                            {activityUserFilter === user.id && <Check aria-hidden="true" className="h-4 w-4 text-blue-600" />}
                          </DropdownMenuItem>
                        )) : (
                          <div className="px-3 py-2 text-sm text-slate-400">No {role.toLowerCase()} accounts</div>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <label className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-blue-600" />
                <span className="sr-only">Filter activity logs by date</span>
                <input
                  type="date"
                  value={activityDateFilter}
                  onChange={(event) => setActivityDateFilter(event.target.value)}
                  aria-label="Filter activity logs by date"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {activityDateFilter && (
                <button
                  type="button"
                  onClick={() => setActivityDateFilter('')}
                  className="text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-[#0ea5e9]">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.timestamp}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.details}</td>
                  </tr>
                ))}
                {filteredActivityLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      {activityDateFilter || activityUserFilter !== 'All Users'
                        ? 'No activity logs match the selected filters.'
                        : 'No activity logs available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archived Users Tab */}
      {activeTab === 'archived' && (
        <div className="bg-white rounded-b-lg shadow-lg p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-[#0ea5e9]">Archived Records</h2>
            <div className="flex items-center gap-3">
              <label htmlFor="archived-record-filter" className="text-sm font-medium text-slate-600">Filter</label>
              <Select value={archiveFilter} onValueChange={(value: 'users' | 'projects' | 'inspections' | 'maintenance') => setArchiveFilter(value)}>
                <SelectTrigger id="archived-record-filter" className="w-full min-w-44 sm:w-52">
                  <SelectValue placeholder="Select record type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">User ({archivedUsers.length})</SelectItem>
                  <SelectItem value="projects">Project ({archivedRecords.length})</SelectItem>
                  <SelectItem value="inspections">Inspections ({archivedInspections.length})</SelectItem>
                  <SelectItem value="maintenance">Maintenance ({archivedMaintenance.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Archived users, projects, inspections, and maintenance records are automatically permanently deleted 30 days after archiving. Restore anything you want to keep before then.
          </p>
          {archiveFilter === 'users' && (
            <section>
              <h3 className="mb-4 text-lg font-bold text-[#0ea5e9]">Archived Users ({archivedUsers.length})</h3>
              {archivedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No archived users</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {archivedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-[#0ea5e9]">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold leading-5 text-blue-700 opacity-100">{getRoleDisplayName(user.role)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.createdDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleRestoreUser(user.id)} className="text-green-500 hover:text-green-700 px-3 py-1 rounded hover:bg-green-50 transition-colors">
                                Restore
                              </button>
                              <button onClick={() => handleDeleteArchivedUser(user.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`Delete ${user.name}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {archiveFilter === 'projects' && (
          <div className="border-t border-slate-200 pt-6">
            <h2 className="mb-4 text-xl font-bold text-[#0ea5e9]">Archived Project Records ({archivedRecords.length})</h2>
            {archivedRecords.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No archived project records</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {archivedRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.projectName || record.roadName || record.name || 'Unnamed project'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{record.projectCategory || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{record.location || '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          <button onClick={() => handleRestoreRecord(record.id)} className="mr-3 text-green-600 hover:text-green-800">Restore</button>
                          <button onClick={() => handleDeleteRecord(record.id)} className="text-red-600 hover:text-red-800">Delete permanently</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            )}
          </div>
          )}
          {archiveFilter === 'inspections' && (
            <section className="border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-xl font-bold text-[#0ea5e9]">Archived Inspections ({archivedInspections.length})</h2>
              {archivedInspections.length === 0 ? <p className="py-6 text-center text-gray-500">No archived inspections</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Inspection Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {archivedInspections.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.projectName || record.localRoadName || record.roadName || record.name || 'Unnamed project'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.date || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <button onClick={async () => { await fetch('/api/inspections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id, action: 'restore' }) }); await refreshArchivedRecords(); window.dispatchEvent(new Event('local-road-records-changed')); }} className="mr-3 text-green-600 hover:text-green-800">Restore</button>
                            <button onClick={async () => { await fetch(`/api/inspections?id=${encodeURIComponent(record.id)}&permanent=true`, { method: 'DELETE' }); await refreshArchivedRecords(); }} className="text-red-600 hover:text-red-800">Delete permanently</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {archiveFilter === 'maintenance' && (
            <section className="border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-xl font-bold text-[#0ea5e9]">Archived Maintenance ({archivedMaintenance.length})</h2>
              {archivedMaintenance.length === 0 ? <p className="py-6 text-center text-gray-500">No archived maintenance records</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Completed Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {archivedMaintenance.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.projectName || record.localRoadName || record.roadName || record.name || 'Unnamed project'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.scheduledDate || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.completedDate || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.status || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <button onClick={async () => { await fetch('/api/maintenance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id, action: 'restore' }) }); await refreshArchivedRecords(); window.dispatchEvent(new Event('local-road-records-changed')); }} className="mr-3 text-green-600 hover:text-green-800">Restore</button>
                            <button onClick={async () => { await fetch('/api/maintenance?permanent=true', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id }) }); await refreshArchivedRecords(); }} className="text-red-600 hover:text-red-800">Delete permanently</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="user-account-modal my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[405px] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 text-white">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white shadow-inner">
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold leading-tight">
                    {editingUser ? 'Edit User Account' : 'Create User Account'}
                  </h2>
                  <p className="text-sm text-blue-100">Office of the Municipal Engineer Personnel</p>
                </div>
              </div>
              <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close form">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={userFormScrollRef} onScroll={updateActiveUserFormTab} className="form-modal-fields min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <section ref={userAccountSectionRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-600">Employee ID</label>
                <input
                  type="text"
                  value={editingUser ? editingUser.employeeId : generatedEmployeeId}
                  readOnly
                  className="h-10 w-full rounded-md border border-slate-300 bg-gray-100 px-4 text-sm text-slate-700 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-600">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-4 py-2 pr-11 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword((visible) => !visible)}
                    aria-label={showUserPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-blue-600"
                  >
                    {showUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-600">Role</label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserData['role'] })}
                >
                  <SelectTrigger aria-label="Role" className="h-10 rounded-md border-slate-300 px-4 text-sm text-slate-700">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                      {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-600">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as UserData['status'] })}
                >
                  <SelectTrigger aria-label="Status" className="h-10 rounded-md border-slate-300 px-4 text-sm text-slate-700">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active (Login Enabled)</SelectItem>
                    <SelectItem value="Locked">Locked (Pending Approval)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </section>
            </div>

            <div className="flex shrink-0 gap-3 px-6 pb-6 pt-4">
              <button
                onClick={handleClose}
                className="h-10 flex-1 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleSaveEdit : handleAddUser}
                className="h-10 flex-1 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                {editingUser ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPasswordForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-auto flex h-auto max-h-[calc(100vh-2rem)] w-full max-w-[840px] flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-blue-300 shadow-inner backdrop-blur-md">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold leading-tight text-white">Master Security Key</h2>
                  <p className="text-sm text-blue-100">Emergency Municipal Access Token</p>
                </div>
              </div>
              <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="form-modal-fields space-y-4 px-6 py-5">
              <p className="text-xs leading-relaxed text-slate-500">
                The master token enables emergency administrative recovery and role-override privileges for the Office of the Municipal Engineer.
              </p>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Current Master Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter current token (e.g. MABINI-2026)"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">New Master Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600"
                  placeholder="Min 6 alphanumeric characters"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600"
                  placeholder="Repeat new master token"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
              <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                  Cancel
              </button>
              <button
                  type="button"
                  onClick={handlePasswordUpdate}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                  Update Master Password
              </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dialog Modal */}
      {dialog.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex min-h-screen items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl">
            <div className="mb-4">
              <h2 className={`text-xl font-bold ${
                dialog.type === 'error' ? 'text-red-600' :
                dialog.type === 'confirmation' ? 'text-slate-900' :
                'text-green-600'
              }`}>
                {dialog.title}
              </h2>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 text-base leading-relaxed">
                {dialog.message}
              </p>
            </div>

            <div className={`flex ${dialog.type === 'confirmation' ? 'justify-end gap-2' : 'justify-end gap-3'}`}>
              {dialog.type === 'confirmation' && (
                <>
                  <button
                    onClick={() => {
                      dialog.onCancel?.();
                      setDialog({ ...dialog, isOpen: false });
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      dialog.onConfirm?.();
                      setDialog({ ...dialog, isOpen: false });
                    }}
                    className={`rounded-xl px-4 py-2 font-medium text-white transition-colors ${
                      dialog.title === 'Confirm Unlock'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {dialog.title === 'Archive User' ? 'Archive' :
                      dialog.title === 'Delete Archived User' ? 'Delete' :
                        dialog.title === 'Confirm Unlock' ? 'Unlock' : 'Confirm'}
                  </button>
                </>
              )}
              {dialog.type !== 'confirmation' && (
                <button
                  onClick={() => setDialog({ ...dialog, isOpen: false })}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    dialog.type === 'error'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
