'use client';

import { useState } from 'react';
import { vnTime, vnDateShort } from '@/lib/datetime';
import type { WorldCupMatch } from '@/types';
import MatchPredictionsModal from '@/components/MatchPredictionsModal';
import clsx from 'clsx';

interface MatchCardProps {
  match: WorldCupMatch;
  onPredict?: (matchId: number, homeScore: number, awayScore: number, trashTalk: string) => Promise<void>;
  onCancelPredict?: (predictionId: number, matchId: number) => Promise<void>;
  isAuthenticated?: boolean;
}

const STAKE = 10;

const ROUND_LABELS: Record<string, string> = {
  group: 'Vòng bảng',
  round_of_32: 'Vòng 32 đội',
  round_of_16: 'Vòng 1/8',
  quarter_final: 'Tứ kết',
  semi_final: 'Bán kết',
  third_place: 'Tranh hạng 3',
  final: 'Chung kết',
};

const fmtOdd = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : n.toFixed(2);

const fmtPoint = (p: number | null | undefined): string =>
  p === null || p === undefined ? '' : p > 0 ? `+${p}` : `${p}`;

export default function MatchCard({ match, onPredict, onCancelPredict, isAuthenticated }: MatchCardProps) {
  const userPrediction = match.user_prediction ?? null;

  const [homePred, setHomePred] = useState(userPrediction ? String(userPrediction.predicted_home_score) : '');
  const [awayPred, setAwayPred] = useState(userPrediction ? String(userPrediction.predicted_away_score) : '');
  const [trashTalk, setTrashTalk] = useState(userPrediction?.trash_talk ?? '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictionsOpen, setPredictionsOpen] = useState(false);

  const matchDate = new Date(match.match_date);
  const isPast = matchDate < new Date();
  const canPredict = match.status === 'scheduled' && !isPast && isAuthenticated;

  const handleConfirm = async () => {
    if (!onPredict) return;
    const h = parseInt(homePred, 10);
    const a = parseInt(awayPred, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setLoading(true);
    try {
      await onPredict(match.id, h, a, trashTalk);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPredict = async () => {
    if (!onCancelPredict || !userPrediction) return;
    setLoading(true);
    try {
      await onCancelPredict(userPrediction.id, match.id);
      setHomePred('');
      setAwayPred('');
      setTrashTalk('');
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

  const scoreInputs = (
    <div className="flex items-center justify-center gap-2">
      <input
        type="number" min="0" max="99" inputMode="numeric"
        value={homePred} onChange={(e) => setHomePred(e.target.value)}
        placeholder="0"
        className="w-12 border-2 border-gray-200 rounded-lg px-1 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-gray-400 font-bold">-</span>
      <input
        type="number" min="0" max="99" inputMode="numeric"
        value={awayPred} onChange={(e) => setAwayPred(e.target.value)}
        placeholder="0"
        className="w-12 border-2 border-gray-200 rounded-lg px-1 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

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
                {vnDateShort(match.match_date)}
              </span>
              <span className="text-xs font-bold text-blue-600">
                {vnTime(match.match_date)}
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

        {canPredict && (!userPrediction || editing) ? (
          /* Enter / edit score prediction */
          <div className="space-y-2">
            <p className="text-xs text-gray-400 text-center">Đoán tỉ số chính xác</p>
            {scoreInputs}
            <div>
              <textarea
                value={trashTalk}
                onChange={(event) => setTrashTalk(event.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Trash talk nhẹ một câu... (không bắt buộc)"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-0.5 text-right text-[10px] text-gray-300">{trashTalk.length}/280</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={loading || homePred === '' || awayPred === ''}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all">
                {loading ? '⏳...' : `Cược ${STAKE} vcoins`}
              </button>
              {userPrediction && (
                <button onClick={() => { setEditing(false); setHomePred(String(userPrediction.predicted_home_score)); setAwayPred(String(userPrediction.predicted_away_score)); setTrashTalk(userPrediction.trash_talk ?? ''); }} disabled={loading}
                  className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold transition-all">
                  Hủy sửa
                </button>
              )}
            </div>
          </div>

        ) : canPredict && userPrediction ? (
          /* Has prediction, can still change before kickoff */
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-gray-400">Bạn đoán:</span>
              <span className="text-sm font-black px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 tabular-nums">
                {userPrediction.predicted_home_score} - {userPrediction.predicted_away_score}
              </span>
            </div>
            {userPrediction.trash_talk && (
              <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-center text-xs italic text-amber-700">“{userPrediction.trash_talk}”</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} disabled={loading}
                className="flex-1 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-all">
                Sửa tỉ số
              </button>
              <button onClick={handleCancelPredict} disabled={loading}
                className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 text-xs font-semibold transition-all disabled:opacity-40">
                {loading ? 'Đang hủy...' : '✕ Hủy'}
              </button>
            </div>
          </div>

        ) : userPrediction ? (
          /* Match started/finished — show prediction + outcome */
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Bạn đoán:</span>
            <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 tabular-nums">
              {userPrediction.predicted_home_score} - {userPrediction.predicted_away_score}
            </span>
            {match.status === 'finished' && (
              userPrediction.is_correct === true ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  ✓ +{userPrediction.points_earned} vcoins
                </span>
              ) : userPrediction.is_correct === false ? (
                <span className={clsx(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  userPrediction.points_earned < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                )}>
                  {userPrediction.points_earned < 0 ? `${userPrediction.points_earned} vcoins` : '0 vcoins'}
                </span>
              ) : null
            )}
          </div>

        ) : !isAuthenticated ? (
          <p className="text-xs text-gray-400 text-center">
            <a href="/auth/login" className="text-blue-500 hover:underline font-medium">Đăng nhập</a> để dự đoán
          </p>
        ) : (
          <p className="text-xs text-gray-300 text-center">Đã đóng dự đoán</p>
        )}

        <button
          onClick={() => setPredictionsOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/70 py-2 text-xs font-bold text-blue-700 transition-all hover:border-blue-200 hover:bg-blue-100 hover:shadow-sm"
        >
          <span>{match.status === 'finished' ? '🏁' : '👥'}</span>
          {match.status === 'finished' ? 'Kết quả dự đoán' : 'Xem dự đoán của mọi người'}
        </button>
      </div>

      <MatchPredictionsModal
        match={match}
        open={predictionsOpen}
        onClose={() => setPredictionsOpen(false)}
      />
    </div>
  );
}
