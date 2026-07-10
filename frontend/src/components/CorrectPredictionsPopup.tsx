'use client';

import type { CorrectPredictionToday } from '@/types';
import Fireworks from '@/components/Fireworks';
import UserAvatar from '@/components/UserAvatar';

interface CorrectPredictionsPopupProps {
  open: boolean;
  predictions: CorrectPredictionToday[];
  date: string;
  onClose: () => void;
}

export default function CorrectPredictionsPopup({
  open,
  predictions,
  date,
  onClose,
}: CorrectPredictionsPopupProps) {
  if (!open || predictions.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-gray-950/45 px-4 pb-5 pt-12 backdrop-blur-sm sm:items-center sm:pb-12">
      <Fireworks />
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in">
        <div className="bg-gradient-to-r from-emerald-600 to-blue-700 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/70">{date}</p>
              <h2 className="mt-1 text-xl font-black">Dự đoán chính xác hôm nay</h2>
              <p className="mt-1 text-sm text-white/80">{predictions.length} người đang ăn vcoins.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white transition hover:bg-white/25"
            >
              x
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {predictions.map((prediction) => (
              <div
                key={prediction.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
              >
                <UserAvatar
                  name={prediction.user.name}
                  avatarUrl={prediction.user.avatar_url}
                  className="h-10 w-10 text-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-gray-900">{prediction.user.name}</p>
                    <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">
                      +{prediction.points_earned}
                    </span>
                  </div>
                  <p className="truncate text-xs font-semibold text-gray-500">
                    {prediction.match.home_team} {prediction.match.home_score} - {prediction.match.away_score}{' '}
                    {prediction.match.away_team}
                  </p>
                  <p className="text-xs text-gray-400">
                    Đoán {prediction.predicted_home_score} - {prediction.predicted_away_score}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
