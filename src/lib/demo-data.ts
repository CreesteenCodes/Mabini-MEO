export type DemoLocalRoad = {
  id: string;
  name: string;
  type: string;
  location: string;
  dateBuilt: string;
  condition: string;
  lastInspection?: string;
};

export type DemoUser = {
  userId: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: 'Head Engineer' | 'Staff - Encoder' | 'Staff - Inspector' | 'Staff - Validator';
  status?: 'Active' | 'Inactive';
};

export const DEMO_LOCAL_ROADS: DemoLocalRoad[] = [
  {
    id: '1',
    name: 'Poblacion Local Road',
    type: 'Local Road',
    location: 'Barangay Central',
    dateBuilt: '2005-06-15',
    condition: 'Good',
    lastInspection: '2026-03-15',
  },
  {
    id: '2',
    name: 'Coastal Access Road',
    type: 'Local Road',
    location: 'Barangay Coastal',
    dateBuilt: '2010-03-20',
    condition: 'Fair',
    lastInspection: '2026-02-28',
  },
  {
    id: '3',
    name: 'Mabini Bypass Road',
    type: 'Local Road',
    location: 'Barangay East',
    dateBuilt: '2018-11-05',
    condition: 'Good',
    lastInspection: '2026-04-09',
  },
];

export const DEMO_USERS: DemoUser[] = [
  {
    userId: '1',
    name: 'Admin User',
    email: 'admin@municipal.gov',
    username: 'admin',
    password: 'admin123',
    role: 'Head Engineer',
  },
  {
    userId: '2',
    name: 'John Encoder',
    email: 'john.encoder@municipal.gov',
    username: 'encoder',
    password: 'encoder123',
    role: 'Staff - Encoder',
  },
  {
    userId: '3',
    name: 'Peter Inspector',
    email: 'peter.inspector@municipal.gov',
    username: 'inspector',
    password: 'inspector123',
    role: 'Staff - Inspector',
  },
  {
    userId: '4',
    name: 'Maria Validator',
    email: 'maria.validator@municipal.gov',
    username: 'validator',
    password: 'validator123',
    role: 'Staff - Validator',
  },
];
