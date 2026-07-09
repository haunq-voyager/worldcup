'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { specialPredictionsApi, teamsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { SpecialPrediction, Team } from '@/types';

const STAKE = 50;
const SETTLE_AVAILABLE_DATE = '2026-07-20';

const TYPE_CONFIG = {
  champion: {
    label: 'Đội vô địch',
    icon: '🏆',
    desc: 'Bình chọn đã dừng. Kết quả chỉ được cập nhật sau trận cuối cùng.',
  },
  best_player: {
    label: 'Cầu thủ xuất sắc',
    icon: '⭐',
    desc: 'Bình chọn đã dừng. Admin tick những người dự đoán đúng để tính điểm.',
  },
};

export default function SpecialPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'champion' | 'best_player'>('champion');
  const [myPreds, setMyPreds] = useState<SpecialPrediction[]>([]);
  const [allPreds, setAllPreds] = useState<SpecialPrediction[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<number[]>([]);
  const [settling, setSettling] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const loadAllPreds = useCallback(() => {
    specialPredictionsApi.all(tab).then(setAllPreds);
  }, [tab]);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    Promise.all([
      specialPredictionsApi.mine(),
      specialPredictionsApi.all(tab),
      teamsApi.list(),
    ]).then(([mine, all, teamList]) => {
      setMyPreds(mine);
      setAllPreds(all);
      setTeams(teamList);
    }).finally(() => setLoadingData(false));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) loadAllPreds();
    setSelectedWinnerIds([]);
  }, [tab, loadAllPreds, user]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const teamName = (code: string) => teams.find((team) => team.country_code === code)?.name ?? code;
  const teamFlag = (code: string) => teams.find((team) => team.country_code === code)?.flag_url ?? null;
  const displayValue = (prediction: SpecialPrediction) =>
    prediction.type === 'champion' ? teamName(prediction.value) : prediction.value;

  const myPred = myPreds.find((prediction) => prediction.type === tab);
  const cfg = TYPE_CONFIG[tab];
  const canSettle = new Date() >= new Date(`${SETTLE_AVAILABLE_DATE}T00:00:00`);
  const unsettledPreds = allPreds.filter((prediction) => prediction.is_correct === null);

  const toggleWinner = (predictionId: number) => {
    setSelectedWinnerIds((prev) =>
      prev.includes(predictionId)
        ? prev.filter((id) => id !== predictionId)
        : [...prev, predictionId]
    );
  };

  const handleSettle = async () => {
    const confirmed = window.confirm(
      `Xác nhận tính điểm ${cfg.label} với ${selectedWinnerIds.length} người dự đoán đúng?`
    );
    if (!confirmed) return;

    setSettling(true);
    try {
      await specialPredictionsApi.settle(tab, selectedWinnerIds);
      const [mine, all] = await Promise.all([
        specialPredictionsApi.mine(),
        specialPredictionsApi.all(tab),
      ]);
      setMyPreds(mine);
      setAllPreds(all);
      setSelectedWinnerIds([]);
      showToast('Đã tính điểm dự đoán đặc biệt.');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast(apiError?.response?.data?.message ?? 'Lỗi khi tính điểm.');
    } finally {
      setSettling(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold text-gray-900">Dự đoán đặc biệt</h1>
      <p className="mb-6 text-gray-500">
        Bình chọn đội vô địch và cầu thủ xuất sắc đã dừng. Mỗi phiếu cược {STAKE} vcoins.
      </p>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {(['champion', 'best_player'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            className={clsx(
              'flex items-center gap-1.5 border-b-2 px-4 pb-2 text-sm font-medium transition-colors',
              tab === type
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {TYPE_CONFIG[type].icon} {TYPE_CONFIG[type].label}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-0.5 text-sm font-bold text-gray-700">
          {cfg.icon} {cfg.label}
        </h2>
        <p className="mb-4 text-xs text-gray-400">{cfg.desc}</p>

        {myPred ? (
          <div
            className={clsx(
              'flex items-center gap-3 rounded-xl border p-3',
              myPred.is_correct === true
                ? 'border-green-200 bg-green-50'
                : myPred.is_correct === false
                ? 'border-red-200 bg-red-50'
                : 'border-blue-200 bg-blue-50'
            )}
          >
            {myPred.type === 'champion' && teamFlag(myPred.value) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teamFlag(myPred.value)!}
                alt={teamName(myPred.value)}
                width={40}
                height={30}
                className="flex-shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-800">{displayValue(myPred)}</p>
              <p className="text-xs text-gray-400">Phiếu của bạn đã khóa</p>
            </div>
            {myPred.is_correct === true && (
              <span className="flex-shrink-0 text-sm font-black text-green-700">
                +{myPred.points_earned} vcoins
              </span>
            )}
            {myPred.is_correct === false && myPred.points_earned < 0 && (
              <span className="flex-shrink-0 text-sm font-black text-red-600">
                {myPred.points_earned} vcoins
              </span>
            )}
            {myPred.is_correct === null && (
              <span className="flex-shrink-0 text-xs font-semibold text-blue-500">Chờ kết quả</span>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-500">
            Bạn chưa có phiếu cho hạng mục này. Bình chọn đã dừng.
          </div>
        )}
      </div>

      {user.is_admin && (
        <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <h3 className="mb-2 text-xs font-bold text-orange-600">
            Admin · Tính điểm {cfg.label}
          </h3>
          <p className="mb-3 text-xs font-semibold text-orange-700">
            Tick những người dự đoán đúng trong danh sách bên dưới. Chỉ cập nhật được từ ngày 20/07/2026.
          </p>
          <button
            onClick={handleSettle}
            disabled={settling || !canSettle || unsettledPreds.length === 0}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {settling ? 'Đang tính...' : `Xác nhận ${selectedWinnerIds.length} người đúng`}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-700">
          {cfg.icon} Dự đoán của mọi người
          <span className="ml-2 text-xs font-normal text-gray-400">{allPreds.length} người đã tham gia</span>
        </h2>

        {loadingData ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : allPreds.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Chưa có dự đoán nào.</p>
        ) : (
          <div className="space-y-1.5">
            {allPreds.map((prediction) => {
              const flag = prediction.type === 'champion' ? teamFlag(prediction.value) : null;
              const isMe = prediction.user_id === user.id;
              const canSelectWinner = Boolean(user.is_admin && prediction.is_correct === null && canSettle);

              return (
                <div
                  key={prediction.id}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
                    isMe
                      ? 'border border-blue-100 bg-blue-50'
                      : prediction.is_correct === true
                      ? 'bg-green-50'
                      : prediction.is_correct === false
                      ? 'bg-red-50/60'
                      : 'bg-gray-50'
                  )}
                >
                  {user.is_admin && prediction.is_correct === null && (
                    <input
                      type="checkbox"
                      checked={selectedWinnerIds.includes(prediction.id)}
                      onChange={() => toggleWinner(prediction.id)}
                      disabled={!canSelectWinner}
                      className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                  )}
                  {flag && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={flag} alt="" width={28} height={20} className="flex-shrink-0 rounded object-cover" />
                  )}
                  <span className="flex-1 truncate font-semibold text-gray-700">
                    {displayValue(prediction)}
                  </span>
                  <span className={clsx('flex-shrink-0 text-xs', isMe ? 'font-bold text-blue-600' : 'text-gray-400')}>
                    {prediction.user?.name ?? '?'}{isMe ? ' (bạn)' : ''}
                  </span>
                  {prediction.is_correct === true && (
                    <span className="flex-shrink-0 text-xs font-black text-green-600">+{prediction.points_earned}</span>
                  )}
                  {prediction.is_correct === false && prediction.points_earned < 0 && (
                    <span className="flex-shrink-0 text-xs font-black text-red-500">{prediction.points_earned}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900 px-6 py-3 text-sm text-white shadow-xl animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
