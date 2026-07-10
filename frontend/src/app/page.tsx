'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { matchesApi, predictionsApi } from '@/lib/api';
import type { CorrectPredictionToday, Prediction, WorldCupMatch } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import MatchCard from '@/components/MatchCard';
import HeroBanner from '@/components/HeroBanner';
import UserAvatar from '@/components/UserAvatar';
import CorrectPredictionsPopup from '@/components/CorrectPredictionsPopup';

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

const ROUND_ORDER = ROUND_OPTIONS.filter((round) => round.value).map((round) => round.value);

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'scheduled', label: 'Sắp diễn ra' },
  { value: 'live', label: 'Đang diễn ra' },
  { value: 'finished', label: 'Đã kết thúc' },
];

const GROUPS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function roundLabel(round: string): string {
  return ROUND_OPTIONS.find((option) => option.value === round)?.label ?? round;
}

function sortMatchesByTime(matches: WorldCupMatch[]): WorldCupMatch[] {
  return [...matches].sort(
    (first, second) => new Date(first.match_date).getTime() - new Date(second.match_date).getTime()
  );
}

function groupByRound(matches: WorldCupMatch[]): Array<{ round: string; matches: WorldCupMatch[] }> {
  const grouped = new Map<string, WorldCupMatch[]>();

  for (const match of sortMatchesByTime(matches)) {
    if (!grouped.has(match.round)) grouped.set(match.round, []);
    grouped.get(match.round)!.push(match);
  }

  const orderedRounds = [
    ...ROUND_ORDER.filter((round) => grouped.has(round)),
    ...Array.from(grouped.keys()).filter((round) => !ROUND_ORDER.includes(round)),
  ];

  return orderedRounds.map((round) => ({ round, matches: grouped.get(round) ?? [] }));
}

function getDefaultRoundFilter(matches: WorldCupMatch[]): string {
  const roundsWithMatches = new Set(matches.map((match) => match.round));
  const activeRound = ROUND_ORDER.find((round) =>
    matches.some((match) => match.round === round && match.status !== 'finished')
  );

  if (activeRound) return activeRound;

  return [...ROUND_ORDER].reverse().find((round) => roundsWithMatches.has(round)) ?? '';
}

