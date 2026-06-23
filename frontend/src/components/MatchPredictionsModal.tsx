'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { predictionsApi } from '@/lib/api';
import type { MatchPredictionViewer, MatchPredictionsResponse, WorldCupMatch } from '@/types';
import UserAvatar from '@/components/UserAvatar';

interface MatchPredictionsModalProps {
  match: WorldCupMatch;
  open: boolean;
  onClose: () => void;
}

const EMPTY_SUMMARY: MatchPredictionsResponse['summary'] = {
  total: 0,
  correct: 0,
  wrong: 0,
  pending: 0,
};

export default function MatchPredictionsModal({ match, open, onClose }: MatchPredictionsModalProps) {
  const [predictions, setPredictions] = useState<MatchPredictionViewer[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError('');
    setPredictions([]);
    setSummary(EMPTY_SUMMARY);
    setPage(1);

    predictionsApi.forMatch(match.id)
      .then((response) => {
        if (!active) return;
        setPredictions(response.data);
        setSummary(response.summary);
        setLastPage(response.meta.last_page);
      })
      .catch(() => active && setError('Không thể tải danh sách dự đoán. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [match.id, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const loadMore = async () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await predictionsApi.forMatch(match.id, nextPage);
      setPredictions((current) => [...current, ...response.data]);
      setSummary(response.summary);
      setPage(nextPage);
      setLastPage(response.meta.last_page);
    } catch {
      setError('Không thể tải thêm dự đoán.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const finished = match.status === 'finished';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={`predictions-title-${match.id}`}>
      <button className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose} aria-label="Đóng popup" />

      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in">
        <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-5 py-4 text-white">
          <button onClick={onClose} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20" aria-label="Đóng">
            ×
          </button>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            {finished ? 'Kết quả dự đoán' : 'Danh sách dự đoán'}
          </p>
          <h2 id={`predictions-title-${match.id}`} className="mt-1 pr-8 text-lg font-black sm:text-xl">
            {match.home_team.name}
            <span className="mx-2 text-blue-300">{finished ? `${match.home_score} - ${match.away_score}` : 'vs'}</span>
            {match.away_team.name}
          </h2>
        </div>

        <div className={clsx('grid gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3', finished ? 'grid-cols-3' : 'grid-cols-1')}>
          <SummaryItem label="Người dự đoán" value={summary.total} color="text-blue-700" />
          {finished && <SummaryItem label="Đoán đúng" value={summary.correct} color="text-green-600" />}
          {finished && <SummaryItem label="Đoán sai" value={summary.wrong} color="text-red-500" />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
            </div>
          ) : error && predictions.length === 0 ? (
            <p className="py-10 text-center text-sm text-red-500">{error}</p>
          ) : predictions.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mb-2 text-4xl">🔮</div>
              <p className="font-semibold text-gray-600">Chưa có ai dự đoán trận này</p>
              <p className="mt-1 text-xs text-gray-400">Hãy là người đầu tiên đưa ra tỉ số!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {predictions.map((prediction) => (
                <div key={prediction.id} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50">
                  <UserAvatar
                    name={prediction.user.name}
                    avatarUrl={prediction.user.avatar_url}
                    className="h-9 w-9 text-sm"
                    fallbackClassName="bg-blue-100 text-blue-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{prediction.user.name}</p>
                    {prediction.trash_talk && (
                      <p className="mt-1 break-words rounded-lg bg-amber-50 px-2 py-1.5 text-xs italic leading-relaxed text-amber-700">
                        “{prediction.trash_talk}”
                      </p>
                    )}
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-black tabular-nums text-slate-700">
                    {prediction.predicted_home_score} - {prediction.predicted_away_score}
                  </span>
                  <ResultBadge prediction={prediction} finished={finished} />
                </div>
              ))}

              {page < lastPage && (
                <button onClick={loadMore} disabled={loadingMore} className="w-full rounded-xl border border-blue-200 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                  {loadingMore ? 'Đang tải...' : 'Xem thêm dự đoán'}
                </button>
              )}
              {error && <p className="text-center text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SummaryItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
      <p className={clsx('text-xl font-black', color)}>{value}</p>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
    </div>
  );
}

function ResultBadge({ prediction, finished }: { prediction: MatchPredictionViewer; finished: boolean }) {
  if (!finished || prediction.is_correct === null) {
    return <span className="hidden min-w-[72px] text-center text-[11px] font-bold text-amber-500 sm:inline">Chờ kết quả</span>;
  }

  if (prediction.is_correct) {
    return (
      <span className="min-w-[72px] rounded-full bg-green-100 px-2 py-1 text-center text-[11px] font-bold text-green-700">
        ✓ Đúng {prediction.points_earned > 0 ? `+${prediction.points_earned}` : ''}
      </span>
    );
  }

  return (
    <span className="min-w-[72px] rounded-full bg-red-50 px-2 py-1 text-center text-[11px] font-bold text-red-600">
      ✕ Sai {prediction.points_earned < 0 ? prediction.points_earned : ''}
    </span>
  );
}
