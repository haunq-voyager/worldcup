'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import LeaderboardSidebar from './LeaderboardSidebar';

const STORAGE_KEY = 'leaderboard_open';

export default function LeaderboardPanel() {
  const [open, setOpen] = useState(true);

  // Khôi phục trạng thái đã lưu (chạy sau hydrate để tránh lệch SSR)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setOpen(saved === '1');
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <>
      {/* Tab nổi để mở lại khi đã đóng */}
      {!open && (
        <button
          onClick={toggle}
          title="Mở bảng xếp hạng"
          aria-label="Mở bảng xếp hạng"
          className="hidden lg:flex fixed right-0 top-20 z-30 flex-col items-center gap-1 px-2 py-3 bg-white border border-r-0 border-gray-200 rounded-l-xl shadow-md hover:bg-gray-50 text-gray-700"
        >
          <span className="text-base">🏆</span>
          <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold tracking-wide">
            BXH
          </span>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'hidden lg:block flex-shrink-0 self-start sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden bg-white transition-all duration-300',
          open
            ? 'w-72 border-l border-gray-100 shadow-[-1px_0_8px_rgba(0,0,0,0.04)]'
            : 'w-0 border-l-0'
        )}
      >
        {open && <LeaderboardSidebar onClose={toggle} />}
      </aside>
    </>
  );
}
