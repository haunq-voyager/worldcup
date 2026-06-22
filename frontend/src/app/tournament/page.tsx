'use client';

import { useState, useEffect, useMemo } from 'react';
import { teamsApi, tournamentApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Team, TournamentStage, TournamentPredictions, TournamentPick } from '@/types';
import clsx from 'clsx';

const STAGES: { key: TournamentStage; label: string; emoji: string; limit: number; points: number; desc: string; color: string }[] = [
  { key: 'quarter_final', label: 'Tứ kết',  emoji: '🏅', limit: 8, points: 2,  desc: 'Chọn 8 đội vào tứ kết',   color: 'from-sky-500 to-blue-600' },
  { key: 'semi_final',    label: 'Bán kết', emoji: '🥉', limit: 4, points: 3,  desc: 'Chọn 4 đội vào bán kết',  color: 'from-violet-500 to-purple-700' },
  { key: 'runner_up',     label: 'Á quân',  emoji: '🥈', limit: 1, points: 6,  desc: 'Chọn 1 đội về nhì',       color: 'from-slate-500 to-gray-700' },
  { key: 'champion',      label: 'Vô địch', emoji: '🏆', limit: 1, points: 10, desc: 'Chọn 1 đội vô địch',      color: 'from-yellow-400 to-orange-500' },
];

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

