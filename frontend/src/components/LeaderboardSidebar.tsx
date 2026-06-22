'use client';

import { useState, useEffect, useCallback } from 'react';
import { leaderboardApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { LeaderboardEntry } from '@/types';
import clsx from 'clsx';

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardSidebar({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await leaderboardApi.get(1, 15);
      setLeaders(res.data.data);
      setMyRank(res.current_user_rank);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
          🏆 Bảng xếp hạng
        </h2>
        <div className="flex items-center gap-1.5">
          {user && myRank && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
              #{myRank}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title="Đóng bảng xếp hạng"
              aria-label="Đóng bảng xếp hạng"
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors text-xs font-bold leading-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* My rank highlight */}
      {user && myRank && (
        <div className="mb-3 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl text-white">
          <p className="text-[10px] text-blue-200 font-medium">Điểm của bạn</p>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold truncate max-w-[90px]">{user.name}</span>
            </div>
            <span className="text-sm font-black">{user.total_points}pts</span>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Chưa có dữ liệu</p>
      ) : (
        <div className="space-y-0.5">
          {leaders.map((entry) => {
            const isMe = user?.id === entry.id;
            return (
              <div
                key={entry.id}
                className={clsx(
                  'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors',
                  isMe ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                )}
              >
                {/* Rank */}
                <div className="w-6 text-center flex-shrink-0">
                  {entry.rank <= 3
                    ? <span className="text-sm">{RANK_ICONS[entry.rank]}</span>
                    : <span className="text-xs font-bold text-gray-400">{entry.rank}</span>
                  }
                </div>

                {/* Avatar */}
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0',
                  isMe
                    ? 'bg-blue-600 text-white'
                    : entry.rank === 1 ? 'bg-yellow-400 text-yellow-900'
                    : entry.rank === 2 ? 'bg-gray-300 text-gray-700'
                    : entry.rank === 3 ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-xs font-semibold truncate',
                    isMe ? 'text-blue-700' : 'text-gray-800'
                  )}>
                    {entry.name}
                    {isMe && <span className="ml-1 text-blue-400 font-normal">(bạn)</span>}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {entry.correct_predictions}/{entry.total_predictions} đúng
                  </p>
                </div>

                {/* Points */}
                <div className="flex-shrink-0 text-right">
                  <span className={clsx(
                    'text-xs font-black',
                    entry.rank === 1 ? 'text-yellow-500' :
                    isMe ? 'text-blue-600' : 'text-gray-700'
                  )}>
                    {entry.total_points}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
