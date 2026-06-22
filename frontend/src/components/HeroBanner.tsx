'use client';

import { useEffect, useState } from 'react';

const TEAMS = [
  { name: 'Brazil',       flag: 'https://flagcdn.com/w80/br.png' },
  { name: 'Argentina',    flag: 'https://flagcdn.com/w80/ar.png' },
  { name: 'France',       flag: 'https://flagcdn.com/w80/fr.png' },
  { name: 'Germany',      flag: 'https://flagcdn.com/w80/de.png' },
  { name: 'Spain',        flag: 'https://flagcdn.com/w80/es.png' },
  { name: 'England',      flag: 'https://flagcdn.com/w80/gb-eng.png' },
  { name: 'Portugal',     flag: 'https://flagcdn.com/w80/pt.png' },
  { name: 'Netherlands',  flag: 'https://flagcdn.com/w80/nl.png' },
  { name: 'Italy',        flag: 'https://flagcdn.com/w80/it.png' },
  { name: 'Japan',        flag: 'https://flagcdn.com/w80/jp.png' },
  { name: 'Morocco',      flag: 'https://flagcdn.com/w80/ma.png' },
  { name: 'USA',          flag: 'https://flagcdn.com/w80/us.png' },
  { name: 'South Korea',  flag: 'https://flagcdn.com/w80/kr.png' },
  { name: 'Senegal',      flag: 'https://flagcdn.com/w80/sn.png' },
  { name: 'Croatia',      flag: 'https://flagcdn.com/w80/hr.png' },
  { name: 'Indonesia',    flag: 'https://flagcdn.com/w80/id.png' },
];

const DOUBLED = [...TEAMS, ...TEAMS];

const STATS = [
  { label: '48 đội tuyển', icon: '🌍' },
  { label: '104 trận đấu', icon: '⚽' },
  { label: '16 sân vận động', icon: '🏟️' },
  { label: '3 quốc gia đăng cai', icon: '🗺️' },
];

export default function HeroBanner() {
  const [tick, setTick] = useState(0);

  // Floating footballs tick
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0e2e 0%, #0d1b4b 40%, #1a2a6c 70%, #0f3460 100%)' }}>

      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 60 + '%',
              left: Math.random() * 100 + '%',
              opacity: 0.3 + Math.random() * 0.5,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Floating footballs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute text-3xl select-none"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animation: `floatBall ${4 + i * 0.7}s ease-in-out ${i * 0.5}s infinite`,
              opacity: 0.15 + (i % 3) * 0.1,
              fontSize: `${24 + i * 4}px`,
            }}
          >
            ⚽
          </div>
        ))}
      </div>

      {/* Spotlight rays */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${15 + i * 25}%`,
              width: '2px',
              height: '50%',
              background: 'linear-gradient(to top, rgba(255,215,0,0.15), transparent)',
              transform: `rotate(${-10 + i * 7}deg)`,
              transformOrigin: 'bottom center',
              animation: `spotlight ${3 + i * 0.5}s ease-in-out ${i * 0.7}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-6">

        {/* Trophy + Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3" style={{ animation: 'trophyPulse 2s ease-in-out infinite' }}>🏆</div>
          <div className="text-xs font-bold tracking-[0.4em] text-yellow-400 uppercase mb-2">
            FIFA
          </div>
          <h1 className="font-black text-white leading-none mb-2" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', textShadow: '0 0 40px rgba(255,215,0,0.6)' }}>
            WORLD CUP
          </h1>
          <div
            className="font-black text-transparent bg-clip-text"
            style={{
              fontSize: 'clamp(3rem, 10vw, 6.5rem)',
              backgroundImage: 'linear-gradient(135deg, #ffd700 0%, #ffed80 40%, #ffa500 70%, #ffd700 100%)',
              animation: 'goldShimmer 3s linear infinite',
              backgroundSize: '200% 100%',
              lineHeight: 1,
            }}
          >
            2026
          </div>
          <p className="text-blue-200 mt-3 text-sm tracking-widest uppercase">
            USA · Canada · Mexico
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,215,0,0.2)', backdropFilter: 'blur(8px)' }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Team flags marquee */}
        <div className="relative overflow-hidden mb-6" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="flex gap-4 marquee-track">
            {DOUBLED.map((team, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="rounded-xl overflow-hidden shadow-lg transition-transform group-hover:scale-110"
                  style={{ border: '2px solid rgba(255,215,0,0.3)', width: 64, height: 46 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={team.flag} alt={team.name} className="object-cover w-full h-full" loading="lazy" />
                </div>
                <span className="text-white text-xs font-medium opacity-70 whitespace-nowrap">{team.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crowd wave */}
        <div className="relative overflow-hidden" style={{ height: 60 }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {/* Crowd silhouettes */}
            <g fill="rgba(255,255,255,0.06)">
              {[...Array(36)].map((_, i) => {
                const x = i * 40;
                const h = 20 + (i % 5) * 6;
                return (
                  <g key={i} style={{ animation: `crowdWave 2s ease-in-out ${i * 0.06}s infinite alternate` }}>
                    {/* Body */}
                    <ellipse cx={x + 8} cy={60 - h * 0.3} rx={7} ry={h * 0.7} />
                    {/* Head */}
                    <circle cx={x + 8} cy={60 - h} r={5} />
                    {/* Raised arm */}
                    <line x1={x + 8} y1={60 - h * 0.7} x2={x + 18} y2={60 - h * 1.1} stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
                  </g>
                );
              })}
            </g>
            {/* Ground line */}
            <rect x={0} y={58} width={1440} height={2} fill="rgba(255,215,0,0.2)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
