import type { Team } from '@/types';

interface TeamCardProps {
  team: Team;
}

const CONF_COLORS: Record<string, string> = {
  UEFA:     'bg-blue-50 text-blue-700 border-blue-200',
  CONMEBOL: 'bg-green-50 text-green-700 border-green-200',
  CONCACAF: 'bg-red-50 text-red-700 border-red-200',
  AFC:      'bg-amber-50 text-amber-700 border-amber-200',
  CAF:      'bg-orange-50 text-orange-700 border-orange-200',
  OFC:      'bg-purple-50 text-purple-700 border-purple-200',
};

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <div className="card-hover bg-white rounded-xl border border-gray-100 p-3 flex flex-col items-center gap-2 shadow-sm">
      {/* Flag */}
      <div className="w-full h-24 rounded-lg overflow-hidden shadow-sm ring-1 ring-gray-100 bg-gray-50 flex items-center justify-center">
        {team.flag_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={team.flag_url.replace('/w80/', '/w160/')} alt={team.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-2xl">🏳️</span>
        }
      </div>

      {/* Name */}
      <p className="font-bold text-gray-900 text-xs text-center leading-tight w-full"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {team.name}
      </p>

      {/* Code + confederation */}
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="text-[10px] font-mono text-gray-400">{team.country_code}</span>
        {team.confederation && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${CONF_COLORS[team.confederation] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            {team.confederation}
          </span>
        )}
      </div>
    </div>
  );
}
