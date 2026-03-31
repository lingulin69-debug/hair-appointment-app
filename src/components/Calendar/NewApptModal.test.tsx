import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewApptModal } from './NewApptModal';
import type { Appointment, Client, StoreItem } from '../../types';

const clients: Client[] = [
  {
    id: 'client-1',
    name: 'Alice',
    phone: '0912345678',
    preference: '',
    product: '',
    lastVisit: '2026-03-27',
  },
];

const storeItems: StoreItem[] = [
  {
    id: 'service-1',
    name: 'Cut',
    price: 1200,
    duration: '60',
    type: 'service',
  },
];

const appointments: Appointment[] = [
  {
    id: 'appt-1',
    clientId: 'client-1',
    clientName: 'Alice',
    phone: '0912345678',
    time: '10:00',
    service: 'Cut',
    pax: 1,
    notes: '',
    dateStr: '2026-03-29',
    totalPrice: 1200,
    status: 'pending',
    rescheduleCount: 0,
  },
];

function renderModal(isOpen: boolean) {
  return render(
    <NewApptModal
      isOpen={isOpen}
      onClose={vi.fn()}
      selectedDateStr="2026-03-29"
      clients={clients}
      tempClientName=""
      setTempClientName={vi.fn()}
      tempPhone=""
      setTempPhone={vi.fn()}
      tempTime=""
      setTempTime={vi.fn()}
      tempService="Cut"
      setTempService={vi.fn()}
      tempPrice={1200}
      setTempPrice={vi.fn()}
      tempPax={1}
      setTempPax={vi.fn()}
      tempNotes=""
      setTempNotes={vi.fn()}
      typingMatchedClient={null}
      clientSuggestions={clients}
      onSelectClientSuggestion={vi.fn()}
      appointments={appointments}
      storeItems={storeItems}
      isClientsLoading={false}
      isStoreItemsLoading={false}
      onSave={vi.fn()}
    />
  );
}

describe('NewApptModal', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders safely after opening from a previously closed state', async () => {
    const { rerender } = renderModal(false);

    expect(screen.queryByText('新增預約')).not.toBeInTheDocument();

    rerender(
      <NewApptModal
        isOpen={true}
        onClose={vi.fn()}
        selectedDateStr="2026-03-29"
        clients={clients}
        tempClientName=""
        setTempClientName={vi.fn()}
        tempPhone=""
        setTempPhone={vi.fn()}
        tempTime=""
        setTempTime={vi.fn()}
        tempService="Cut"
        setTempService={vi.fn()}
        tempPrice={1200}
        setTempPrice={vi.fn()}
        tempPax={1}
        setTempPax={vi.fn()}
        tempNotes=""
        setTempNotes={vi.fn()}
        typingMatchedClient={null}
        clientSuggestions={clients}
        onSelectClientSuggestion={vi.fn()}
        appointments={appointments}
        storeItems={storeItems}
        isClientsLoading={false}
        isStoreItemsLoading={false}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('新增預約')).toBeInTheDocument();
    });
  });

  it('includes extended hour options from 08 to 23', async () => {
    renderModal(true);

    await waitFor(() => {
      expect(screen.getAllByRole('option', { name: '08' }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('option', { name: '23' }).length).toBeGreaterThan(0);
    });
  });
});
