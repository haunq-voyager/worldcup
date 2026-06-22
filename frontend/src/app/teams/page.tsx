'use client';

import { useState, useEffect } from 'react';
import { teamsApi } from '@/lib/api';
import TeamCard from '@/components/TeamCard';
import type { Team } from '@/types';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const CONF_DOT: Record<string, string> = {
  UEFA: 'bg-blue-500', CONMEBOL: 'bg-green-500', CONCACAF: 'bg-red-500',
  AFC: 'bg-amber-500', CAF: 'bg-orange-500', OFC: 'bg-purple-500',
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(loadTeams, 300);
    return () => clearTimeout(t);
  }, [search, groupFilter]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamsApi.list({ search: search || undefined, group: groupFilter || undefined });
      setTeams(data);
    } catch {
      setError('Không thể tải danh sách đội tuyển.');
    } finally {
      setLoading(false);
    }
  };

  const grouped = teams.reduce<Record<string, Team[]>>((acc, t) => {
    const g = t.group_name || 'Khác';
    (acc[g] ??= []).push(t);
    return acc;
  }, {});

  const visibleGroups = groupFilter
    ? [groupFilter]
    : GROUPS.filter((g) => grouped[g]);

  const totalTeams = teams.length;
  const confCounts = teams.reduce<Record<string, number>>((acc, t) => {
    if (t.confederation) acc[t.confederation] = (acc[t.confederation] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 mb-1">Đội tuyển tham dự</h1>
        <p className="text-gray-400 text-sm">FIFA World Cup 2026 · {totalTeams} đội từ 12 bảng</p>

        {/* Confederation legend */}
        {!search && !groupFilter && (
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(confCounts).sort(([,a],[,b]) => b - a).map(([conf, count]) => (
              <div key={conf} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CONF_DOT[conf] || 'bg-gray-400'}`} />
                {conf} ({count})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="🔍  Tìm kiếm đội tuyển..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        >
          <option value="">Tất cả bảng</option>
          {GROUPS.map((g) => <option key={g} value={g}>Bảng {g}</option>)}
        </select>
        {(search || groupFilter) && (
          <button onClick={() => { setSearch(''); setGroupFilter(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(4)].map((_, gi) => (
            <div key={gi} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="h-5 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse shimmer-bg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : visibleGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🔍</p>
          <p>Không tìm thấy đội tuyển nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const groupTeams = grouped[group] ?? [];
            if (!groupTeams.length) return null;
            return (
              <div key={group} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-950 to-blue-900">
                  <span className="font-black text-white text-sm">Bảng {group}</span>
                  <span className="text-blue-300 text-xs">{groupTeams.length} đội</span>
                  <div className="flex gap-2 ml-auto">
                    {Array.from(new Set(groupTeams.map((t) => t.confederation).filter((c): c is string => !!c))).map((conf) => (
                      <span key={conf} className="text-[10px] text-blue-200 opacity-70">{conf}</span>
                    ))}
                  </div>
                </div>

                {/* 4-column team grid — always 4 per row on sm+ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-gray-100">
                  {groupTeams.map((team) => (
                    <div key={team.id} className="p-3">
                      <TeamCard team={team} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
