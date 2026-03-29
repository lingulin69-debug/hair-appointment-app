import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/UI/Navbar';
import { Calendar } from './components/Calendar/Calendar';
import { CalculatorModal } from './components/UI/CalculatorModal';
import { useAppointments } from './hooks/useAppointments';
import { useClients } from './hooks/useClients';
import { useLeaves } from './hooks/useLeaves';
import { useStoreItems } from './hooks/useStoreItems';
import { NewApptModal } from './components/Calendar/NewApptModal';
import { AppointmentDetailModal } from './components/Calendar/AppointmentDetailModal';
import ClientForm from './components/Client/ClientForm';
import { ClientDetailModal } from './components/Client/ClientDetailModal';
import { ItemModal } from './components/Services/ItemModal';
import type { DashboardPeriod } from './components/Dashboard/Dashboard';
import type { Appointment, Client, StoreItem } from './types';
import { interactionMotion } from './styles/interactionMotion';
import {
  getDateRangeForMonth,
  getDateRangeForTrailingDays,
  getDateRangeForTrailingMonths,
  isExactDateString,
} from './utils/schedule';

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

type ItemFormData = {
  name: string;
  price: string;
  duration: string;
  type: 'service' | 'product';
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
  const [currentView, setCurrentView] = useState<View>('calendar');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [activeStoreItem, setActiveStoreItem] = useState<StoreItem | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isApptDetailOpen, setIsApptDetailOpen] = useState(false);
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isNewApptModalOpen, setIsNewApptModalOpen] = useState(false);
  const [calendarCurrentDate, setCalendarCurrentDate] = useState(() => new Date());
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('7d');
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [tempClientName, setTempClientName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempTime, setTempTime] = useState('10:00');
  const [tempService, setTempService] = useState('');
  const [tempPrice, setTempPrice] = useState(0);
  const [tempPax, setTempPax] = useState(1);
  const [tempNotes, setTempNotes] = useState('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const shouldLoadCalendarData = currentView === 'calendar' || isNewApptModalOpen;
  const shouldLoadAppointments =
    shouldLoadCalendarData || currentView === 'dashboard' || isApptDetailOpen;
  const shouldLoadStoreItems =
    currentView === 'services' || isItemModalOpen || isNewApptModalOpen;
  const shouldLoadClients =
    currentView === 'clients' ||
    isClientDetailOpen ||
    isClientModalOpen ||
    isNewApptModalOpen;

  const calendarDateRange = useMemo(
    () => getDateRangeForMonth(calendarCurrentDate),
    [calendarCurrentDate]
  );
  const dashboardDateRange = useMemo(() => {
    switch (dashboardPeriod) {
      case '30d':
        return getDateRangeForTrailingDays(30, new Date());
      case '6m':
        return getDateRangeForTrailingMonths(6, new Date());
      case '1y':
        return getDateRangeForTrailingMonths(12, new Date());
      case '7d':
      default:
        return getDateRangeForTrailingDays(7, new Date());
    }
  }, [dashboardPeriod]);
  const activeAppointmentRange =
    currentView === 'dashboard' && !isNewApptModalOpen
      ? dashboardDateRange
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
  } = useClients({ enabled: shouldLoadClients });
  const { leaveSet, toggleLeave } = useLeaves({
    enabled: currentView === 'calendar',
    range: calendarDateRange,
  });

  const defaultService = serviceItems[0] ?? null;
  const safeClients = useMemo(
    () => (Array.isArray(clients) ? clients.filter(isUsableClient) : []),
    [clients]
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
    setTempTime('10:00');
    setTempService(defaultService?.name ?? '');
    setTempPrice(defaultService?.price ?? 0);
    setTempPax(1);
    setTempNotes('');
  }, [defaultService]);

  useEffect(() => {
    if (!defaultService) {
      return;
    }

    const matchedService = serviceItems.find((item) => item.name === tempService);
    if (!matchedService) {
      setTempService(defaultService.name);
      setTempPrice(defaultService.price);
      return;
    }

    if (matchedService.price !== tempPrice) {
      setTempPrice(matchedService.price);
    }
  }, [defaultService, serviceItems, tempPrice, tempService]);

  const closeNewAppointmentModal = useCallback(() => {
    setIsNewApptModalOpen(false);
    resetAppointmentDraft();
  }, [resetAppointmentDraft]);

  const handleSelectClientSuggestion = useCallback((client: Client) => {
    setTempClientName(client.name);
    setTempPhone(client.phone);
  }, []);

  const openNewAppointmentModal = useCallback(
    (dateStr: string) => {
      setSelectedDateStr(isExactDateString(dateStr) ? dateStr : '');
      setIsNewApptModalOpen(true);
      resetAppointmentDraft();
    },
    [resetAppointmentDraft]
  );

  const closeClientForm = useCallback(() => {
    setIsClientModalOpen(false);
    setActiveClient(null);
  }, []);

  const closeItemForm = useCallback(() => {
    setIsItemModalOpen(false);
    setActiveStoreItem(null);
  }, []);

  const handleViewChange = useCallback(
    (view: string) => {
      const nextView = view as View;
      if (nextView === currentView) {
        return;
      }

      setCurrentView(nextView);
      setSelectedClient(null);
      setActiveClient(null);
      setActiveStoreItem(null);
      setIsClientDetailOpen(false);
      setIsClientModalOpen(false);
      setIsItemModalOpen(false);
      setIsCalcOpen(false);
    },
    [currentView]
  );

  const handleSaveAppointment = useCallback(async () => {
    try {
      const trimmedClientName = tempClientName.trim();
      const trimmedPhone = tempPhone.trim();
      const matchedService =
        serviceItems.find((item) => item.name === tempService) ?? defaultService;
      const isTimeOccupied = appointments.some(
        (appointment) =>
          appointment.dateStr === selectedDateStr && appointment.time === tempTime
      );

      if (
        !trimmedClientName ||
        !selectedDateStr ||
        !isExactDateString(selectedDateStr) ||
        !matchedService ||
        !tempTime ||
        isTimeOccupied
      ) {
        return;
      }

      const client = await ensureClient(trimmedClientName, {
        lastVisit: selectedDateStr,
        phone: trimmedPhone,
      });

      if (!client) {
        return;
      }

      const appointmentId = await addAppointment({
        clientId: client.id,
        clientName: client.name,
        phone: trimmedPhone,
        dateStr: selectedDateStr,
        time: tempTime,
        service: matchedService.name,
        pax: tempPax,
        notes: tempNotes.trim(),
        totalPrice: tempPrice * tempPax,
        status: 'pending',
      });

      if (!appointmentId) {
        return;
      }

      closeNewAppointmentModal();
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  }, [
    addAppointment,
    appointments,
    closeNewAppointmentModal,
    defaultService,
    ensureClient,
    selectedDateStr,
    serviceItems,
    tempClientName,
    tempNotes,
    tempPax,
    tempPhone,
    tempService,
    tempTime,
  ]);

  const handleConfirmClient = useCallback(
    async (clientData: Omit<Client, 'id'>) => {
      try {
        const trimmedName = clientData.name.trim();
        if (!trimmedName) {
          return;
        }

        const payload = {
          ...clientData,
          name: trimmedName,
          phone: clientData.phone.trim(),
          preference: clientData.preference.trim(),
          product: clientData.product.trim(),
        };

        if (activeClient) {
          const updated = await updateClient(activeClient.id, payload);
          if (!updated) {
            return;
          }
        } else {
          const id = await addClient(payload);
          if (!id) {
            return;
          }
        }

        closeClientForm();
      } catch (error) {
        console.error('Error saving client:', error);
      }
    },
    [activeClient, addClient, closeClientForm, updateClient]
  );

  const handleConfirmItem = useCallback(
    async (itemData: ItemFormData) => {
      try {
        const trimmedName = itemData.name.trim();
        const price = Number(itemData.price);
        const duration = itemData.type === 'service' ? itemData.duration.trim() : '-';

        if (!trimmedName || Number.isNaN(price) || price < 0) {
          return;
        }

        if (activeStoreItem) {
          const updated = await updateStoreItem(activeStoreItem.id, {
            name: trimmedName,
            price,
            duration: duration || '-',
            type: itemData.type,
          });

          if (!updated) {
            return;
          }
        } else {
          const id = await addStoreItem({
            name: trimmedName,
            price,
            duration: duration || '-',
            type: itemData.type,
          });

          if (!id) {
            return;
          }
        }

        closeItemForm();
      } catch (error) {
        console.error('Error saving store item:', error);
      }
    },
    [activeStoreItem, addStoreItem, closeItemForm, updateStoreItem]
  );

  const handleDeleteItem = useCallback(
    async (item: { id: string; name: string }) => {
      const shouldDelete = window.confirm(`確定要刪除「${item.name}」嗎？`);
      if (!shouldDelete) {
        return;
      }

      setDeletingItemId(item.id);

      try {
        await deleteStoreItem(item.id);
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
        await deleteAppointment(appointment.id);
        setIsApptDetailOpen(false);
        setSelectedAppt(null);
      }
    },
    [deleteAppointment]
  );

  return (
    <div className="force-serif flex h-[100dvh] flex-col bg-[#EBE6DC] text-[#4A3B32] transition-colors duration-300 selection:bg-[#4A3B32]/10">
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onCalcOpen={() => setIsCalcOpen(true)}
      />

      <div className="relative flex flex-1 overflow-hidden p-3 md:p-6 lg:space-x-8">
        <div
          className={`custom-scrollbar ${interactionMotion.surface} flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[40px] border border-[#E2DCD0] bg-[#FCFAF5] shadow-[0_8px_30px_rgba(74,59,50,0.06)]`}
        >
          <div
            className={currentView === 'calendar' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
          >
            <Calendar
              currentDate={calendarCurrentDate}
              appointments={appointments}
              isLoading={isAppointmentsLoading}
              leaveSet={leaveSet}
              onCurrentDateChange={setCalendarCurrentDate}
              onDateClick={openNewAppointmentModal}
              onAddAppt={openNewAppointmentModal}
              onToggleLeave={toggleLeave}
              onSelectAppt={(appt) => {
                setSelectedAppt(appt);
                setIsApptDetailOpen(true);
              }}
            />
          </div>

          <Suspense fallback={<ViewLoader />}>
            {currentView === 'clients' && (
              <ClientList
                clients={safeClients}
                isLoading={isClientsLoading}
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
                deletingItemId={deletingItemId}
                selectedItemId={activeStoreItem?.id}
                onAddItem={() => {
                  setActiveStoreItem(null);
                  setIsItemModalOpen(true);
                }}
                onSelectItem={(item) => {
                  setActiveStoreItem(item);
                  setIsItemModalOpen(true);
                }}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {currentView === 'dashboard' && (
              <Dashboard
                appointments={appointments.map((appointment) => ({
                  id: appointment.id,
                  date: appointment.dateStr,
                  time: appointment.time,
                  customerName: appointment.clientName,
                  service: appointment.service,
                  amount: appointment.totalPrice,
                  status: appointment.status,
                }))}
                period={dashboardPeriod}
                onPeriodChange={setDashboardPeriod}
              />
            )}
          </Suspense>
        </div>
      </div>

      <CalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />

      <NewApptModal
        isOpen={isNewApptModalOpen}
        onClose={closeNewAppointmentModal}
        selectedDateStr={selectedDateStr}
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
        onCancelAppointment={handleCancelAppointment}
      />

      <ClientDetailModal
        isOpen={isClientDetailOpen}
        client={selectedClient}
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
    </div>
  );
}
