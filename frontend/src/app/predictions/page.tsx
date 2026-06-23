'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { predictionsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { vnDateTime } from '@/lib/datetime';
import type { Prediction } from '@/types';
import clsx from 'clsx';

const ROUND_LABELS: Record<string, string> = {
  group: 'Vòng bảng',
  round_of_32: 'Vòng 32 đội',
  round_of_16: 'Vòng 1/8',
  quarter_final: 'Tứ kết',
  semi_final: 'Bán kết',
  third_place: 'Tranh hạng 3',
  final: 'Chung kết',
};

const ROUND_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

export default function PredictionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'pending'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      predictionsApi.myPredictions().then(setPredictions).finally(() => setLoading(false));
    }
  }, [user]);

  const filtered = predictions.filter((p) => {
    if (filter === 'correct') return p.is_correct === true;
    if (filter === 'wrong') return p.is_correct === false;
    if (filter === 'pending') return p.is_correct === null;
    return true;
  });

  const stats = {
    total: predictions.length,
    correct: predictions.filter((p) => p.is_correct === true).length,
    wrong: predictions.filter((p) => p.is_correct === false).length,
    pending: predictions.filter((p) => p.is_correct === null).length,
    points: predictions.reduce((sum, p) => sum + p.points_earned, 0),
  };

  // vcoins per round (only rounds the user has played)
  const roundTotals = ROUND_ORDER
    .map((r) => ({
      round: r,
      label: ROUND_LABELS[r] || r,
      points: predictions
        .filter((p) => p.match?.round === r)
        .reduce((sum, p) => sum + p.points_earned, 0),
      count: predictions.filter((p) => p.match?.round === r).length,
    }))
    .filter((x) => x.count > 0);

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dự đoán của tôi</h1>
      <p className="text-gray-500 mb-6">Xem lại lịch sử dự đoán và kết quả của bạn</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng dự đoán', value: stats.total, color: 'bg-blue-50 text-blue-800' },
          { label: 'Đúng', value: stats.correct, color: 'bg-green-50 text-green-800' },
          { label: 'Sai', value: stats.wrong, color: 'bg-red-50 text-red-800' },
          { label: 'Vcoins lời/lỗ', value: `${stats.points >= 0 ? '+' : ''}${stats.points}`, color: 'bg-yellow-50 text-yellow-800' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-sm opacity-70">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Vcoins per round */}
      {roundTotals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Vcoins theo vòng đấu</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {roundTotals.map((r) => (
              <div key={r.round} className="rounded-xl border border-gray-100 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-500 truncate">{r.label}</p>
                <p className={clsx(
                  'text-lg font-black tabular-nums',
                  r.points > 0 ? 'text-green-600' : r.points < 0 ? 'text-red-500' : 'text-gray-700'
                )}>
                  {r.points > 0 ? '+' : ''}{r.points}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ kết quả' },
          { key: 'correct', label: 'Đúng' },
          { key: 'wrong', label: 'Sai' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={clsx(
              'pb-2 px-4 text-sm font-medium border-b-2 transition-colors',
              filter === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Không có dự đoán nào.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prediction) => {
            const match = prediction.match;
            if (!match) return null;

            return (
              <div key={prediction.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Match info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {match.home_team?.flag_url && (
                      <Image src={match.home_team.flag_url} alt={match.home_team.name} width={32} height={24} className="rounded object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {match.home_team?.name} vs {match.away_team?.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ROUND_LABELS[match.round] || match.round}
                        {match.group_name ? ` · Bảng ${match.group_name}` : ''} ·{' '}
                        {vnDateTime(match.match_date)}
                      </p>
                    </div>
                    {match.away_team?.flag_url && (
                      <Image src={match.away_team.flag_url} alt={match.away_team.name} width={32} height={24} className="rounded object-cover flex-shrink-0" />
                    )}
                  </div>

                  {/* Score if finished */}
                  {match.status === 'finished' && (
                    <div className="text-center flex-shrink-0">
                      <p className="text-xs text-gray-400">Kết quả</p>
                      <p className="text-lg font-bold">{match.home_score} - {match.away_score}</p>
                    </div>
                  )}

                  {/* Prediction badge */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-gray-400">Bạn đoán</p>
                    <span
                      className={clsx(
                        'inline-block text-sm font-black px-3 py-1 rounded-lg tabular-nums',
                        prediction.is_correct === true
                          ? 'bg-green-100 text-green-700'
                          : prediction.is_correct === false
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {prediction.predicted_home_score} - {prediction.predicted_away_score}
                    </span>
                    {prediction.is_correct === true && (
                      <p className="text-xs text-green-600 font-bold mt-1">+{prediction.points_earned} vcoins</p>
                    )}
                    {prediction.is_correct === false && (
                      <p className="text-xs text-red-400 mt-1">
                        {prediction.points_earned < 0 ? `${prediction.points_earned} vcoins` : 'Hoàn cược'}
                      </p>
                    )}
                    {prediction.is_correct === null && (
                      <p className="text-xs text-gray-400 mt-1">Chờ kết quả</p>
                    )}
                  </div>
                </div>
                {prediction.trash_talk && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm italic text-amber-700">“{prediction.trash_talk}”</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