function TeamFlag({ team, size = 'md' }: { team: Team; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-6' : 'w-12 h-8';
  return (
    <div className={`${sz} rounded overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-black/10 bg-gray-50`}>
      {team.flag_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={team.flag_url} alt={team.name} className="w-full h-full object-cover" loading="lazy" />
        : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">🏳️</div>
      }
    </div>
  );
}

export default function TournamentPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [picks, setPicks] = useState<TournamentPredictions | null>(null);
  const [activeStage, setActiveStage] = useState<TournamentStage>('quarter_final');
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamsApi.list().then(setTeams).catch(() => {});
    if (user) {
      tournamentApi.my().then(setPicks).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Sync pendingIds from saved picks when switching stages
  useEffect(() => {
    if (!picks) return;
    const saved = picks[activeStage] as TournamentPick[];
    setPendingIds(new Set(saved.map((p) => p.team_id)));
  }, [activeStage, picks]);

  const grouped = useMemo(() => {
    const m: Record<string, Team[]> = {};
    for (const t of teams) {
      const g = t.group_name || '?';
      (m[g] ??= []).push(t);
    }
    return m;
  }, [teams]);

  const stageInfo = STAGES.find((s) => s.key === activeStage)!;
  const limit = stageInfo.limit;
  const isLocked = picks?.stages_info?.[activeStage]?.locked ?? false;

  const toggle = (teamId: number) => {
    if (isLocked || !user) return;
    setPendingIds((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < limit) {
        next.add(teamId);
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await tournamentApi.save(activeStage, Array.from(pendingIds));
      const updated = await tournamentApi.my();
      setPicks(updated);
      showToast('Đã lưu dự đoán!');
    } catch {
      showToast('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const savedIds = useMemo(
    () => new Set((picks?.[activeStage] as TournamentPick[] | undefined)?.map((p) => p.team_id) ?? []),
    [picks, activeStage]
  );
  const hasChanges = useMemo(() => {
    if (pendingIds.size !== savedIds.size) return true;
    return Array.from(pendingIds).some((id) => !savedIds.has(id));
  }, [pendingIds, savedIds]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white px-4 py-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-black mb-1">Dự đoán Toàn giải</h1>
          <p className="text-blue-200 text-sm">Dự đoán đội vô địch, á quân, bán kết và tứ kết · Kiếm thêm vcoins thưởng</p>

          {/* Points info */}
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {STAGES.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                <span className="text-yellow-300">+{s.points} vcoins</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Summary of all picks */}
        {picks && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {STAGES.map((s) => {
              const stagePicks = picks[s.key] as TournamentPick[];
              const correct = stagePicks.filter((p) => p.is_correct === true).length;
              const wrong   = stagePicks.filter((p) => p.is_correct === false).length;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveStage(s.key)}
                  className={clsx(
                    'rounded-2xl p-3 text-left transition-all border-2',
                    activeStage === s.key
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-transparent bg-white shadow-sm hover:shadow-md'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{s.emoji}</span>
                    <span className={clsx(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      stagePicks.length >= s.limit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {stagePicks.length}/{s.limit}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">+{s.points} vcoins/đội</p>

                  {/* Mini flags */}
                  {stagePicks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {stagePicks.slice(0, 8).map((p) => (
                        <div key={p.team_id} className={clsx(
                          'w-7 h-5 rounded overflow-hidden ring-1 bg-gray-50',
                          p.is_correct === true  ? 'ring-green-400' :
                          p.is_correct === false ? 'ring-red-400' : 'ring-gray-200'
                        )}>
                          {p.team.flag_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.team.flag_url} alt={p.team.name} className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Score */}
                  {(correct > 0 || wrong > 0) && (
                    <p className="text-xs mt-1">
                      {correct > 0 && <span className="text-green-600 font-semibold">✓ {correct} đúng · </span>}
                      {correct * s.points > 0 && <span className="text-yellow-600 font-bold">+{correct * s.points} vcoins</span>}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Stage editor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Stage header */}
          <div className={clsx('bg-gradient-to-r text-white px-5 py-4', stageInfo.color)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{stageInfo.desc}</p>
                <h2 className="text-xl font-black mt-0.5">
                  {stageInfo.emoji} {stageInfo.label} · +{stageInfo.points} vcoins/đội
                </h2>
              </div>
              <div className="text-right">
                <div className={clsx(
                  'text-3xl font-black tabular-nums',
                  pendingIds.size >= limit ? 'text-green-300' : 'text-white/80'
                )}>
                  {pendingIds.size}/{limit}
                </div>
                <p className="text-xs opacity-70">đã chọn</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min((pendingIds.size / limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Team selection grid */}
          {!user ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-3xl mb-2">🔒</p>
              <p className="font-semibold">Đăng nhập để dự đoán toàn giải</p>
              <a href="/auth/login" className="mt-3 inline-block px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                Đăng nhập
              </a>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-400">Đang tải...</div>
          ) : (
            <div className="p-4">
              {isLocked && (
                <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-2">
                  🔒 Đã hết thời gian dự đoán cho giai đoạn này
                </div>
              )}

              <div className="space-y-4">
                {GROUPS.map((group) => {
                  const groupTeams = grouped[group] ?? [];
                  if (!groupTeams.length) return null;
                  return (
                    <div key={group}>
                      <p className="text-xs font-bold text-gray-400 mb-2 tracking-wider">BẢNG {group}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {groupTeams.map((team) => {
                          const selected = pendingIds.has(team.id);
                          const savedPick = (picks?.[activeStage] as TournamentPick[] | undefined)?.find((p) => p.team_id === team.id);
                          const atLimit  = pendingIds.size >= limit && !selected;

                          return (
                            <button
                              key={team.id}
                              onClick={() => toggle(team.id)}
                              disabled={isLocked || atLimit}
                              className={clsx(
                                'flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                                isLocked && 'cursor-default opacity-70',
                                selected
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : atLimit
                                  ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                              )}
                            >
                              <TeamFlag team={team} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className={clsx('text-xs font-bold truncate', selected ? 'text-blue-700' : 'text-gray-800')}>
                                  {team.name}
                                </p>
                                <p className="text-[10px] text-gray-400">{team.country_code}</p>
                              </div>
                              {selected && (
                                <span className={clsx(
                                  'flex-shrink-0 text-xs',
                                  savedPick?.is_correct === true  ? '✓ text-green-500' :
                                  savedPick?.is_correct === false ? '✗ text-red-400' : ''
                                )}>
                                  {savedPick?.is_correct === true  ? '✓' :
                                   savedPick?.is_correct === false ? '✗' : '●'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save button */}
              {!isLocked && (
                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges || pendingIds.size === 0}
                    className={clsx(
                      'px-6 py-3 rounded-xl font-bold text-sm transition-all',
                      hasChanges && pendingIds.size > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {saving ? '⏳ Đang lưu...' : `💾 Lưu dự đoán ${stageInfo.label} (${pendingIds.size}/${limit})`}
                  </button>
                  {hasChanges && (
                    <button
                      onClick={() => setPendingIds(new Set((picks?.[activeStage] as TournamentPick[] | undefined)?.map((p) => p.team_id) ?? []))}
                      className="text-sm text-gray-400 hover:text-gray-600 underline"
                    >
                      Hoàn tác
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
          <p className="font-semibold mb-1">💡 Cách tính vcoins</p>
          <ul className="space-y-0.5 text-xs">
            <li>🏅 Mỗi đội bạn chọn vào <strong>tứ kết</strong> mà thực sự vào tứ kết: <strong>+2 vcoins</strong></li>
            <li>🥉 Mỗi đội bạn chọn vào <strong>bán kết</strong> mà thực sự vào bán kết: <strong>+3 vcoins</strong></li>
            <li>🥈 Đội <strong>á quân</strong> đúng: <strong>+6 vcoins</strong></li>
            <li>🏆 Đội <strong>vô địch</strong> đúng: <strong>+10 vcoins</strong></li>
          </ul>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl text-sm z-[60] animate-slide-up">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
