'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { matchesApi, predictionsApi } from '@/lib/api';
import type { Prediction } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import MatchCard from '@/components/MatchCard';
import HeroBanner from '@/components/HeroBanner';
import dynamic from 'next/dynamic';
import type { WorldCupMatch } from '@/types';
import UserAvatar from '@/components/UserAvatar';
import { vnDateKey, vnTodayKey, vnShiftKey, vnWeekdayShort, vnKeyDayMonth, vnKeyFull } from '@/lib/datetime';

const Fireworks = dynamic(() => import('@/components/Fireworks'), { ssr: false });

const ROUND_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'group', label: 'Vòng bảng' },
  { value: 'round_of_32', label: 'Vòng 32 đội' },
  { value: 'round_of_16', label: 'Vòng 1/8' },
  { value: 'quarter_final', label: 'Tứ kết' },
  { value: 'semi_final', label: 'Bán kết' },
  { value: 'third_place', label: 'Tranh hạng 3' },
  { value: 'final', label: 'Chung kết' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'scheduled', label: 'Sắp diễn ra' },
  { value: 'live', label: 'Đang diễn ra' },
  { value: 'finished', label: 'Đã kết thúc' },
];

const GROUPS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function dateTabLabel(key: string): { line1: string; line2: string; special: 'yesterday' | 'today' | 'tomorrow' | null } {
  const line2 = vnKeyDayMonth(key);
  if (key === YESTERDAY_KEY) return { line1: 'Hôm qua', line2, special: 'yesterday' };
  if (key === TODAY_KEY)     return { line1: 'Hôm nay',  line2, special: 'today' };
  if (key === TOMORROW_KEY)  return { line1: 'Ngày mai', line2, special: 'tomorrow' };
  return { line1: vnWeekdayShort(key), line2, special: null };
}

