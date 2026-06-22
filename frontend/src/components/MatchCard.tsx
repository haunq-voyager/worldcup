'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { WorldCupMatch, PredictionValue } from '@/types';
import { matchesApi } from '@/lib/api';
import clsx from 'clsx';

interface MatchCardProps {
  match: WorldCupMatch;
  onPredict?: (matchId: number, value: PredictionValue) => Promise<void>;
  onCancelPredict?: (predictionId: number, matchId: number) => Promise<void>;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onResultUpdated?: (match: WorldCupMatch) => void;
}

const ROUND_LABELS: Record<string, string> = {
  group: 'Vòng bảng',
  round_of_32: '1/16',
  round_of_16: '1/8',
  quarter_final: 'Tứ kết',
  semi_final: 'Bán kết',
  third_place: 'H.3',
  final: 'Chung kết',
};

const PREDICTION_LABELS: Record<PredictionValue, string> = {
  home_win: '🏠 Chủ nhà',
  draw: '🤝 Hòa',
  away_win: '✈️ Khách',
};

const PREDICTION_SHORT: Record<PredictionValue, string> = {
  home_win: 'Chủ nhà',
  draw: 'Hòa',
  away_win: 'Khách',
};

const fmtOdd = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : n.toFixed(2);

const fmtPoint = (p: number | null | undefined): string =>
  p === null || p === undefined ? '' : p > 0 ? `+${p}` : `${p}`;

