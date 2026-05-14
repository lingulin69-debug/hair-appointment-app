import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './components/UI/Navbar';
import { Calendar } from './components/Calendar/Calendar';
import { CalculatorModal } from './components/UI/CalculatorModal';
import { useAppointments } from './hooks/useAppointments';
import { useClients } from './hooks/useClients';
import { useLeaves } from './hooks/useLeaves';
import { useStoreItems } from './hooks/useStoreItems';
import { useSync } from './hooks/useSync';
import { useRevenues } from './hooks/useRevenues';
import { useTransactions } from './hooks/useTransactions';
import { useInventoryMovements } from './hooks/useInventoryMovements';
import { useAuth } from './hooks/useAuth';
import { useAccessControl } from './hooks/useAccessControl';
import { NewApptModal } from './components/Calendar/NewApptModal';
import { AppointmentDetailModal } from './components/Calendar/AppointmentDetailModal';
import { CheckoutModal } from './components/Calendar/CheckoutModal';
import { InventoryMovementModal } from './components/Services/InventoryMovementModal';
import { BootstrapOwnerScreen } from './components/Auth/BootstrapOwnerScreen';
import { AccessDeniedScreen } from './components/Auth/AccessDeniedScreen';
import { AccessControlPanel } from './components/Auth/AccessControlPanel';
import { LoginScreen } from './components/Auth/LoginScreen';
import ClientForm, { type ClientFormData } from './components/Client/ClientForm';
import { ClientDetailModal } from './components/Client/ClientDetailModal';
import { ItemModal } from './components/Services/ItemModal';
import type { DashboardPeriod } from './components/Dashboard/Dashboard';
import type { Appointment, CheckoutRecord, Client, InventoryMovement, StoreItem } from './types';
import { interactionMotion } from './styles/interactionMotion';
import { ChevronDown } from 'lucide-react';
import { buildInventoryMovementsFromCheckout } from './utils/checkout';
import { buildClientSpendingSummaryMap } from './utils/clientSpending';
import { buildInventorySummaryMap } from './utils/inventory';
import {
  clearRememberedLogin,
  loadRememberedLogin,
  normalizeLoginIdentifier,
  saveRememberedLogin,
  type RememberedLogin,
} from './utils/loginIdentity';
import {
  getDateRangeForMonth,
  getDateRangeForTrailingDays,
  getDateRangeForTrailingMonths,
  isExactDateString,
} from './utils/schedule';
import { isAppointmentTimeOccupied } from './utils/appointmentTime';

const ClientList = lazy(() =>
  import('./components/Client/ClientList').then((module) => ({
    default: module.ClientList,
  }))
);
const ServiceList = lazy(() =>
  import('./components/Services/ServiceList').then((module) => ({
    default: module.ServiceList,
  }))
);
const Dashboard = lazy(() =>
  import('./components/Dashboard/Dashboard').then((module) => ({
    default: module.Dashboard,
  }))
);

type View = 'calendar' | 'clients' | 'services' | 'dashboard';
type WorkspaceMode = 'frontdesk' | 'backoffice';

const DEFAULT_VIEW_BY_MODE: Record<WorkspaceMode, View> = {
  frontdesk: 'calendar',
  backoffice: 'clients',
};

const VIEW_MODE_MAP: Record<View, WorkspaceMode> = {
  calendar: 'frontdesk',
  clients: 'backoffice',
  services: 'backoffice',
  dashboard: 'backoffice',
};

type ItemFormData = {
  name: string;
  price: string;
  duration: string;
  type: 'service' | 'product';
  color?: string;
};

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW');
}

function isUsableClient(client: Client | null | undefined): client is Client {
  return (
    !!client &&
    typeof client.name === 'string' &&
    client.name.trim().length > 0 &&
    typeof client.phone === 'string'
  );
}

function ViewLoader() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl border border-[#E8E3D8] bg-white"
        />
      ))}
    </div>
  );
}

