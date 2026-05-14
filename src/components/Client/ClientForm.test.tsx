import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientForm from './ClientForm';
import type { Client } from '../../types';

const client: Client = {
  id: 'client-1',
  name: '測試顧客',
  phone: '0912345678',
  preference: '怕熱',
  product: '深層護髮',
  lastVisit: '2026-05-14',
  visitCount: 3,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

describe('ClientForm', () => {
  it('submits only editable client fields in edit mode', () => {
    const onConfirm = vi.fn();

    render(
      <ClientForm
        isOpen={true}
        initialData={client}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '儲存顧客資料' }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: '測試顧客',
      phone: '0912345678',
      preference: '怕熱',
      product: '深層護髮',
    });
  });
});