import React, { useMemo, useState } from 'react';
import {
  Clock,
  DollarSign,
  Package,
  Pencil,
  Plus,
  Scissors,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { ItemType, StoreItem } from '../../types';
import { interactionMotion } from '../../styles/interactionMotion';

type FilterId = 'all' | ItemType;

interface ServiceListProps {
  storeItems: StoreItem[];
  isLoading: boolean;
  onAddItem?: () => void;
  onSelectItem?: (item: StoreItem) => void;
  onDeleteItem?: (item: StoreItem) => void | Promise<void>;
  selectedItemId?: string;
  deletingItemId?: string | null;
}

const FILTERS: Array<{
  id: FilterId;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'all', label: '全部', icon: <Package className="h-4 w-4" /> },
  { id: 'service', label: '服務', icon: <Scissors className="h-4 w-4" /> },
  { id: 'product', label: '商品', icon: <ShoppingBag className="h-4 w-4" /> },
];

function isStoreItem(value: unknown): value is StoreItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoreItem>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.price === 'number' &&
    typeof candidate.duration === 'string' &&
    (candidate.type === 'service' || candidate.type === 'product')
  );
}

export const ServiceList: React.FC<ServiceListProps> = ({
  storeItems,
  isLoading,
  onAddItem,
  onSelectItem,
  onDeleteItem,
  selectedItemId,
  deletingItemId,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  const safeStoreItems = useMemo(
    () => (Array.isArray(storeItems) ? storeItems.filter(isStoreItem) : []),
    [storeItems]
  );

  const serviceItems = useMemo(
    () => safeStoreItems.filter((item) => item.type === 'service'),
    [safeStoreItems]
  );

  const productItems = useMemo(
    () => safeStoreItems.filter((item) => item.type === 'product'),
    [safeStoreItems]
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return safeStoreItems;
    }

    return safeStoreItems.filter((item) => item.type === activeFilter);
  }, [activeFilter, safeStoreItems]);

  return (
    <div className="min-h-full bg-[#FCFAF5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.32em] text-[#8C7A6B]">
              服務管理
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#4A3B32] md:text-4xl">
              服務與商品
            </h1>
            <p className="mt-2 text-sm text-[#7A6B5D]">
              管理服務項目、商品售價與服務時長。
            </p>
          </div>

          {onAddItem && (
            <button
              type="button"
              onClick={onAddItem}
              className={`inline-flex items-center gap-2 rounded-full bg-[#4A3B32] px-5 py-3 text-white shadow-[0_16px_30px_rgba(74,59,50,0.18)] ${interactionMotion.button}`}
            >
              <Plus className="h-5 w-5" />
              <span className="font-bold tracking-wide">新增項目</span>
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 font-bold ${interactionMotion.subtleButton} ${
                  isActive
                    ? 'bg-[#4A3B32] text-white shadow-md'
                    : 'border border-[#E8E3D8] bg-white text-[#4A3B32] hover:border-[#4A3B32]/30'
                }`}
              >
                {filter.icon}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-4 py-3 text-sm font-bold text-[#7A6B5D]">
            正在同步服務與商品資料...
          </div>
        )}

        {safeStoreItems.length === 0 ? (
          isLoading ? (
            <ServiceListSkeleton />
          ) : (
            <EmptyState message="目前還沒有服務或商品資料。" />
          )
        ) : activeFilter === 'all' ? (
          <div className="space-y-8">
            <StoreItemSection
              title="服務"
              icon={<Scissors className="h-5 w-5" />}
              items={serviceItems}
              emptyMessage="目前沒有服務項目。"
              onSelectItem={onSelectItem}
              onDeleteItem={onDeleteItem}
              selectedItemId={selectedItemId}
              deletingItemId={deletingItemId}
            />
            <StoreItemSection
              title="商品"
              icon={<ShoppingBag className="h-5 w-5" />}
              items={productItems}
              emptyMessage="目前沒有商品項目。"
              onSelectItem={onSelectItem}
              onDeleteItem={onDeleteItem}
              selectedItemId={selectedItemId}
              deletingItemId={deletingItemId}
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            message={activeFilter === 'service' ? '目前沒有服務項目。' : '目前沒有商品項目。'}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedItemId}
                isDeleting={item.id === deletingItemId}
                onSelectItem={onSelectItem}
                onDeleteItem={onDeleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface StoreItemSectionProps {
  title: string;
  icon: React.ReactNode;
  items: StoreItem[];
  emptyMessage: string;
  onSelectItem?: (item: StoreItem) => void;
  onDeleteItem?: (item: StoreItem) => void | Promise<void>;
  selectedItemId?: string;
  deletingItemId?: string | null;
}

const StoreItemSection: React.FC<StoreItemSectionProps> = ({
  title,
  icon,
  items = [],
  emptyMessage,
  onSelectItem,
  onDeleteItem,
  selectedItemId,
  deletingItemId,
}) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-[#4A3B32]">{icon}</div>
        <h2 className="text-xl font-black text-[#4A3B32]">{title}</h2>
        <div className="h-px flex-1 bg-[#E8E3D8]" />
      </div>

      {items.length === 0 ? (
        <EmptyState message={emptyMessage} compact />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StoreItemCard
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              isDeleting={item.id === deletingItemId}
              onSelectItem={onSelectItem}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </div>
      )}
    </section>
  );
};

interface StoreItemCardProps {
  item: StoreItem;
  isSelected: boolean;
  isDeleting: boolean;
  onSelectItem?: (item: StoreItem) => void;
  onDeleteItem?: (item: StoreItem) => void | Promise<void>;
}

const StoreItemCard: React.FC<StoreItemCardProps> = ({
  item,
  isSelected,
  isDeleting,
  onSelectItem,
  onDeleteItem,
}) => {
  const isService = item.type === 'service';

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        isSelected
          ? 'border-[#4A3B32] shadow-md ring-2 ring-[#4A3B32]/20'
          : `border-[#E8E3D8] ${interactionMotion.card}`
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold text-[#4A3B32]">
            {item.name}
          </div>
          <div className="mt-1 text-sm text-[#8C7A6B]">
            {isService ? '服務項目' : '商品項目'}
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-[#7A6B5D]">
          <Clock className="h-4 w-4" />
          <span>{isService ? item.duration : '不適用'}</span>
        </div>
        <div className="flex items-center gap-2 text-lg font-bold text-[#4A3B32]">
          <DollarSign className="h-5 w-5" />
          <span>NT$ {item.price.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {onSelectItem && (
          <button
            type="button"
            onClick={() => onSelectItem(item)}
            className={`flex-1 rounded-xl py-2.5 font-bold ${interactionMotion.subtleButton} ${
              isSelected
                ? 'bg-[#4A3B32] text-white'
                : 'bg-[#F4F0EA] text-[#4A3B32] hover:bg-[#E8E3D8]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              編輯
            </span>
          </button>
        )}

        {onDeleteItem && (
          <button
            type="button"
            onClick={() => onDeleteItem(item)}
            disabled={isDeleting}
            className={`inline-flex items-center gap-1 rounded-xl border border-[#E5D6C5] px-4 py-2.5 text-sm font-bold text-[#9A4F44] hover:border-[#C75D4E] hover:bg-[#FFF4F2] disabled:cursor-not-allowed disabled:opacity-60 ${interactionMotion.subtleButton}`}
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? '刪除中...' : '刪除'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  message: string;
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, compact = false }) => {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] text-center text-[#7A6B5D] ${
        compact ? 'px-4 py-6' : 'px-6 py-12'
      }`}
    >
      <p className="text-sm font-medium md:text-base">{message}</p>
    </div>
  );
};

const ServiceListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-[#E8E3D8] bg-white p-4"
        >
          <div className="mb-4 h-6 w-2/3 rounded bg-[#EFE7DB]" />
          <div className="mb-2 h-4 w-1/3 rounded bg-[#F4F0EA]" />
          <div className="mb-2 h-4 w-1/2 rounded bg-[#F4F0EA]" />
          <div className="h-5 w-1/3 rounded bg-[#EFE7DB]" />
        </div>
      ))}
    </div>
  );
};