export default function App() {
  const [rememberedLogin, setRememberedLogin] = useState<RememberedLogin | null>(() => loadRememberedLogin());
  const { user, isLoading: isAuthLoading, signIn, signOut } = useAuth();
  const {
    bootstrap,
    roles,
    isLoading: isAccessLoading,
    isRolesLoading,
    role: accessRole,
    isAdmin,
    isOwner,
    isStaff,
    canBootstrapOwner,
    bootstrapOwner,
    saveRole,
    removeRole,
  } = useAccessControl(user);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('frontdesk');
  const [currentView, setCurrentView] = useState<View>('calendar');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [activeStoreItem, setActiveStoreItem] = useState<StoreItem | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isApptDetailOpen, setIsApptDetailOpen] = useState(false);
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isNewApptModalOpen, setIsNewApptModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(() => new Date());
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('7d');
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [tempClientName, setTempClientName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [tempService, setTempService] = useState('');
  const [tempPrice, setTempPrice] = useState(0);
  const [tempPax, setTempPax] = useState(1);
  const [tempNotes, setTempNotes] = useState('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckoutSaving, setIsCheckoutSaving] = useState(false);
  const [isInventorySaving, setIsInventorySaving] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [accessErrorMessage, setAccessErrorMessage] = useState<string | null>(null);
  const [isBootstrappingOwner, setIsBootstrappingOwner] = useState(false);
  const [inventoryTargetItem, setInventoryTargetItem] = useState<StoreItem | null>(null);
  const isAuthenticated = Boolean(user);

  const shouldLoadCalendarData = isAuthenticated && (currentView === 'calendar' || isNewApptModalOpen);
  const shouldLoadAppointments =
    shouldLoadCalendarData || (isAuthenticated && (currentView === 'dashboard' || isApptDetailOpen));
  const shouldLoadStoreItems =
    isAuthenticated &&
    (currentView === 'calendar' || currentView === 'services' || isItemModalOpen || isNewApptModalOpen);
  const shouldLoadRevenues = isAuthenticated && currentView === 'dashboard';
  const shouldLoadTransactions =
    isAuthenticated && (currentView === 'clients' || isClientDetailOpen || isCheckoutModalOpen);
  const shouldLoadInventoryMovements =
    isAuthenticated && (currentView === 'services' || isInventoryModalOpen || isCheckoutModalOpen);
  const shouldLoadClients =
    isAuthenticated &&
    (currentView === 'clients' ||
      isClientDetailOpen ||
      isClientModalOpen ||
      isNewApptModalOpen ||
      isCheckoutModalOpen);

  const calendarDateRange = useMemo(
    () => getDateRangeForMonth(calendarCurrentDate),
    [calendarCurrentDate]
  );
  const dashboardDataRange = useMemo(
    () => getDateRangeForTrailingMonths(12, new Date()),
    []
  );
  const activeAppointmentRange =
    currentView === 'dashboard' && !isNewApptModalOpen
      ? dashboardDataRange
      : calendarDateRange;

  const {
    storeItems,
    serviceItems,
    addStoreItem,
    updateStoreItem,
    deleteStoreItem,
    isLoading: isStoreItemsLoading,
  } = useStoreItems({ enabled: shouldLoadStoreItems });
  const {
    appointments,
    isLoading: isAppointmentsLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({
    enabled: shouldLoadAppointments,
    range: activeAppointmentRange,
    storeItems,
  });
  const {
    clients,
    isLoading: isClientsLoading,
    addClient,
    updateClient,
    deleteClient,
    ensureClient,
    findClientByName,
  } = useClients({ enabled: shouldLoadClients });
  const { leaveSet, toggleLeave } = useLeaves({
    enabled: currentView === 'calendar',
    range: calendarDateRange,
  });
  const { status: syncStatus, syncNow } = useSync();
  const {
    revenues,
    addRevenue,
    deleteRevenue,
    isLoading: isRevenuesLoading,
  } = useRevenues({ enabled: shouldLoadRevenues, range: dashboardDataRange });
  const { transactions, isLoading: isTransactionsLoading, addTransaction } = useTransactions({
    enabled: shouldLoadTransactions,
  });
  const {
    movements: inventoryMovements,
    isLoading: isInventoryLoading,
    addInventoryMovement,
  } = useInventoryMovements({
    enabled: shouldLoadInventoryMovements,
  });

  const defaultService = serviceItems[0] ?? null;
  const safeClients = useMemo(
    () => (Array.isArray(clients) ? clients.filter(isUsableClient) : []),
    [clients]
  );
  const clientSpendingSummaryMap = useMemo(
    () => buildClientSpendingSummaryMap(safeClients, transactions),
    [safeClients, transactions]
  );
  const inventorySummaryByItemId = useMemo(
    () => buildInventorySummaryMap(storeItems, inventoryMovements),
    [inventoryMovements, storeItems]
  );

  const typingMatchedClient = useMemo(() => {
    const normalized = normalizeName(tempClientName);
    if (!normalized) {
      return null;
    }

    return (
      safeClients.find((client) => normalizeName(client.name) === normalized) ?? null
    );
  }, [safeClients, tempClientName]);

  const clientSuggestions = useMemo(() => {
    const normalized = normalizeName(tempClientName);
    if (!normalized) {
      return [];
    }

    return safeClients
      .filter((client) => {
        const normalizedClientName = normalizeName(client.name);
        const normalizedPhone = client.phone.replace(/\s/g, '');
        return (
          normalizedClientName.includes(normalized) ||
          normalizedPhone.includes(tempClientName.replace(/\s/g, ''))
        );
      })
      .slice(0, 5);
  }, [safeClients, tempClientName]);

  const resetAppointmentDraft = useCallback(() => {
    setTempClientName('');
    setTempPhone('');
    setTempTime('');
    setTempService(defaultService?.name ?? '');
    setTempPrice(defaultService?.price ?? 0);
    setTempPax(1);
    setTempNotes('');
  }, [defaultService]);

  const populateAppointmentDraft = useCallback((appointment: Appointment) => {
    setTempClientName(appointment.clientName);
    setTempPhone(appointment.phone ?? '');
    setTempTime(appointment.time);
    setTempService(appointment.service);
    setTempPrice(appointment.totalPrice / Math.max(appointment.pax, 1));
    setTempPax(Math.max(1, appointment.pax));
    setTempNotes(appointment.notes ?? '');
  }, []);

  useEffect(() => {
    if (!defaultService) {
      return;
    }

    const matchedService = serviceItems.find((item) => item.name === tempService);
    if (!matchedService) {
      setTempService(defaultService.name);
      setTempPrice(defaultService.price);
    }
  }, [defaultService, serviceItems, tempService]);

  const closeNewAppointmentModal = useCallback(() => {
    setIsNewApptModalOpen(false);
    setEditingAppointment(null);
    resetAppointmentDraft();
  }, [resetAppointmentDraft]);

  const handleSelectClientSuggestion = useCallback((client: Client) => {
    setTempClientName(client.name);
    setTempPhone(client.phone);
  }, []);

  const openNewAppointmentModal = useCallback(
    (dateStr: string, initialTime?: string) => {
      setSelectedDateStr(isExactDateString(dateStr) ? dateStr : '');
      setEditingAppointment(null);
      setIsNewApptModalOpen(true);
      resetAppointmentDraft();
      if (initialTime) {
        setTempTime(initialTime);
      }
    },
    [resetAppointmentDraft]
  );

  const openEditAppointmentModal = useCallback(
    (appointment: Appointment) => {
      setSelectedDateStr(appointment.dateStr);
      setEditingAppointment(appointment);
      populateAppointmentDraft(appointment);
      setIsApptDetailOpen(false);
      setIsNewApptModalOpen(true);
    },
    [populateAppointmentDraft]
  );

  const closeClientForm = useCallback(() => {
    setIsClientModalOpen(false);
    setActiveClient(null);
  }, []);

  const closeItemForm = useCallback(() => {
    setIsItemModalOpen(false);
    setActiveStoreItem(null);
  }, []);

  const closeInventoryModal = useCallback(() => {
    setIsInventoryModalOpen(false);
    setInventoryTargetItem(null);
  }, []);

  const resetWorkspacePanels = useCallback(() => {
    setSelectedClient(null);
    setActiveClient(null);
    setActiveStoreItem(null);
    setSelectedAppt(null);
    setEditingAppointment(null);
    setIsClientDetailOpen(false);
    setIsClientModalOpen(false);
    setIsItemModalOpen(false);
    setIsApptDetailOpen(false);
    setIsNewApptModalOpen(false);
    setIsCheckoutModalOpen(false);
    setIsInventoryModalOpen(false);
    setInventoryTargetItem(null);
    setIsCalcOpen(false);
  }, []);

  const handleSignIn = useCallback(
    async (identifier: string, password: string, rememberDevice: boolean) => {
      setAuthErrorMessage(null);
      setAccessErrorMessage(null);

      if (!identifier.trim() || !password.trim()) {
        setAuthErrorMessage('請輸入帳號或 Email 與密碼。');
        return;
      }

      setIsSigningIn(true);

      try {
        const normalizedEmail = normalizeLoginIdentifier(identifier);
        const errorMessage = await signIn(normalizedEmail, password);
        if (errorMessage) {
          setAuthErrorMessage(errorMessage);
          return;
        }

        if (rememberDevice) {
          const nextRememberedLogin = {
            identifier: identifier.trim(),
            password,
          } satisfies RememberedLogin;

          saveRememberedLogin(nextRememberedLogin);
          setRememberedLogin(nextRememberedLogin);
        } else {
          clearRememberedLogin();
          setRememberedLogin(null);
        }

        window.location.reload();
        return;
      } finally {
        setIsSigningIn(false);
      }
    },
    [signIn]
  );

  const handleSignOut = useCallback(async () => {
    const errorMessage = await signOut();

    if (errorMessage) {
      window.alert(errorMessage);
      return;
    }

    setAuthErrorMessage(null);
    setAccessErrorMessage(null);
    setWorkspaceMode('frontdesk');
    setCurrentView('calendar');
    resetWorkspacePanels();
  }, [resetWorkspacePanels, signOut]);

  const handleBootstrapOwner = useCallback(async () => {
    setAccessErrorMessage(null);
    setIsBootstrappingOwner(true);

    try {
      const errorMessage = await bootstrapOwner();
      if (errorMessage) {
        setAccessErrorMessage(errorMessage);
      }
    } finally {
      setIsBootstrappingOwner(false);
    }
  }, [bootstrapOwner]);

  const handleViewChange = useCallback(
    (view: string) => {
      const nextView = view as View;

      if (accessRole === 'staff' && nextView !== 'calendar') {
        return;
      }

      if (nextView === currentView) {
        return;
      }

      setWorkspaceMode(VIEW_MODE_MAP[nextView]);
      setCurrentView(nextView);
      resetWorkspacePanels();
    },
    [accessRole, currentView, resetWorkspacePanels]
  );

  const handleWorkspaceModeChange = useCallback(
    (mode: WorkspaceMode) => {
      if (accessRole === 'staff' && mode !== 'frontdesk') {
        return;
      }

      if (mode === workspaceMode) {
        return;
      }

      setWorkspaceMode(mode);
      setCurrentView(DEFAULT_VIEW_BY_MODE[mode]);
      resetWorkspacePanels();
    },
    [accessRole, resetWorkspacePanels, workspaceMode]
  );

  useEffect(() => {
    if (accessRole !== 'staff') {
      return;
    }

    if (workspaceMode !== 'frontdesk' || currentView !== 'calendar') {
      setWorkspaceMode('frontdesk');
      setCurrentView('calendar');
      resetWorkspacePanels();
    }
  }, [accessRole, currentView, resetWorkspacePanels, workspaceMode]);

  const handleSaveAppointment = useCallback(async () => {
    const trimmedClientName = tempClientName.trim();
    const trimmedPhone = tempPhone.trim();
    const matchedService =
      serviceItems.find((item) => item.name === tempService) ?? defaultService;
    const isTimeOccupied = isAppointmentTimeOccupied(
      appointments,
      selectedDateStr,
      tempTime,
      editingAppointment?.id ?? null
    );

    if (
      isSaving ||
      !trimmedClientName ||
      !selectedDateStr ||
      !isExactDateString(selectedDateStr) ||
      !matchedService ||
      !tempTime ||
      isTimeOccupied
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const client = await ensureClient(trimmedClientName, {
        lastVisit: selectedDateStr,
        phone: trimmedPhone,
      });

      if (!client) {
        window.alert('預約儲存失敗，請稍後再試。');
        return;
      }

      const appointmentPayload = {
        clientId: client.id,
        clientName: client.name,
        phone: trimmedPhone,
        dateStr: selectedDateStr,
        time: tempTime,
        service: matchedService.name,
        pax: tempPax,
        notes: tempNotes.trim(),
        totalPrice: tempPrice * tempPax,
      };

      const didSave = editingAppointment
        ? await updateAppointment(editingAppointment.id, appointmentPayload)
        : Boolean(
            await addAppointment({
              ...appointmentPayload,
              status: 'pending',
            })
          );

      if (!didSave) {
        window.alert('預約儲存失敗，請稍後再試。');
        return;
      }

      closeNewAppointmentModal();
    } catch (error) {
      console.error('Error saving appointment:', error);
      window.alert('預約儲存失敗，請稍後再試。');
    } finally {
      setIsSaving(false);
    }
  }, [
    addAppointment,
    appointments,
    closeNewAppointmentModal,
    defaultService,
    editingAppointment,
    ensureClient,
    isSaving,
    selectedDateStr,
    serviceItems,
    tempClientName,
    tempNotes,
    tempPax,
    tempPhone,
    tempPrice,
    tempService,
    tempTime,
    updateAppointment,
  ]);

  const handleConfirmClient = useCallback(
    async (clientData: ClientFormData) => {
      const trimmedName = clientData.name.trim();
      if (!trimmedName || isSaving) return;

      setIsSaving(true);
      try {
        const payload = {
          name: trimmedName,
          phone: clientData.phone.trim(),
          preference: clientData.preference.trim(),
          product: clientData.product.trim(),
        };

        const didSave = activeClient
          ? await updateClient(activeClient.id, payload)
          : Boolean(await addClient(payload));

        if (!didSave) {
          window.alert('顧客儲存失敗，請稍後再試。');
          return;
        }

        closeClientForm();

      } catch (error) {
        console.error('Error saving client:', error);
        window.alert('顧客儲存失敗，請稍後再試。');
      } finally {
        setIsSaving(false);
      }
    },
    [activeClient, addClient, closeClientForm, isSaving, updateClient]
  );

  const handleConfirmItem = useCallback(
    async (itemData: ItemFormData) => {
      const trimmedName = itemData.name.trim();
      const price = Number(itemData.price);
      const duration = itemData.type === 'service' ? itemData.duration.trim() : '-';

      if (!trimmedName || Number.isNaN(price) || price < 0 || isSaving) return;

      setIsSaving(true);
      try {
        const colorValue = itemData.color?.trim() || undefined;
        const didSave = activeStoreItem
          ? await updateStoreItem(activeStoreItem.id, {
              name: trimmedName,
              price,
              duration: duration || '-',
              type: itemData.type,
              color: colorValue,
            })
          : Boolean(
              await addStoreItem({
                name: trimmedName,
                price,
                duration: duration || '-',
                type: itemData.type,
                color: colorValue,
              })
            );

        if (!didSave) {
          window.alert('項目儲存失敗，請稍後再試。');
          return;
        }

        closeItemForm();

      } catch (error) {
        console.error('Error saving store item:', error);
        window.alert('項目儲存失敗，請稍後再試。');
      } finally {
        setIsSaving(false);
      }
    },
    [activeStoreItem, addStoreItem, closeItemForm, isSaving, updateStoreItem]
  );

  const handleDeleteItem = useCallback(
    async (item: { id: string; name: string }) => {
      const shouldDelete = window.confirm(`確定要刪除「${item.name}」嗎？`);
      if (!shouldDelete) {
        return;
      }

      setDeletingItemId(item.id);

      try {
        const deleted = await deleteStoreItem(item.id);
        if (!deleted) {
          window.alert('項目刪除失敗，請稍後再試。');
        }
      } finally {
        setDeletingItemId((current) => (current === item.id ? null : current));
      }
    },
    [deleteStoreItem]
  );

  const handleDeleteClient = useCallback(
    async (client: Client) => {
      const shouldDelete = window.confirm(`確定要刪除顧客「${client.name}」嗎？`);
      if (!shouldDelete) {
        return;
      }

      const deleted = await deleteClient(client.id);
      if (!deleted) {
        window.alert('顧客刪除失敗，請稍後再試。');
        return;
      }

      setSelectedClient((current) => (current?.id === client.id ? null : current));
      setActiveClient((current) => (current?.id === client.id ? null : current));
      setIsClientDetailOpen(false);
      setIsClientModalOpen(false);
    },
    [deleteClient]
  );

  const handleCallClient = useCallback((client: Client) => {
    if (!client.phone.trim()) {
      window.alert('這位顧客尚未填寫電話。');
      return;
    }

    const shouldCall = window.confirm(`確定要撥打 ${client.name} 的電話嗎？`);
    if (!shouldCall) {
      return;
    }

    window.location.href = `tel:${client.phone.trim()}`;
  }, []);

  const handleCancelAppointment = useCallback(
    async (appointment: Appointment) => {
      const { clientName, dateStr, time } = appointment;
      const confirmMessage = `確定要取消 ${clientName} 在 ${dateStr} ${time} 的預約嗎？`;
      if (window.confirm(confirmMessage)) {
        const didCancel = await updateAppointment(appointment.id, {
          status: 'cancelled',
        });
        if (!didCancel) {
          window.alert('取消預約失敗，請稍後再試。');
          return;
        }

        setIsApptDetailOpen(false);
        setSelectedAppt(null);
      }
    },
    [updateAppointment]
  );

  const handleOpenCheckout = useCallback((appointment: Appointment) => {
    setSelectedAppt(appointment);
    setIsApptDetailOpen(false);
    setIsCheckoutModalOpen(true);
  }, []);

  const handleConfirmInventoryMovement = useCallback(
    async (movement: Omit<InventoryMovement, 'id'>) => {
      if (isInventorySaving) {
        return;
      }

      setIsInventorySaving(true);

      try {
        const savedId = await addInventoryMovement(movement);

        if (!savedId) {
          window.alert('庫存異動儲存失敗，請稍後再試。');
          return;
        }

        closeInventoryModal();
      } catch (error) {
        console.error('Error saving inventory movement:', error);
        window.alert('庫存異動儲存失敗，請稍後再試。');
      } finally {
        setIsInventorySaving(false);
      }
    },
    [addInventoryMovement, closeInventoryModal, isInventorySaving]
  );

  const handleConfirmCheckout = useCallback(
    async (checkoutDraft: Omit<CheckoutRecord, 'id'>) => {
      const appointment = selectedAppt;
      if (!appointment || isCheckoutSaving) {
        return;
      }

      setIsCheckoutSaving(true);

      try {
        const resolvedClientId =
          checkoutDraft.clientId ||
          appointment.clientId ||
          findClientByName(appointment.clientName)?.id ||
          '';

        if (!resolvedClientId) {
          window.alert('找不到對應顧客資料，請先確認顧客資料後再結帳。');
          return;
        }

        const finalizedCheckout: Omit<CheckoutRecord, 'id'> = {
          ...checkoutDraft,
          clientId: resolvedClientId,
          clientName: appointment.clientName,
          appointmentId: appointment.id,
          status: 'completed',
        };

        const transactionId = await addTransaction(finalizedCheckout);

        if (!transactionId) {
          window.alert('結帳儲存失敗，請稍後再試。');
          return;
        }

        let movementFailures = 0;

        for (const movement of buildInventoryMovementsFromCheckout(finalizedCheckout, transactionId)) {
          const savedId = await addInventoryMovement(movement);
          if (!savedId) {
            movementFailures += 1;
          }
        }

        const didUpdateAppointment = await updateAppointment(appointment.id, {
          status: 'completed',
          totalPrice: finalizedCheckout.totalAmount,
          transactionId,
        });

        setIsCheckoutModalOpen(false);
        setIsApptDetailOpen(false);
        setSelectedAppt(null);

        if (!didUpdateAppointment) {
          window.alert('交易已建立，但預約狀態更新失敗，請重新整理後確認。');
          return;
        }

        if (movementFailures > 0) {
          window.alert('結帳已完成，但部分商品出貨紀錄寫入失敗，請稍後到後台補登。');
        }
      } catch (error) {
        console.error('Error completing checkout:', error);
        window.alert('結帳儲存失敗，請稍後再試。');
      } finally {
        setIsCheckoutSaving(false);
      }
    },
    [addInventoryMovement, addTransaction, findClientByName, isCheckoutSaving, selectedAppt, updateAppointment]
  );

  const mainContentRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const checkMainScroll = useCallback(() => {
    const el = mainContentRef.current;
    if (!el) return;
    setShowScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  useEffect(() => {
    checkMainScroll();
  }, [currentView, checkMainScroll]);

  if (isAuthLoading || !user) {
    return (
      <LoginScreen
        isCheckingSession={isAuthLoading}
        isSubmitting={isSigningIn}
        errorMessage={authErrorMessage}
        defaultIdentifier={rememberedLogin?.identifier ?? ''}
        defaultPassword={rememberedLogin?.password ?? ''}
        defaultRememberDevice={Boolean(rememberedLogin)}
        onSubmit={handleSignIn}
      />
    );
  }

  if (isAccessLoading) {
    return (
      <div className="force-serif flex min-h-[100dvh] items-center justify-center bg-[#EBE6DC] px-6 py-10 text-[#4A3B32]">
        <div className="rounded-[32px] border border-[#E6DED2] bg-[#FFFCF7] px-8 py-7 text-lg font-black tracking-[0.08em] shadow-[0_20px_50px_rgba(74,59,50,0.12)]">
          正在檢查帳號權限...
        </div>
      </div>
    );
  }

  if (canBootstrapOwner && user.email) {
    return (
      <BootstrapOwnerScreen
        email={user.email}
        isSubmitting={isBootstrappingOwner}
        errorMessage={accessErrorMessage}
        onBootstrap={handleBootstrapOwner}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!isStaff && user.email) {
    return (
      <AccessDeniedScreen
        email={user.email}
        bootstrapOwnerEmail={bootstrap?.ownerEmail ?? null}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="force-serif flex h-[100dvh] flex-col bg-[#EBE6DC] text-[#4A3B32] transition-colors duration-300 selection:bg-[#4A3B32]/10">
      <Navbar
        currentMode={workspaceMode}
        currentView={currentView}
        onModeChange={handleWorkspaceModeChange}
        onViewChange={handleViewChange}
        onCalcOpen={() => setIsCalcOpen(true)}
        syncStatus={syncStatus}
        onSyncNow={syncNow}
        userEmail={user.email ? `${user.email} · ${accessRole === 'admin' ? 'ADMIN' : accessRole === 'owner' ? 'OWNER' : 'STAFF'}` : null}
        userRole={accessRole}
        onSignOut={handleSignOut}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden p-1.5 md:p-6 lg:space-x-8">
        <div
          ref={mainContentRef}
          onScroll={checkMainScroll}
          className={`custom-scrollbar ${interactionMotion.surface} flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[24px] md:rounded-[40px] border border-[#E2DCD0] bg-[#FCFAF5] shadow-[0_8px_30px_rgba(74,59,50,0.06)]`}
        >
          {currentView === 'calendar' && (
            <Calendar
              currentDate={calendarCurrentDate}
              appointments={appointments}
              storeItems={storeItems}
              isLoading={isAppointmentsLoading}
              leaveSet={leaveSet}
              onCurrentDateChange={setCalendarCurrentDate}
              onDateClick={(dateStr) => setSelectedDateStr(isExactDateString(dateStr) ? dateStr : '')}
              onAddAppt={openNewAppointmentModal}
              onToggleLeave={toggleLeave}
              onSelectAppt={(appt) => {
                setSelectedAppt(appt);
                setIsApptDetailOpen(true);
              }}
            />
          )}

          <Suspense fallback={<ViewLoader />}>
            {currentView === 'clients' && (
              <ClientList
                clients={safeClients}
                isLoading={isClientsLoading}
                isSpendingLoading={isTransactionsLoading}
                spendingByClientId={clientSpendingSummaryMap}
                onAddClient={() => {
                  setSelectedClient(null);
                  setActiveClient(null);
                  setIsClientDetailOpen(false);
                  setIsClientModalOpen(true);
                }}
                onSelectClient={(client) => {
                  const matchedClient =
                    safeClients.find((entry) => entry.id === client.id) ?? client;
                  setSelectedClient(matchedClient);
                  setIsClientDetailOpen(true);
                }}
              />
            )}

            {currentView === 'services' && (
              <ServiceList
                storeItems={storeItems}
                isLoading={isStoreItemsLoading}
                isInventoryLoading={isInventoryLoading}
                deletingItemId={deletingItemId}
                inventorySummaryByItemId={inventorySummaryByItemId}
                selectedItemId={activeStoreItem?.id}
                onAddItem={() => {
                  setActiveStoreItem(null);
                  setIsItemModalOpen(true);
                }}
                onOpenInventory={(item) => {
                  setInventoryTargetItem(item?.type === 'product' ? item : null);
                  setIsInventoryModalOpen(true);
                }}
                onSelectItem={(item) => {
                  setActiveStoreItem(item);
                  setIsItemModalOpen(true);
                }}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {currentView === 'dashboard' && (
              <div className="space-y-6 p-4 md:p-6">
                {isAdmin && bootstrap?.ownerEmail && (
                  <AccessControlPanel
                    bootstrapOwnerEmail={bootstrap.ownerEmail}
                    roles={roles}
                    isLoading={isRolesLoading}
                    onSaveRole={saveRole}
                    onRemoveRole={removeRole}
                  />
                )}
                <Dashboard
                  appointments={appointments}
                  revenues={revenues}
                  isRevenueLoading={isRevenuesLoading}
                  onAddRevenue={addRevenue}
                  onDeleteRevenue={deleteRevenue}
                  period={dashboardPeriod}
                  onPeriodChange={setDashboardPeriod}
                />
              </div>
            )}
          </Suspense>
        </div>

        {showScrollDown && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 md:bottom-8">
            <div className="animate-bounce rounded-full bg-[#4A3B32]/10 p-1.5 shadow-sm">
              <ChevronDown className="h-4 w-4 text-[#8C7A6B]" />
            </div>
          </div>
        )}
      </div>

      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />

      <NewApptModal
        isOpen={isNewApptModalOpen}
        onClose={closeNewAppointmentModal}
        selectedDateStr={selectedDateStr}
        mode={editingAppointment ? 'edit' : 'create'}
        editingAppointmentId={editingAppointment?.id ?? null}
        clients={safeClients}
        tempClientName={tempClientName}
        setTempClientName={setTempClientName}
        tempPhone={tempPhone}
        setTempPhone={setTempPhone}
        tempTime={tempTime}
        setTempTime={setTempTime}
        tempService={tempService}
        setTempService={setTempService}
        tempPrice={tempPrice}
        setTempPrice={setTempPrice}
        tempPax={tempPax}
        setTempPax={setTempPax}
        tempNotes={tempNotes}
        setTempNotes={setTempNotes}
        typingMatchedClient={typingMatchedClient}
        clientSuggestions={clientSuggestions}
        onSelectClientSuggestion={handleSelectClientSuggestion}
        isClientsLoading={isClientsLoading}
        appointments={appointments}
        storeItems={storeItems}
        isStoreItemsLoading={isStoreItemsLoading}
        onSave={handleSaveAppointment}
      />

      <AppointmentDetailModal
        isOpen={isApptDetailOpen}
        appointment={selectedAppt}
        onClose={() => {
          setIsApptDetailOpen(false);
          setSelectedAppt(null);
        }}
        onEditAppointment={openEditAppointmentModal}
        onCheckoutAppointment={handleOpenCheckout}
        onCancelAppointment={handleCancelAppointment}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        appointment={selectedAppt}
        storeItems={storeItems}
        isSaving={isCheckoutSaving}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirm={handleConfirmCheckout}
      />

      <ClientDetailModal
        isOpen={isClientDetailOpen}
        client={selectedClient}
        spendingSummary={selectedClient ? clientSpendingSummaryMap[selectedClient.id] ?? null : null}
        isSpendingLoading={isTransactionsLoading}
        onClose={() => {
          setIsClientDetailOpen(false);
          setSelectedClient(null);
        }}
        onEdit={(client) => {
          setActiveClient(client);
          setIsClientDetailOpen(false);
          setIsClientModalOpen(true);
        }}
        onDelete={handleDeleteClient}
        onCall={handleCallClient}
      />

      <ClientForm
        isOpen={isClientModalOpen}
        initialData={activeClient ?? undefined}
        onClose={closeClientForm}
        onConfirm={handleConfirmClient}
      />

      <ItemModal
        isOpen={isItemModalOpen}
        initialData={activeStoreItem}
        onClose={closeItemForm}
        onConfirm={handleConfirmItem}
      />

      <InventoryMovementModal
        isOpen={isInventoryModalOpen}
        products={storeItems.filter((item) => item.type === 'product')}
        initialItem={inventoryTargetItem}
        isSaving={isInventorySaving}
        onClose={closeInventoryModal}
        onConfirm={handleConfirmInventoryMovement}
      />
    </div>
  );
}
