'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { specialPredictionsApi, teamsApi } from '@/lib/api';
import type { SpecialPrediction, Team } from '@/types';
import Image from 'next/image';
import clsx from 'clsx';

const STAKE = 50;

const TYPE_CONFIG = {
  champion: {
    label: 'Đội vô địch',
    icon: '🏆',
    desc: 'Đội nào sẽ vô địch FIFA World Cup 2026?',
    inputType: 'team' as const,
  },
  best_player: {
    label: 'Cầu thủ xuất sắc',
    icon: '⭐',
    desc: 'Ai sẽ đoạt danh hiệu Quả bóng vàng (Golden Ball)?',
    inputType: 'text' as const,
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

  // Per-tab form state
  const [championValue, setChampionValue] = useState('');
  const [bestPlayerValue, setBestPlayerValue] = useState('');
  const [editingChampion, setEditingChampion] = useState(false);
  const [editingBestPlayer, setEditingBestPlayer] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Admin settle
  const [settleValue, setSettleValue] = useState('');
  const [settling, setSettling] = useState(false);

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
    ]).then(([mine, all, tms]) => {
      setMyPreds(mine);
      setAllPreds(all);
      setTeams(tms);
      const champ = mine.find((p) => p.type === 'champion');
      const best  = mine.find((p) => p.type === 'best_player');
      if (champ) setChampionValue(champ.value);
      if (best)  setBestPlayerValue(best.value);
    }).finally(() => setLoadingData(false));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) loadAllPreds();
  }, [tab, loadAllPreds, user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const myPred = myPreds.find((p) => p.type === tab);
  const editing = tab === 'champion' ? editingChampion : editingBestPlayer;
  const setEditing = tab === 'champion' ? setEditingChampion : setEditingBestPlayer;
  const currentValue = tab === 'champion' ? championValue : bestPlayerValue;
  const setCurrentValue = tab === 'champion' ? setChampionValue : setBestPlayerValue;

  const handleSubmit = async () => {
    const val = currentValue.trim();
    if (!val) return;
    setSaving(true);
    try {
      const saved = await specialPredictionsApi.save(tab, val);
      setMyPreds((prev) => [...prev.filter((p) => p.type !== tab), saved]);
      setEditing(false);
      loadAllPreds();
      showToast('Đã lưu dự đoán!');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message ?? 'Lỗi khi lưu dự đoán.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (pred: SpecialPrediction) => {
    try {
      await specialPredictionsApi.delete(pred.id);
      setMyPreds((prev) => prev.filter((p) => p.id !== pred.id));
      if (tab === 'champion') setChampionValue('');
      else setBestPlayerValue('');
      loadAllPreds();
      showToast('Đã hủy dự đoán.');
    } catch {
      showToast('Không thể hủy dự đoán.');
    }
  };

  const handleSettle = async () => {
    const val = settleValue.trim();
    if (!val) return;
    setSettling(true);
    try {
      await specialPredictionsApi.settle(tab, val);
      const [mine, all] = await Promise.all([
        specialPredictionsApi.mine(),
        specialPredictionsApi.all(tab),
      ]);
      setMyPreds(mine);
      setAllPreds(all);
      setSettleValue('');
      showToast('Đã tính điểm dự đoán đặc biệt!');
    } catch {
      showToast('Lỗi khi tính điểm.');
    } finally {
      setSettling(false);
    }
  };

  if (authLoading || !user) return null;

  const cfg = TYPE_CONFIG[tab];

  const teamName = (code: string) => teams.find((t) => t.country_code === code)?.name ?? code;
  const teamFlag = (code: string) => teams.find((t) => t.country_code === code)?.flag_url ?? null;

  const displayValue = (p: SpecialPrediction) =>
    p.type === 'champion' ? teamName(p.value) : p.value;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Dự đoán đặc biệt</h1>
      <p className="text-gray-500 mb-6">
        Đặt cược <span className="font-bold text-blue-600">{STAKE} vcoins</span> mỗi lần ·
        Ai đúng chia pool của người sai · Không ai đúng thì không trừ
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['champion', 'best_player'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'pb-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* My prediction card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-gray-700 mb-0.5">{cfg.icon} {cfg.label}</h2>
        <p className="text-xs text-gray-400 mb-4">{cfg.desc}</p>

        {myPred && !editing ? (
          /* Show existing prediction */
          <div className="space-y-3">
            <div className={clsx(
              'flex items-center gap-3 p-3 rounded-xl border',
              myPred.is_correct === true
                ? 'bg-green-50 border-green-200'
                : myPred.is_correct === false
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            )}>
              {myPred.type === 'champion' && teamFlag(myPred.value) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={teamFlag(myPred.value)!}
                  alt={teamName(myPred.value)}
                  width={40} height={30}
                  className="rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{displayValue(myPred)}</p>
                <p className="text-xs text-gray-400">Dự đoán của bạn · {STAKE} vcoins</p>
              </div>
              {myPred.is_correct === true && (
                <span className="text-green-700 font-black text-sm flex-shrink-0">
                  +{myPred.points_earned} vcoins
                </span>
              )}
              {myPred.is_correct === false && myPred.points_earned < 0 && (
                <span className="text-red-600 font-black text-sm flex-shrink-0">
                  {myPred.points_earned} vcoins
                </span>
              )}
              {myPred.is_correct === null && (
                <span className="text-blue-500 text-xs font-semibold flex-shrink-0">Chờ kết quả</span>
              )}
            </div>

            {myPred.is_correct === null && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  Thay đổi dự đoán
                </button>
                <button
                  onClick={() => handleCancel(myPred)}
                  className="flex-1 py-1.5 border border-red-200 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  Hủy dự đoán
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Input form */
          <div className="space-y-3">
            {cfg.inputType === 'team' ? (
              loadingData ? (
                <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={championValue}
                  onChange={(e) => setChampionValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                >
                  <option value="">-- Chọn đội vô địch --</option>
                  {teams.map((t) => (
                    <option key={t.country_code} value={t.country_code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <input
                type="text"
                value={bestPlayerValue}
                onChange={(e) => setBestPlayerValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Nhập tên cầu thủ..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving || !currentValue.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-all"
              >
                {saving ? '⏳ Đang lưu...' : `🎯 Cược ${STAKE} vcoins`}
              </button>
              {myPred && (
                <button
                  onClick={() => { setEditing(false); setCurrentValue(myPred.value); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin settle */}
      {user.is_admin && (
        <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 mb-5">
          <h3 className="text-xs font-bold text-orange-600 mb-3">
            ⚙️ Admin · Tính điểm {cfg.label}
          </h3>
          <div className="flex gap-2">
            {cfg.inputType === 'team' ? (
              <select
                value={settleValue}
                onChange={(e) => setSettleValue(e.target.value)}
                className="flex-1 border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                <option value="">-- Chọn đội vô địch đúng --</option>
                {teams.map((t) => (
                  <option key={t.country_code} value={t.country_code}>{t.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settleValue}
                onChange={(e) => setSettleValue(e.target.value)}
                placeholder="Tên cầu thủ chính xác..."
                className="flex-1 border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            )}
            <button
              onClick={handleSettle}
              disabled={settling || !settleValue.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {settling ? '...' : 'Tính điểm'}
            </button>
          </div>
        </div>
      )}

      {/* All predictions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">
          {cfg.icon} Dự đoán của mọi người
          <span className="ml-2 text-xs font-normal text-gray-400">{allPreds.length} người đã tham gia</span>
        </h2>

        {loadingData ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : allPreds.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Chưa có dự đoán nào.</p>
        ) : (
          <div className="space-y-1.5">
            {allPreds.map((p) => {
              const flag = p.type === 'champion' ? teamFlag(p.value) : null;
              const isMe = p.user_id === user.id;
              return (
                <div
                  key={p.id}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm',
                    isMe ? 'bg-blue-50 border border-blue-100' :
                    p.is_correct === true ? 'bg-green-50' :
                    p.is_correct === false ? 'bg-red-50/60' : 'bg-gray-50'
                  )}
                >
                  {flag && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={flag} alt="" width={28} height={20} className="rounded object-cover flex-shrink-0" />
                  )}
                  <span className="font-semibold text-gray-700 flex-1 truncate">
                    {displayValue(p)}
                  </span>
                  <span className={clsx('text-xs flex-shrink-0', isMe ? 'text-blue-600 font-bold' : 'text-gray-400')}>
                    {p.user?.name ?? '?'}{isMe ? ' (bạn)' : ''}
                  </span>
                  {p.is_correct === true && (
                    <span className="text-green-600 text-xs font-black flex-shrink-0">+{p.points_earned}</span>
                  )}
                  {p.is_correct === false && p.points_earned < 0 && (
                    <span className="text-red-500 text-xs font-black flex-shrink-0">{p.points_earned}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl text-sm z-[60] animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