export default function MatchCard({ match, onPredict, onCancelPredict, isAuthenticated, isAdmin, onResultUpdated }: MatchCardProps) {
  const [pendingValue, setPendingValue] = useState<PredictionValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [homeInput, setHomeInput] = useState(match.home_score?.toString() ?? '');
  const [awayInput, setAwayInput] = useState(match.away_score?.toString() ?? '');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(homeInput, 10);
    const a = parseInt(awayInput, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setAdminError('Tỷ số không hợp lệ');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    try {
      const updated = await matchesApi.updateResult(match.id, h, a);
      setAdminOpen(false);
      onResultUpdated?.(updated);
    } catch {
      setAdminError('Không thể cập nhật kết quả');
    } finally {
      setAdminLoading(false);
    }
  };

  const matchDate = new Date(match.match_date);
  const isPast = matchDate < new Date();
  const canPredict = match.status === 'scheduled' && !isPast && isAuthenticated;
  const userPrediction = match.user_prediction?.prediction as PredictionValue | undefined;
  const predictionId = match.user_prediction?.id;

  const handleSelectOption = (value: PredictionValue) => {
    if (loading) return;
    setPendingValue((prev) => (prev === value ? null : value));
  };

  const handleConfirm = async () => {
    if (!pendingValue || !onPredict) return;
    setLoading(true);
    try {
      await onPredict(match.id, pendingValue);
      setPendingValue(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPredict = async () => {
    if (!onCancelPredict || !predictionId) return;
    setLoading(true);
    try {
      await onCancelPredict(predictionId, match.id);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    scheduled: { label: 'Sắp diễn ra', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    live:      { label: '● TRỰC TIẾP', cls: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' },
    finished:  { label: 'Kết thúc',    cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  };
  const sc = statusConfig[match.status];

  return (
    <div className="card-hover bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-950 to-blue-900">
        <span className="text-xs text-blue-200 font-medium truncate">
          {ROUND_LABELS[match.round] || match.round}
          {match.group_name ? ` · Bảng ${match.group_name}` : ''}
        </span>
        <span className={clsx('flex-shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border', sc.cls)}>
          {sc.label}
        </span>
      </div>

      {/* Match body */}
      <div className="flex items-center px-3 py-4 gap-2">

        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-14 h-10 rounded-lg overflow-hidden shadow-md ring-2 ring-gray-100 flex-shrink-0 bg-gray-50">
            {match.home_team.flag_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={match.home_team.flag_url} alt={match.home_team.name} className="w-full h-full object-cover" loading="lazy" />
              : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xl">🏳️</div>
            }
          </div>
          <span className="text-xs font-bold text-gray-800 text-center leading-tight w-full px-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {match.home_team.name}
          </span>
        </div>

        {/* Centre score/time */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 w-20">
          {match.status === 'finished' || match.status === 'live' ? (
            <>
              <div className="text-2xl font-black text-gray-900 tabular-nums leading-none">
                {match.home_score ?? 0}
                <span className="text-gray-300 mx-1">-</span>
                {match.away_score ?? 0}
              </div>
              {match.status === 'live' && (
                <span className="text-red-500 text-xs font-bold mt-0.5 animate-pulse">LIVE</span>
              )}
            </>
          ) : (
            <>
              <span className="text-base font-black text-gray-300">VS</span>
              <span className="text-xs text-gray-400 font-medium mt-0.5 text-center leading-tight">
                {format(matchDate, 'dd/MM', { locale: vi })}
              </span>
              <span className="text-xs font-bold text-blue-600">
                {format(matchDate, 'HH:mm', { locale: vi })}
              </span>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-14 h-10 rounded-lg overflow-hidden shadow-md ring-2 ring-gray-100 flex-shrink-0 bg-gray-50">
            {match.away_team.flag_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={match.away_team.flag_url} alt={match.away_team.name} className="w-full h-full object-cover" loading="lazy" />
              : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xl">🏳️</div>
            }
          </div>
          <span className="text-xs font-bold text-gray-800 text-center leading-tight w-full px-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {match.away_team.name}
          </span>
        </div>
      </div>

      {/* Odds (reference) — upcoming/live only */}
      {(match.status === 'scheduled' || match.status === 'live') && match.odds && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-1.5 bg-gray-50/60">
          <p className="text-[10px] text-gray-400 font-semibold mb-1 flex items-center gap-1">
            📊 Tỷ lệ tham khảo
          </p>

          {/* 1x2 */}
          {match.odds.h2h && (
            <div className="grid grid-cols-3 gap-1 mb-1">
              {([
                { k: '1', v: match.odds.h2h.home },
                { k: 'X', v: match.odds.h2h.draw },
                { k: '2', v: match.odds.h2h.away },
              ] as const).map(({ k, v }) => (
                <div key={k} className="flex flex-col items-center bg-white rounded-md border border-gray-100 py-1">
                  <span className="text-[9px] text-gray-400 font-bold">{k}</span>
                  <span className="text-xs font-black text-gray-800 tabular-nums">{fmtOdd(v)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            {/* Handicap (chấp) */}
            {match.odds.spreads && (
              <div className="bg-white rounded-md border border-gray-100 px-1.5 py-1">
                <p className="text-[9px] text-gray-400 font-bold leading-none mb-1">Kèo chấp</p>
                <div className="flex items-center justify-between text-[10px] leading-tight">
                  <span className="font-bold text-gray-700">{match.home_team.country_code}</span>
                  <span className="text-gray-500 tabular-nums">
                    {fmtPoint(match.odds.spreads.home_point)} <span className="text-blue-600 font-bold">{fmtOdd(match.odds.spreads.home_price)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] leading-tight">
                  <span className="font-bold text-gray-700">{match.away_team.country_code}</span>
                  <span className="text-gray-500 tabular-nums">
                    {fmtPoint(match.odds.spreads.away_point)} <span className="text-blue-600 font-bold">{fmtOdd(match.odds.spreads.away_price)}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Over/Under (tài/xỉu) */}
            {match.odds.totals && (
              <div className="bg-white rounded-md border border-gray-100 px-1.5 py-1">
                <p className="text-[9px] text-gray-400 font-bold leading-none mb-1">Tài/Xỉu {match.odds.totals.point}</p>
                <div className="flex items-center justify-between text-[10px] leading-tight">
                  <span className="font-bold text-gray-700">Tài</span>
                  <span className="text-blue-600 font-bold tabular-nums">{fmtOdd(match.odds.totals.over)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] leading-tight">
                  <span className="font-bold text-gray-700">Xỉu</span>
                  <span className="text-blue-600 font-bold tabular-nums">{fmtOdd(match.odds.totals.under)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prediction section */}
      <div className="border-t border-gray-100 px-3 py-3 mt-auto">

        {/* Confirming state */}
        {pendingValue && canPredict ? (
          <div className="space-y-2 animate-scale-in">
            <p className="text-xs text-center text-gray-500">
              Bạn chọn: <span className="font-bold text-blue-700">{PREDICTION_SHORT[pendingValue]}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={loading}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all">
                {loading ? '⏳ Đang lưu...' : '✓ Xác nhận'}
              </button>
              <button onClick={() => setPendingValue(null)} disabled={loading}
                className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 text-xs font-semibold transition-all">
                Chọn lại
              </button>
            </div>
          </div>

        /* Can predict, no existing prediction */
        ) : canPredict && !userPrediction ? (
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">Chọn kết quả</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['home_win', 'draw', 'away_win'] as PredictionValue[]).map((val) => (
                <button key={val} onClick={() => handleSelectOption(val)}
                  className="py-2 rounded-xl text-xs font-semibold border-2 border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all">
                  {PREDICTION_SHORT[val]}
                </button>
              ))}
            </div>
          </div>

        /* Has prediction, can still change */
        ) : canPredict && userPrediction ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-gray-400">Đã chọn:</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                {PREDICTION_SHORT[userPrediction]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['home_win', 'draw', 'away_win'] as PredictionValue[]).map((val) => (
                <button key={val} onClick={() => handleSelectOption(val)} disabled={loading}
                  className={clsx(
                    'py-1.5 rounded-lg text-xs font-semibold border-2 transition-all',
                    userPrediction === val
                      ? 'bg-blue-600 border-blue-600 text-white shadow'
                      : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  )}>
                  {PREDICTION_SHORT[val]}
                </button>
              ))}
            </div>
            <button onClick={handleCancelPredict} disabled={loading}
              className="w-full py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 text-xs font-semibold transition-all disabled:opacity-40">
              {loading ? 'Đang hủy...' : '✕ Hủy dự đoán'}
            </button>
          </div>

        /* Finished — show result */
        ) : userPrediction ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-gray-400">Dự đoán:</span>
            <span className={clsx(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              match.user_prediction?.is_correct === true
                ? 'bg-green-100 text-green-700'
                : match.user_prediction?.is_correct === false
                ? 'bg-red-100 text-red-600'
                : 'bg-blue-100 text-blue-700'
            )}>
              {PREDICTION_SHORT[userPrediction]}
              {match.user_prediction?.is_correct === true  && ' ✓ +3'}
              {match.user_prediction?.is_correct === false && ' ✗'}
            </span>
          </div>

        ) : !isAuthenticated ? (
          <p className="text-xs text-gray-400 text-center">
            <a href="/auth/login" className="text-blue-500 hover:underline font-medium">Đăng nhập</a> để dự đoán
          </p>
        ) : (
          <p className="text-xs text-gray-300 text-center">Đã đóng dự đoán</p>
        )}
      </div>

      {/* Admin result editor */}
      {isAdmin && (
        <div className="border-t border-orange-100 px-3 py-2 bg-orange-50/50">
          {!adminOpen ? (
            <button
              onClick={() => { setAdminOpen(true); setHomeInput(match.home_score?.toString() ?? ''); setAwayInput(match.away_score?.toString() ?? ''); }}
              className="w-full text-xs text-orange-600 font-semibold py-1 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
            >
              <span>✏️</span> Nhập kết quả
            </button>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="99" required
                  value={homeInput} onChange={e => setHomeInput(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="0"
                />
                <span className="text-gray-400 font-bold text-sm flex-shrink-0">-</span>
                <input
                  type="number" min="0" max="99" required
                  value={awayInput} onChange={e => setAwayInput(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="0"
                />
              </div>
              {adminError && <p className="text-xs text-red-500 text-center">{adminError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={adminLoading}
                  className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                  {adminLoading ? 'Đang lưu...' : 'Lưu kết quả'}
                </button>
                <button type="button" onClick={() => setAdminOpen(false)}
                  className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
