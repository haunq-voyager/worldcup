'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

type BallPhase = 'idle' | 'shoot' | 'goal' | 'return';

const SPARKS = [
  { x: '18px',  y: '-22px' },
  { x: '-16px', y: '-20px' },
  { x: '24px',  y: '8px'   },
  { x: '-20px', y: '10px'  },
  { x: '6px',   y: '-28px' },
];

export default function Navbar() {
  const { user, logout, updateProfile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Ball animation state machine ──────────────────────────────────────────
  const [ballPhase, setBallPhase] = useState<BallPhase>('idle');
  const [showFlash, setShowFlash] = useState(false);
  const phaseRef = useRef<BallPhase>('idle');
  phaseRef.current = ballPhase;

  const triggerGoal = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    setBallPhase('shoot');
    setTimeout(() => { setBallPhase('goal'); setShowFlash(true); }, 750);
    setTimeout(() => setShowFlash(false), 1500);
    setTimeout(() => setBallPhase('return'), 2200);
    setTimeout(() => setBallPhase('idle'), 2900);
  }, []);

  useEffect(() => {
    const id = setInterval(triggerGoal, 9000);
    return () => clearInterval(id);
  }, [triggerGoal]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push('/auth/login');
  };

  const openEditModal = () => {
    setNewName(user?.name ?? '');
    setSaveError('');
    setDropdownOpen(false);
    setEditModalOpen(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile(newName.trim());
      setEditModalOpen(false);
    } catch {
      setSaveError('Không thể cập nhật tên. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const links = [
    { href: '/', label: 'Lịch thi đấu' },
    { href: '/teams', label: 'Đội tuyển' },
    { href: '/tournament', label: '🏆 Toàn giải' },
    ...(user ? [{ href: '/predictions', label: 'Dự đoán của tôi' }] : []),
  ];

  return (
    <>
      {/* Gold flash overlay when GOAL! */}
      {showFlash && (
        <div className="fixed inset-0 pointer-events-none z-[100] navbar-flash-overlay"
          style={{ background: 'radial-gradient(ellipse at 8% 50%, rgba(253,224,71,0.18) 0%, transparent 60%)' }}
        />
      )}

      <nav className="navbar-animated shadow-xl relative overflow-hidden">
        {/* Subtle pitch-line decoration */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, white 0, white 1px, transparent 0, transparent 80px)' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <button onClick={triggerGoal} className="flex items-center gap-2.5 select-none focus:outline-none group">
              {/* Ball container — fixed width so layout doesn't shift */}
              <div className="relative w-9 h-9 flex items-center justify-center overflow-visible">
                {/* Shoot phase */}
                {ballPhase === 'shoot' && (
                  <span key="shoot" className="text-2xl animate-ball-shoot absolute">⚽</span>
                )}
                {/* Goal phase — hidden ball, sparkles burst */}
                {ballPhase === 'goal' && SPARKS.map((s, i) => (
                  <span key={i} className="absolute text-sm pointer-events-none"
                    style={{
                      animation: `spark-fly 0.7s ease-out ${i * 60}ms forwards`,
                      ['--tx' as string]: `translateX(${s.x})`,
                      ['--ty' as string]: `translateY(${s.y})`,
                    }}>
                    {['✨', '⭐', '💥', '🌟', '✨'][i]}
                  </span>
                ))}
                {/* Return phase */}
                {ballPhase === 'return' && (
                  <span key="return" className="text-2xl animate-ball-return absolute">⚽</span>
                )}
                {/* Idle phase */}
                {ballPhase === 'idle' && (
                  <span key="idle" className="text-2xl animate-ball-bounce group-hover:scale-110 transition-transform">⚽</span>
                )}
              </div>

              {/* Title or GOAL! */}
              <div className="relative overflow-hidden h-7 flex items-center">
                {ballPhase === 'goal' ? (
                  <span key="goal-text" className="flex items-center gap-1 animate-goal-pop font-black text-lg">
                    <span className="text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.9)] tracking-widest">GOAL!</span>
                    <span>🥅</span>
                  </span>
                ) : (
                  <span key="title" className={clsx(
                    'text-white font-bold text-lg tracking-wide transition-all duration-300',
                    ballPhase === 'return' && 'animate-goal-out'
                  )}>
                    World Cup 2026
                  </span>
                )}
              </div>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 group overflow-hidden',
                    pathname === link.href
                      ? 'text-white'
                      : 'text-blue-200 hover:text-white'
                  )}
                >
                  {/* Active indicator */}
                  {pathname === link.href && (
                    <span className="absolute inset-0 bg-white/15 rounded-lg" />
                  )}
                  {/* Hover glow */}
                  <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-all duration-200" />
                  {/* Bottom accent bar */}
                  <span className={clsx(
                    'absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-yellow-400 rounded-full transition-all duration-300',
                    pathname === link.href ? 'w-4/5 opacity-100' : 'w-0 opacity-0 group-hover:w-2/3 group-hover:opacity-60'
                  )} />
                  <span className="relative">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Auth area */}
            <div className="hidden md:flex items-center gap-3">
              {loading ? (
                <div className="w-24 h-8 bg-white/10 rounded animate-pulse" />
              ) : user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-blue-900 font-bold text-sm flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium leading-tight">{user.name}</p>
                      <p className="text-yellow-300 text-xs font-semibold">{user.total_points} vcoins</p>
                    </div>
                    <svg className={clsx('w-4 h-4 text-blue-200 transition-transform', dropdownOpen && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={openEditModal}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Đổi tên hiển thị
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/auth/login" className="px-4 py-1.5 text-white text-sm font-medium hover:text-blue-200 transition-colors">
                    Đăng nhập
                  </Link>
                  <Link href="/auth/register" className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-blue-900 text-sm font-bold rounded-md transition-colors">
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={clsx(
                    'block px-4 py-2 rounded-md text-sm font-medium',
                    pathname === link.href ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/10 space-y-1">
                {user ? (
                  <>
                    <div className="px-4 py-2">
                      <p className="text-white text-sm font-semibold">{user.name}</p>
                      <p className="text-blue-200 text-xs">{user.email} · {user.total_points} vcoins</p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); openEditModal(); }}
                      className="w-full text-left px-4 py-2 text-blue-100 text-sm hover:text-white"
                    >
                      Đổi tên hiển thị
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-300 text-sm hover:text-red-100">
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3 px-4">
                    <Link href="/auth/login" className="text-blue-100 text-sm" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
                    <Link href="/auth/register" className="text-yellow-400 text-sm font-bold" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Edit name modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Đổi tên hiển thị</h2>
            <p className="text-sm text-gray-400 mb-4">Tên sẽ hiển thị trên bảng xếp hạng</p>

            {saveError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveName} className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={255}
                required
                autoFocus
                placeholder="Nhập tên mới..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || !newName.trim() || newName.trim() === user?.name}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