function groupByDate(matches: WorldCupMatch[]): Map<string, WorldCupMatch[]> {
  const map = new Map<string, WorldCupMatch[]>();
  for (const m of matches) {
    const key = vnDateKey(m.match_date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return map;
}

const TODAY_KEY = vnTodayKey();
const YESTERDAY_KEY = vnShiftKey(TODAY_KEY, -1);
const TOMORROW_KEY = vnShiftKey(TODAY_KEY, 1);
const NEARBY_KEYS = new Set([YESTERDAY_KEY, TODAY_KEY, TOMORROW_KEY]);

export default function HomePage() {
  const { user, loading: authLoading, refresh: refreshUser } = useAuth();
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roundFilter, setRoundFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [predicting, setPredicting] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [showFireworks, setShowFireworks] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_KEY);
  const [syncing, setSyncing] = useState(false);


  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await matchesApi.list({
        round: roundFilter || undefined,
        status: statusFilter || undefined,
        group: groupFilter || undefined,
      });
      setMatches(data);
    } catch {
      setError('Không thể tải danh sách trận đấu.');
    } finally {
      setLoading(false);
    }
  }, [roundFilter, statusFilter, groupFilter]);

  useEffect(() => {
    if (!authLoading) loadMatches();
  }, [loadMatches, authLoading]);

  useEffect(() => {
    const t = setTimeout(() => setShowFireworks(false), 15000);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePredict = async (matchId: number, homeScore: number, awayScore: number, trashTalk: string) => {
    if (predicting) return;
    setPredicting(matchId);
    try {
      const saved: Prediction = await predictionsApi.create(matchId, homeScore, awayScore, trashTalk.trim() || null);
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, user_prediction: saved } : m)
      );
      refreshUser();
      showToast('Đã đặt cược 10 vcoins!');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setPredicting(null);
    }
  };

  const handleCancelPredict = async (predictionId: number, matchId: number) => {
    try {
      await predictionsApi.delete(predictionId);
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, user_prediction: null } : m)
      );
      refreshUser();
      showToast('Đã hủy dự đoán.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message || 'Không thể hủy dự đoán.');
    }
  };

  const handleSync = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const result = await matchesApi.syncData();
      await Promise.all([loadMatches(), refreshUser()]);
      showToast(result.message);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message || 'Không thể đồng bộ dữ liệu.');
    } finally {
      setSyncing(false);
    }
  };

  // All available date keys sorted
  const byDate = useMemo(() => groupByDate(matches), [matches]);
  const allDateKeys = useMemo(() => Array.from(byDate.keys()).sort(), [byDate]);
  const nearbyDateKeys = useMemo(() => allDateKeys.filter((k) => NEARBY_KEYS.has(k)), [allDateKeys]);
  const otherDateKeys = useMemo(() => allDateKeys.filter((k) => !NEARBY_KEYS.has(k)), [allDateKeys]);

  // If selected date has no matches, pick nearest available
  const effectiveDate = useMemo(() => {
    if (byDate.has(selectedDate)) return selectedDate;
    return allDateKeys[0] ?? selectedDate;
  }, [selectedDate, byDate, allDateKeys]);

  const displayedMatches = useMemo(() => byDate.get(effectiveDate) ?? [], [byDate, effectiveDate]);
  const liveCount = displayedMatches.filter((m) => m.status === 'live').length;
  const myPredicted = matches.filter((m) => m.user_prediction).length;

  const otherScrollRef = useRef<HTMLDivElement>(null);
  const currentIndex = allDateKeys.indexOf(effectiveDate);

  const goPrevDate = () => {
    if (currentIndex > 0) setSelectedDate(allDateKeys[currentIndex - 1]);
  };

  const goNextDate = () => {
    if (currentIndex < allDateKeys.length - 1) setSelectedDate(allDateKeys[currentIndex + 1]);
  };

  // Auto-scroll active "other" date tab into view
  useEffect(() => {
    if (loading || !otherScrollRef.current) return;
    const activeBtn = otherScrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [loading, effectiveDate]);

  const selectDate = (key: string) => {
    setSelectedDate(key);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showFireworks && <Fireworks />}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Prediction deadline notice */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <span className="text-lg" aria-hidden="true">⚠️</span>
          <p className="text-sm leading-6">
            <span className="font-bold">Lưu ý:</span> Chỉ nhận dự đoán trước{' '}
            <span className="font-bold">00:00 (12 giờ đêm)</span>. Vui lòng hoàn tất dự đoán sớm.
          </p>
        </div>

        {/* User stats bar */}
        {user && (
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-4 mb-6 text-white shadow-lg animate-slide-up">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatar_url}
                  className="h-10 w-10 text-lg"
                  fallbackClassName="bg-white/20 text-white"
                />
                <div>
                  <p className="font-bold leading-tight">{user.name}</p>
                  <p className="text-blue-200 text-xs">{user.email}</p>
                </div>
              </div>
              {user.is_admin && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="ml-auto sm:ml-0 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/25 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className={syncing ? 'animate-spin' : ''}>↻</span>
                  {syncing ? 'Đang cập nhật...' : 'Cập nhật lịch, tỷ số & odds'}
                </button>
              )}
              <div className="flex gap-6 ml-auto flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-black">{user.total_points}</p>
                  <p className="text-blue-200 text-xs">vcoins</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">{user.correct_predictions}/{user.total_predictions}</p>
                  <p className="text-blue-200 text-xs">đúng/tổng</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">
                    {user.total_predictions > 0 ? Math.round((user.correct_predictions / user.total_predictions) * 100) : 0}%
                  </p>
                  <p className="text-blue-200 text-xs">chính xác</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">{myPredicted}</p>
                  <p className="text-blue-200 text-xs">đã dự đoán</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Date tab bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex gap-2 items-stretch min-h-[52px]">

            {/* Fixed: Hôm qua / Hôm nay / Ngày mai */}
            <div className="flex gap-2 flex-shrink-0">
              {loading
                ? [0,1,2].map((i) => (
                    <div key={i} className="w-[72px] h-[52px] rounded-xl bg-gray-100 animate-pulse" />
                  ))
                : nearbyDateKeys.map((key) => {
                    const { line1, line2, special } = dateTabLabel(key);
                    const active = effectiveDate === key;
                    const hasLive = byDate.get(key)?.some((m) => m.status === 'live');
                    return (
                      <button
                        key={key}
                        onClick={() => selectDate(key)}
                        className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold transition-all min-w-[72px] relative ${
                          active
                            ? special === 'today'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-800 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {hasLive && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                        <span className="font-bold">{line1}</span>
                        <span className={`mt-0.5 ${active ? 'opacity-80' : 'text-gray-400'}`}>{line2}</span>
                      </button>
                    );
                  })
              }
            </div>

            {/* Divider */}
            {!loading && otherDateKeys.length > 0 && (
              <div className="w-px bg-gray-200 flex-shrink-0 self-stretch" />
            )}

            {/* Prev/Next + danh sách ngày khác */}
            {!loading && otherDateKeys.length > 0 && (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <button
                  onClick={goPrevDate}
                  disabled={currentIndex <= 0}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all font-bold text-base"
                >‹</button>

                <div ref={otherScrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 px-0.5">
                  {otherDateKeys.map((key) => {
                    const { line1, line2 } = dateTabLabel(key);
                    const active = effectiveDate === key;
                    const hasLive = byDate.get(key)?.some((m) => m.status === 'live');
                    return (
                      <button
                        key={key}
                        data-active={active}
                        onClick={() => selectDate(key)}
                        className={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold transition-all min-w-[60px] relative ${
                          active ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {hasLive && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                        <span className="font-bold capitalize">{line1}</span>
                        <span className={`mt-0.5 ${active ? 'opacity-80' : 'text-gray-400'}`}>{line2}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={goNextDate}
                  disabled={currentIndex >= allDateKeys.length - 1}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all font-bold text-base"
                >›</button>
              </div>
            )}

          </div>
        </div>

        {/* Secondary filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-400 block mb-1 font-medium">Vòng đấu</label>
              <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                {ROUND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1 font-medium">Trạng thái</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1 font-medium">Bảng đấu</label>
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                {GROUPS.map((g) => <option key={g} value={g}>{g ? `Bảng ${g}` : 'Tất cả bảng'}</option>)}
              </select>
            </div>
            {(roundFilter || statusFilter || groupFilter) && (
              <button onClick={() => { setRoundFilter(''); setStatusFilter(''); setGroupFilter(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline pb-0.5">
                Xóa bộ lọc
              </button>
            )}
            <div className="ml-auto text-xs text-gray-400 self-end">
              {displayedMatches.length} trận
            </div>
          </div>
        </div>

        {/* Live indicator */}
        {liveCount > 0 && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-600 text-sm font-semibold">{liveCount} trận đang diễn ra</span>
          </div>
        )}

        {/* Date section header */}
        {!loading && displayedMatches.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-black text-gray-800 capitalize">
              {dateTabLabel(effectiveDate).line1}
              {!NEARBY_KEYS.has(effectiveDate) && (
                <span className="ml-2 text-gray-400 font-normal text-sm">
                  — {vnKeyFull(effectiveDate)}
                </span>
              )}
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
          </div>
        )}

        {/* Match grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 shimmer-bg border border-gray-100" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : displayedMatches.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-lg font-semibold">Chưa có lịch thi đấu</p>
            <p className="text-sm mt-1">
              {byDate.size === 0
                ? 'Chưa có lịch từ API hoặc bộ lọc không có dữ liệu'
                : 'Chưa có lịch thi đấu vào ngày này'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onPredict={handlePredict}
                onCancelPredict={handleCancelPredict}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl text-sm z-[60] animate-slide-up flex items-center gap-2">
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  );
}
