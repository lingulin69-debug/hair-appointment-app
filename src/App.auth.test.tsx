import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

const mockAuthState = {
  user: null as Pick<User, 'email' | 'uid'> | null,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

const mockAccessState = {
  bootstrap: null as { ownerEmail: string } | null,
  roles: [] as Array<{ email: string; role: 'admin' | 'owner' | 'staff' }>,
  isLoading: false,
  isRolesLoading: false,
  role: null as 'admin' | 'owner' | 'staff' | null,
  isAdmin: false,
  isOwner: false,
  isStaff: false,
  canBootstrapOwner: false,
  bootstrapOwner: vi.fn(),
  saveRole: vi.fn(),
  removeRole: vi.fn(),
};

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('./hooks/useAccessControl', () => ({
  useAccessControl: () => mockAccessState,
}));

vi.mock('./components/Auth/AccessControlPanel', () => ({
  AccessControlPanel: () => <div>ACCESS_PANEL</div>,
}));

vi.mock('./components/Dashboard/Dashboard', () => ({
  Dashboard: () => <div>DASHBOARD_VIEW</div>,
}));

vi.mock('./hooks/useAppointments', () => ({
  useAppointments: () => ({
    appointments: [],
    isLoading: false,
    addAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
  }),
}));

vi.mock('./hooks/useClients', () => ({
  useClients: () => ({
    clients: [],
    isLoading: false,
    addClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    ensureClient: vi.fn(),
    findClientByName: vi.fn(),
  }),
}));

vi.mock('./hooks/useLeaves', () => ({
  useLeaves: () => ({
    leaveSet: new Set<string>(),
    toggleLeave: vi.fn(),
  }),
}));

vi.mock('./hooks/useStoreItems', () => ({
  useStoreItems: () => ({
    storeItems: [],
    serviceItems: [],
    addStoreItem: vi.fn(),
    updateStoreItem: vi.fn(),
    deleteStoreItem: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('./hooks/useSync', () => ({
  useSync: () => ({
    status: 'online',
    syncNow: vi.fn(),
  }),
}));

vi.mock('./hooks/useRevenues', () => ({
  useRevenues: () => ({
    revenues: [],
    addRevenue: vi.fn(),
    deleteRevenue: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('./hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [],
    isLoading: false,
    addTransaction: vi.fn(),
  }),
}));

vi.mock('./hooks/useInventoryMovements', () => ({
  useInventoryMovements: () => ({
    movements: [],
    isLoading: false,
    addInventoryMovement: vi.fn(),
  }),
}));

import App from './App';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockAuthState.user = null;
  mockAuthState.isLoading = false;
  mockAccessState.bootstrap = null;
  mockAccessState.roles = [];
  mockAccessState.isLoading = false;
  mockAccessState.isRolesLoading = false;
  mockAccessState.role = null;
  mockAccessState.isAdmin = false;
  mockAccessState.isOwner = false;
  mockAccessState.isStaff = false;
  mockAccessState.canBootstrapOwner = false;
});

describe('App auth gates', () => {
  it('shows login screen when no user is signed in', () => {
    render(<App />);

    expect(screen.getByText('使用管理帳號登入')).toBeInTheDocument();
  });

  it('shows bootstrap owner screen for the first authenticated account', () => {
    mockAuthState.user = { email: 'owner@amysalon.com', uid: 'owner-1' };
    mockAccessState.canBootstrapOwner = true;

    render(<App />);

    expect(screen.getByText('建立第一個管理員')).toBeInTheDocument();
    expect(screen.getByText('owner@amysalon.com')).toBeInTheDocument();
  });

  it('shows access denied screen when user has no owner or staff role', () => {
    mockAuthState.user = { email: 'staff@amysalon.com', uid: 'staff-1' };
    mockAccessState.bootstrap = { ownerEmail: 'owner@amysalon.com' };

    render(<App />);

    expect(screen.getByText('這個帳號還沒有權限')).toBeInTheDocument();
    expect(screen.getByText(/owner@amysalon.com/)).toBeInTheDocument();
  });

  it('shows access control panel for admin accounts only', async () => {
    mockAuthState.user = { email: 'admin@amysalon.com', uid: 'admin-1' };
    mockAccessState.bootstrap = { ownerEmail: 'admin@amysalon.com' };
    mockAccessState.role = 'admin';
    mockAccessState.isAdmin = true;
    mockAccessState.isOwner = true;
    mockAccessState.isStaff = true;

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '後台管理 顧客、商品與報表' }));
    fireEvent.click(screen.getByRole('button', { name: '預約統計' }));

    expect(await screen.findByText('ACCESS_PANEL')).toBeInTheDocument();
  });

  it('hides access control panel from owner accounts', async () => {
    mockAuthState.user = { email: 'parent@amysalon.com', uid: 'owner-1' };
    mockAccessState.bootstrap = { ownerEmail: 'admin@amysalon.com' };
    mockAccessState.role = 'owner';
    mockAccessState.isAdmin = false;
    mockAccessState.isOwner = true;
    mockAccessState.isStaff = true;

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '後台管理 顧客、商品與報表' }));
    fireEvent.click(screen.getByRole('button', { name: '預約統計' }));

    expect(await screen.findByText('DASHBOARD_VIEW')).toBeInTheDocument();
    expect(screen.queryByText('ACCESS_PANEL')).not.toBeInTheDocument();
  });
});