export default function HomePage() {
  const { user, loading: authLoading, refresh: refreshUser } = useAuth();
  const [allMatches, setAllMatches] = useState<WorldCupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roundFilter, setRoundFilter] = useState('');
  const [roundFilterTouched, setRoundFilterTouched] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [predicting, setPredicting] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [correctToday, setCorrectToday] = useState<{ date: string; data: CorrectPredictionToday[] }>({
    date: '',
    data: [],
  });
  const [correctPopupOpen, setCorrectPopupOpen] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await matchesApi.list();
      setAllMatches(sortMatchesByTime(data));
      setError('');
    } catch {
      setError('Không thể tải danh sách trận đấu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) loadMatches();
  }, [loadMatches, authLoading]);

  useEffect(() => {
    predictionsApi.correctToday()
      .then((response) => {
        setCorrectToday({ date: response.date, data: response.data });
        setCorrectPopupOpen(response.data.length > 0);
      })
      .catch(() => {
        setCorrectToday({ date: '', data: [] });
        setCorrectPopupOpen(false);
      });
  }, []);

  useEffect(() => {
    if (roundFilterTouched || allMatches.length === 0) return;
    setRoundFilter(getDefaultRoundFilter(allMatches));
  }, [allMatches, roundFilterTouched]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePredict = async (matchId: number, homeScore: number, awayScore: number, trashTalk: string) => {
    if (predicting) return;

    setPredicting(matchId);
    try {
      const saved: Prediction = await predictionsApi.create(matchId, homeScore, awayScore, trashTalk.trim() || null);
      setAllMatches((prev) =>
        prev.map((match) => match.id === matchId ? { ...match, user_prediction: saved } : match)
      );
      refreshUser();
      showToast('Đã đặt cược 10 vcoins!');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast(apiError?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setPredicting(null);
    }
  };

  const handleCancelPredict = async (predictionId: number, matchId: number) => {
    try {
      await predictionsApi.delete(predictionId);
      setAllMatches((prev) =>
        prev.map((match) => match.id === matchId ? { ...match, user_prediction: null } : match)
      );
      refreshUser();
      showToast('Đã hủy dự đoán.');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast(apiError?.response?.data?.message || 'Không thể hủy dự đoán.');
    }
  };

  const handleSync = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const result = await matchesApi.syncData();
      await Promise.all([loadMatches(), refreshUser()]);
      showToast(result.message);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast(apiError?.response?.data?.message || 'Không thể đồng bộ dữ liệu.');
    } finally {
      setSyncing(false);
    }
  };

  const matches = useMemo(() => {
    return allMatches.filter((match) => {
      if (roundFilter && match.round !== roundFilter) return false;
      if (statusFilter && match.status !== statusFilter) return false;
      if (groupFilter && match.group_name !== groupFilter.toUpperCase()) return false;
      return true;
    });
  }, [allMatches, roundFilter, statusFilter, groupFilter]);

  const matchSections = useMemo(() => groupByRound(matches), [matches]);
  const liveCount = matches.filter((match) => match.status === 'live').length;
  const myPredicted = matches.filter((match) => match.user_prediction).length;
  const hasFilters = Boolean(roundFilter || statusFilter || groupFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroBanner />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <span className="text-lg" aria-hidden="true">⚠️</span>
          <p className="text-sm leading-6">
            <span className="font-bold">Lưu ý:</span> Chỉ nhận dự đoán trước{' '}
            <span className="font-bold">00:00 (12 giờ đêm)</span>. Vui lòng hoàn tất dự đoán sớm.
          </p>
        </div>

        {user && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-900 p-4 text-white shadow-lg animate-slide-up">
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
                  <p className="text-xs text-blue-200">{user.email}</p>
                </div>
              </div>
              {user.is_admin && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/25 disabled:cursor-wait disabled:opacity-60 sm:ml-0"
                >
                  <span className={syncing ? 'animate-spin' : ''}>↻</span>
                  {syncing ? 'Đang cập nhật...' : 'Cập nhật lịch, tỷ số & odds'}
                </button>
              )}
              <div className="ml-auto flex flex-wrap gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black">{user.total_points}</p>
                  <p className="text-xs text-blue-200">vcoins</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">{user.correct_predictions}/{user.total_predictions}</p>
                  <p className="text-xs text-blue-200">đúng/tổng</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">
                    {user.total_predictions > 0 ? Math.round((user.correct_predictions / user.total_predictions) * 100) : 0}%
                  </p>
                  <p className="text-xs text-blue-200">chính xác</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">{myPredicted}</p>
                  <p className="text-xs text-blue-200">đã dự đoán</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Vòng đấu</label>
              <select
                value={roundFilter}
                onChange={(event) => {
                  setRoundFilterTouched(true);
                  setRoundFilter(event.target.value);
                }}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROUND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Bảng đấu</label>
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GROUPS.map((group) => (
                  <option key={group} value={group}>{group ? `Bảng ${group}` : 'Tất cả bảng'}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={() => {
                  setRoundFilterTouched(true);
                  setRoundFilter('');
                  setStatusFilter('');
                  setGroupFilter('');
                }}
                className="pb-0.5 text-xs text-gray-400 underline hover:text-gray-600"
              >
                Xóa bộ lọc
              </button>
            )}
            <div className="ml-auto self-end text-xs text-gray-400">
              {matches.length} trận
            </div>
          </div>
        </div>

        {liveCount > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-600">{liveCount} trận đang diễn ra</span>
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-56 rounded-2xl border border-gray-100 bg-white shimmer-bg" />
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500">{error}</div>
        ) : matches.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="mb-3 text-4xl">📅</p>
            <p className="text-lg font-semibold">Chưa có lịch thi đấu</p>
            <p className="mt-1 text-sm">
              {hasFilters ? 'Bộ lọc hiện tại không có dữ liệu' : 'Chưa có lịch từ API'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {matchSections.map((section) => (
              <section key={section.round}>
                <div className="mb-4 flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-black text-gray-800">{roundLabel(section.round)}</h2>
                    <p className="text-xs font-semibold text-gray-400">{section.matches.length} trận</p>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onPredict={handlePredict}
                      onCancelPredict={handleCancelPredict}
                      isAuthenticated={!!user}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm text-white shadow-xl animate-slide-up">
          <span>✓</span> {toast}
        </div>
      )}

      <CorrectPredictionsPopup
        open={correctPopupOpen}
        predictions={correctToday.data}
        date={correctToday.date}
        onClose={() => setCorrectPopupOpen(false)}
      />
    </div>
  );
}
