'use client';

import { useState, useEffect } from 'react';
import { leaderboardApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { LeaderboardEntry } from '@/types';
import clsx from 'clsx';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-gray-300 text-gray-800',
  3: 'bg-amber-600 text-white',
};

const RANK_ICONS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const ROUND_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Tổng' },
  { value: 'group', label: 'Vòng bảng' },
  { value: 'round_of_32', label: 'Vòng 32 đội' },
  { value: 'round_of_16', label: 'Vòng 1/8' },
  { value: 'quarter_final', label: 'Tứ kết' },
  { value: 'semi_final', label: 'Bán kết' },
  { value: 'third_place', label: 'Tranh hạng 3' },
  { value: 'final', label: 'Chung kết' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [round, setRound] = useState('');

  useEffect(() => {
    loadLeaderboard(page, round);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, round]);

  const loadLeaderboard = async (p: number, r: string) => {
    setLoading(true);
    try {
      const res = await leaderboardApi.get(p, 20, r);
      const paginated = res.data;
      setLeaders(paginated.data as unknown as LeaderboardEntry[]);
      setTotalPages(paginated.last_page);
      setCurrentUserRank(res.current_user_rank);
    } finally {
      setLoading(false);
    }
  };

  const selectRound = (r: string) => {
    setPage(1);
    setRound(r);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bảng xếp hạng</h1>
        <p className="text-gray-500">Xếp hạng theo vcoins — tổng hoặc từng vòng đấu</p>
      </div>

      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {ROUND_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => selectRound(t.value)}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              round === t.value
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Your rank */}
      {user && currentUserRank && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 mb-6 text-white flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">Vị trí của bạn</p>
            <p className="text-3xl font-bold">#{currentUserRank}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-sm">{user.name}</p>
            <p className="text-2xl font-bold">{user.total_points} vcoins</p>
            <p className="text-blue-200 text-xs">{user.correct_predictions}/{user.total_predictions} đúng</p>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Người chơi</div>
          <div className="col-span-3 hidden sm:block">Email</div>
          <div className="col-span-2 text-center">Vcoins</div>
          <div className="col-span-2 text-center hidden sm:block">Đúng</div>
          <div className="col-span-2 text-center sm:hidden">Tỷ lệ</div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 px-4 py-4 gap-2 animate-pulse">
                <div className="col-span-1 h-6 bg-gray-100 rounded mx-auto w-6" />
                <div className="col-span-5 h-6 bg-gray-100 rounded" />
                <div className="col-span-2 h-6 bg-gray-100 rounded mx-auto w-12" />
                <div className="col-span-2 h-6 bg-gray-100 rounded mx-auto w-10" />
                <div className="col-span-2 h-6 bg-gray-100 rounded mx-auto w-12" />
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Chưa có người chơi nào.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leaders.map((entry) => {
              const isCurrentUser = user?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  className={clsx(
                    'grid grid-cols-12 px-4 py-3 items-center transition-colors',
                    isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'
                  )}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex justify-center">
                    {entry.rank <= 3 ? (
                      <span className={clsx('w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold', RANK_STYLES[entry.rank])}>
                        {RANK_ICONS[entry.rank]}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-500">{entry.rank}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={clsx('text-sm font-semibold truncate', isCurrentUser ? 'text-blue-700' : 'text-gray-800')}>
                        {entry.name}
                        {isCurrentUser && <span className="ml-1 text-xs text-blue-400">(bạn)</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate sm:hidden">{entry.email}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-span-3 hidden sm:flex items-center min-w-0">
                    <span className="text-xs text-gray-500 truncate">{entry.email}</span>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-bold text-gray-900">{entry.total_points}</span>
                    <span className="text-xs text-gray-400 ml-1">vcoins</span>
                  </div>

                  {/* Correct (desktop) / Accuracy (mobile) */}
                  <div className="col-span-2 text-center hidden sm:block text-sm text-gray-600">
                    {entry.correct_predictions}<span className="text-gray-400">/{entry.total_predictions}</span>
                  </div>
                  <div className="col-span-2 text-center sm:hidden">
                    <span className={clsx(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      entry.accuracy >= 70 ? 'bg-green-100 text-green-700' :
                      entry.accuracy >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {entry.accuracy}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">Trang {page}/{totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Tiếp
          </button>
        </div>
      )}
    </div>
  );
}
