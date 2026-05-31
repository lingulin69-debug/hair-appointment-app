import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { Appointment, CheckoutRecord, Client } from './types';

const sampleAppointment: Appointment = {
  id: 'appt-1',
  clientId: 'client-1',
  clientName: '測試顧客',
  phone: '0912345678',
  dateStr: '2026-05-14',
  time: '10:00',
  service: '剪髮',
  totalPrice: 600,
  pax: 1,
  notes: '',
  status: 'pending',
  rescheduleCount: 0,
};

const sampleClient: Client = {
  id: 'client-1',
  name: '測試顧客',
  phone: '0912345678',
  preference: '',
  product: '',
  lastVisit: '2026-05-14',
  visitCount: 1,
};

const mockAuthState = {
  user: { email: 'owner@amysalon.local', uid: 'owner-1' } as Pick<User, 'email' | 'uid'> | null,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

const mockAccessState = {
  bootstrap: { ownerEmail: 'admin@amysalon.local' } as { ownerEmail: string } | null,
  roles: [] as Array<{ email: string; role: 'admin' | 'owner' | 'staff' }>,
  isLoading: false,
  isRolesLoading: false,
  role: 'owner' as 'admin' | 'owner' | 'staff' | null,
  isAdmin: false,
  isOwner: true,
  isStaff: true,
  canBootstrapOwner: false,
  bootstrapOwner: vi.fn(),
  saveRole: vi.fn(),
  removeRole: vi.fn(),
};

const mockAppointmentsState = {
  appointments: [sampleAppointment] as Appointment[],
  isLoading: false,
  addAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
};

const mockClientsState = {
  clients: [sampleClient] as Client[],
  isLoading: false,
  addClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  ensureClient: vi.fn(),
  findClientByName: vi.fn(),
};

const mockStoreItemsState = {
  storeItems: [],
  serviceItems: [],
  addStoreItem: vi.fn(),
  updateStoreItem: vi.fn(),
  deleteStoreItem: vi.fn(),
  isLoading: false,
};

const mockTransactionsState = {
  transactions: [] as CheckoutRecord[],
  isLoading: false,
  addTransaction: vi.fn(),
};

const mockInventoryMovementsState = {
  movements: [],
  isLoading: false,
  addInventoryMovement: vi.fn(),
};

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('./hooks/useAccessControl', () => ({
  useAccessControl: () => mockAccessState,
}));

vi.mock('./hooks/useAppointments', () => ({
  useAppointments: () => mockAppointmentsState,
}));

vi.mock('./hooks/useClients', () => ({
  useClients: () => mockClientsState,
}));

vi.mock('./hooks/useLeaves', () => ({
  useLeaves: () => ({
    leaveSet: new Set<string>(),
    toggleLeave: vi.fn(),
  }),
}));

vi.mock('./hooks/useStoreItems', () => ({
  useStoreItems: () => mockStoreItemsState,
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
  useTransactions: () => mockTransactionsState,
}));

vi.mock('./hooks/useInventoryMovements', () => ({
  useInventoryMovements: () => mockInventoryMovementsState,
}));

vi.mock('./components/UI/Navbar', () => ({
  Navbar: ({ onViewChange }: { onViewChange: (view: string) => void }) => (
    <div>
      <button type="button" onClick={() => onViewChange('clients')}>
        GO_CLIENTS
      </button>
      <button type="button" onClick={() => onViewChange('calendar')}>
        GO_CALENDAR
      </button>
      <button type="button" onClick={() => onViewChange('services')}>
        GO_SERVICES
      </button>
    </div>
  ),
}));

vi.mock('./components/Calendar/Calendar', () => ({
  Calendar: ({ onSelectAppt }: { onSelectAppt: (appointment: Appointment) => void }) => (
    <button type="button" onClick={() => onSelectAppt(sampleAppointment)}>
      OPEN_APPOINTMENT
    </button>
  ),
}));

vi.mock('./components/Calendar/AppointmentDetailModal', () => ({
  AppointmentDetailModal: ({
    isOpen,
    appointment,
    onCallAppointment,
    onCheckoutAppointment,
    onCancelAppointment,
  }: {
    isOpen: boolean;
    appointment: Appointment | null;
    onCallAppointment: (appointment: Appointment) => void;
    onCheckoutAppointment: (appointment: Appointment) => void;
    onCancelAppointment: (appointment: Appointment) => void | Promise<void>;
  }) =>
    isOpen && appointment ? (
      <div>
        <div>APPOINTMENT_DETAIL_OPEN</div>
        <div>{`APPOINTMENT_PHONE:${appointment.phone ?? ''}`}</div>
        <button type="button" onClick={() => onCallAppointment(appointment)}>
          CALL_APPOINTMENT
        </button>
        <button type="button" onClick={() => onCheckoutAppointment(appointment)}>
          OPEN_CHECKOUT
        </button>
        <button type="button" onClick={() => void onCancelAppointment(appointment)}>
          CANCEL_APPOINTMENT
        </button>
      </div>
    ) : null,
}));

vi.mock('./components/Client/ClientList', () => ({
  ClientList: ({ onSelectClient }: { onSelectClient: (client: Client) => void }) => (
    <button type="button" onClick={() => onSelectClient(sampleClient)}>
      OPEN_CLIENT
    </button>
  ),
}));

vi.mock('./components/Client/ClientDetailModal', () => ({
  ClientDetailModal: ({
    isOpen,
    client,
    onDelete,
  }: {
    isOpen: boolean;
    client: Client | null;
    onDelete: (client: Client) => void | Promise<void>;
  }) =>
    isOpen && client ? (
      <div>
        <div>CLIENT_DETAIL_OPEN</div>
        <button type="button" onClick={() => void onDelete(client)}>
          DELETE_CLIENT
        </button>
      </div>
    ) : null,
}));

vi.mock('./components/Auth/AccessControlPanel', () => ({
  AccessControlPanel: () => <div>ACCESS_PANEL</div>,
}));

vi.mock('./components/Dashboard/Dashboard', () => ({
  Dashboard: () => <div>DASHBOARD_VIEW</div>,
}));

vi.mock('./components/Calendar/NewApptModal', () => ({
  NewApptModal: () => null,
}));

vi.mock('./components/Calendar/CheckoutModal', () => ({
  CheckoutModal: ({
    isOpen,
    appointment,
    onConfirm,
  }: {
    isOpen: boolean;
    appointment: Appointment | null;
    onConfirm: (checkout: Omit<CheckoutRecord, 'id'>) => void | Promise<void>;
  }) =>
    isOpen && appointment ? (
      <button
        type="button"
        onClick={() =>
          void onConfirm({
            clientId: appointment.clientId ?? '',
            clientName: appointment.clientName,
            appointmentId: appointment.id,
            dateStr: appointment.dateStr,
            lineItems: [
              {
                itemId: 'service-1',
                itemName: '剪髮',
                itemType: 'service',
                quantity: 1,
                unitPrice: 600,
                totalPrice: 600,
              },
            ],
            subtotal: 600,
            discountAmount: 0,
            adjustmentAmount: 0,
            totalAmount: 600,
            paymentMethod: 'cash',
            status: 'completed',
          })
        }
      >
        SUBMIT_CHECKOUT
      </button>
    ) : null,
}));

vi.mock('./components/Services/InventoryMovementModal', () => ({
  InventoryMovementModal: () => null,
}));

vi.mock('./components/Auth/BootstrapOwnerScreen', () => ({
  BootstrapOwnerScreen: () => <div>BOOTSTRAP_SCREEN</div>,
}));

vi.mock('./components/Auth/AccessDeniedScreen', () => ({
  AccessDeniedScreen: () => <div>ACCESS_DENIED</div>,
}));

vi.mock('./components/Auth/LoginScreen', () => ({
  LoginScreen: () => <div>LOGIN_SCREEN</div>,
}));

vi.mock('./components/Client/ClientForm', () => ({
  default: () => null,
}));

vi.mock('./components/Services/ItemModal', () => ({
  ItemModal: () => null,
}));

vi.mock('./components/UI/CalculatorModal', () => ({
  CalculatorModal: () => null,
}));

vi.mock('./components/Services/ServiceList', () => ({
  ServiceList: ({
    onDeleteItem,
  }: {
    onDeleteItem: (item: { id: string; name: string }) => void | Promise<void>;
  }) => (
    <button type="button" onClick={() => void onDeleteItem({ id: 'item-1', name: '洗髮精' })}>
      DELETE_ITEM
    </button>
  ),
}));

import App from './App';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  sampleAppointment.phone = '0912345678';
  mockAppointmentsState.appointments = [sampleAppointment];
  mockAppointmentsState.deleteAppointment.mockReset();
  mockAppointmentsState.updateAppointment.mockReset();
  mockClientsState.deleteClient.mockReset();
  mockStoreItemsState.deleteStoreItem.mockReset();
  mockTransactionsState.transactions = [];
  mockTransactionsState.addTransaction.mockReset();
  mockInventoryMovementsState.addInventoryMovement.mockReset();
  mockAuthState.user = { email: 'owner@amysalon.local', uid: 'owner-1' };
  mockAccessState.bootstrap = { ownerEmail: 'admin@amysalon.local' };
  mockAccessState.role = 'owner';
  mockAccessState.isAdmin = false;
  mockAccessState.isOwner = true;
  mockAccessState.isStaff = true;
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('App destructive flow guards', () => {
  it('keeps appointment detail open when cancel fails', async () => {
    mockAppointmentsState.updateAppointment.mockResolvedValue(false);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'OPEN_APPOINTMENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'CANCEL_APPOINTMENT' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('取消預約失敗，請稍後再試。');
    });

    expect(screen.getByText('APPOINTMENT_DETAIL_OPEN')).toBeInTheDocument();
  });

  it('marks an appointment as cancelled instead of deleting it', async () => {
    mockAppointmentsState.updateAppointment.mockResolvedValue(true);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'OPEN_APPOINTMENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'CANCEL_APPOINTMENT' }));

    await waitFor(() => {
      expect(mockAppointmentsState.updateAppointment).toHaveBeenCalledWith('appt-1', {
        status: 'cancelled',
      });
    });

    expect(screen.queryByText('APPOINTMENT_DETAIL_OPEN')).not.toBeInTheDocument();
  });

  it('keeps client detail open when delete fails', async () => {
    mockClientsState.deleteClient.mockResolvedValue(false);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'GO_CLIENTS' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OPEN_CLIENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DELETE_CLIENT' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('顧客刪除失敗，請稍後再試。');
    });

    expect(screen.getByText('CLIENT_DETAIL_OPEN')).toBeInTheDocument();
  });

  it('alerts when deleting a store item fails', async () => {
    mockStoreItemsState.deleteStoreItem.mockResolvedValue(false);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'GO_SERVICES' }));
    fireEvent.click(await screen.findByRole('button', { name: 'DELETE_ITEM' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('項目刪除失敗，請稍後再試。');
    });
  });

  it('closes appointment detail when switching pages', async () => {
    mockAppointmentsState.deleteAppointment.mockResolvedValue(true);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'OPEN_APPOINTMENT' }));
    expect(screen.getByText('APPOINTMENT_DETAIL_OPEN')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'GO_CLIENTS' }));

    await waitFor(() => {
      expect(screen.queryByText('APPOINTMENT_DETAIL_OPEN')).not.toBeInTheDocument();
    });
  });

  it('fills missing appointment phone from client data before showing detail', () => {
    sampleAppointment.phone = '';

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'OPEN_APPOINTMENT' }));

    expect(screen.getByText('APPOINTMENT_PHONE:0912345678')).toBeInTheDocument();
  });

  it('closes client detail when switching pages', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'GO_CLIENTS' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OPEN_CLIENT' }));
    expect(screen.getByText('CLIENT_DETAIL_OPEN')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'GO_CALENDAR' }));

    await waitFor(() => {
      expect(screen.queryByText('CLIENT_DETAIL_OPEN')).not.toBeInTheDocument();
    });
  });

  it('asks for confirmation before adding the same checkout content within five minutes', async () => {
    const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    mockTransactionsState.transactions = [
      {
        id: 'tx-existing',
        clientId: 'client-1',
        clientName: '測試顧客',
        appointmentId: 'appt-old',
        dateStr: '2026-05-14',
        lineItems: [
          {
            itemId: 'service-1',
            itemName: '剪髮',
            itemType: 'service',
            quantity: 1,
            unitPrice: 600,
            totalPrice: 600,
          },
        ],
        subtotal: 600,
        discountAmount: 0,
        adjustmentAmount: 0,
        totalAmount: 600,
        paymentMethod: 'cash',
        status: 'completed',
        createdAt: recentTimestamp,
        updatedAt: recentTimestamp,
      },
    ];
    mockTransactionsState.addTransaction.mockResolvedValue('tx-new');
    mockAppointmentsState.updateAppointment.mockResolvedValue(true);
    vi.mocked(window.confirm).mockReturnValueOnce(false);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'OPEN_APPOINTMENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPEN_CHECKOUT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SUBMIT_CHECKOUT' }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        '剛剛已經加入相同的一筆紀錄，是否添加相同？'
      );
    });

    expect(mockTransactionsState.addTransaction).not.toHaveBeenCalled();
  });

  it('continues saving after confirming a recent duplicate checkout warning', async () => {
    const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    mockTransactionsState.transactions = [
      {
        id: 'tx-existing',
        clientId: 'client-1',
        clientName: '測試顧客',
        appointmentId: 'appt-old',
        dateStr: '2026-05-14',
        lineItems: [
          {
            itemId: 'service-1',
            itemName: '剪髮',
            itemType: 'service',
            quantity: 1,
            unitPrice: 600,
            totalPrice: 600,
          },
        ],
        subtotal: 600,
        discountAmount: 0,
        adjustmentAmount: 0,
        totalAmount: 600,
        paymentMethod: 'cash',
        status: 'completed',
        createdAt: recentTimestamp,
        updatedAt: recentTimestamp,
      },
    ];
    mockTransactionsState.addTransaction.mockResolvedValue('tx-new');
    mockAppointmentsState.updateAppointment.mockResolvedValue(true);
    vi.mocked(window.confirm).mockReturnValueOnce(true);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'OPEN_APPOINTMENT' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPEN_CHECKOUT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SUBMIT_CHECKOUT' }));

    await waitFor(() => {
      expect(mockTransactionsState.addTransaction).toHaveBeenCalledTimes(1);
    });

    expect(mockAppointmentsState.updateAppointment).toHaveBeenCalledWith('appt-1', {
      status: 'completed',
      totalPrice: 600,
      transactionId: 'tx-new',
    });
  });
});