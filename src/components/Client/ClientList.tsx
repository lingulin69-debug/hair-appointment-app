import React, { useMemo, useState } from 'react';
import { Phone, Search, UserPlus, UsersRound } from 'lucide-react';
import type { Client } from '../../types';
import { interactionMotion } from '../../styles/interactionMotion';

interface ClientListProps {
  clients: Client[];
  isLoading: boolean;
  onAddClient?: () => void;
  onSelectClient?: (client: Client) => void;
}

function getClientBadge(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }

  const firstChar = trimmed[0];
  return /[\u4e00-\u9fff]/.test(firstChar) ? firstChar : firstChar.toUpperCase();
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  isLoading,
  onAddClient,
  onSelectClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const matchName = client.name.toLowerCase().includes(query);
      const matchPhone = client.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''));
      return matchName || matchPhone;
    });
  }, [clients, searchQuery]);

  return (
    <div className="min-h-full bg-[#FCFAF5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[30px] border border-[#DDD4C8] bg-[#F7F1E7] px-5 py-5 shadow-[0_16px_40px_rgba(74,59,50,0.06)] md:px-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-bold tracking-[0.32em] text-[#8C7A6B]">
                顧客目錄
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#4A3B32] md:text-4xl">
                顧客資料一覽
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-[#7A6B5D] md:text-base">
                卡片只保留姓名與電話，點擊後開啟詳細資料視窗。
              </p>
            </div>

            {onAddClient && (
              <button
                type="button"
                onClick={onAddClient}
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-5 py-3 text-white shadow-[0_16px_30px_rgba(74,59,50,0.18)] ${interactionMotion.button}`}
              >
                <UserPlus className="h-5 w-5" />
                <span className="font-bold tracking-wide">新增顧客</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7A6B5D]" />
            <input
              type="text"
              placeholder="搜尋姓名或電話"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-[#E8E3D8] bg-white py-3 pl-10 pr-4 text-[#4A3B32] placeholder:text-[#9B8B7D] outline-none transition focus:border-[#4A3B32] focus:ring-2 focus:ring-[#DCCFBD]"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1E9DD] px-4 py-2 text-sm font-bold text-[#6F6257]">
            <UsersRound className="h-4 w-4" />
            共 {filteredClients.length} 位顧客
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[24px] border border-[#E3DACD] bg-white/75"
              />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#DCCFBD] bg-[#F7F1E8] py-16 text-center">
            <p className="text-lg font-semibold text-[#7A6B5D]">
              {searchQuery ? '找不到符合條件的顧客。' : '目前還沒有顧客資料。'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelectClient?.(client)}
                className={`flex items-center gap-4 rounded-[24px] border border-[#DDD4C8] bg-white px-4 py-4 text-left shadow-[0_12px_30px_rgba(74,59,50,0.05)] ${interactionMotion.card}`}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EADFD0] text-xl font-black text-[#4A3B32]">
                  {getClientBadge(client.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-black text-[#4A3B32]">
                    {client.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#7A6B5D]">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="truncate">{client.phone || '尚未填寫電話'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#8C7A6B]">
                    <span>{client.lastVisit ? `上次到訪 ${client.lastVisit}` : '尚無到訪紀錄'}</span>
                    {client.visitCount != null && client.visitCount > 0 && (
                      <span className="rounded-full bg-[#F1E9DD] px-2 py-0.5 font-bold text-[#6F6257]">
                        共 {client.visitCount} 次
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
