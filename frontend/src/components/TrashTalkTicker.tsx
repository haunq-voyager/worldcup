'use client';

import type { MatchTrashTalk } from '@/types';

interface TrashTalkTickerProps {
  items?: MatchTrashTalk[];
}

export default function TrashTalkTicker({ items = [] }: TrashTalkTickerProps) {
  const visibleItems = items.filter((item) => item.message.trim().length > 0);

  if (visibleItems.length === 0) {
    return null;
  }

  const tickerItems = visibleItems.length === 1
    ? [...visibleItems, ...visibleItems, ...visibleItems]
    : visibleItems;

  return (
    <div className="border-y border-amber-100 bg-amber-50/70 py-2">
      <div className="relative overflow-hidden">
        <div className="trash-talk-track flex w-max items-center">
          {[0, 1].map((group) => (
            <div key={group} className="flex items-center gap-3 pr-3">
              {tickerItems.map((item, index) => (
                <div
                  key={`${group}-${item.id}-${index}`}
                  className="flex h-8 max-w-[340px] items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 text-xs shadow-sm"
                >
                  <span className="font-black text-amber-700 truncate">{item.user.name}</span>
                  <span className="text-amber-300">@</span>
                  <span className="max-w-[120px] truncate font-semibold text-gray-500">
                    {item.match.home_team} - {item.match.away_team}
                  </span>
                  <span className="text-amber-300">:</span>
                  <span className="truncate italic text-amber-800">"{item.message}"</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
