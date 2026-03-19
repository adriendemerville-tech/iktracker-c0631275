import { useState } from 'react';
import { Stethoscope, Hammer, Briefcase, TrendingUp, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PERSONA_OPTIONS = [
  {
    value: 'sante_liberal',
    label: 'Professionnel de Santé Libéral',
    icon: Stethoscope,
    profession: 'Santé et médical',
  },
  {
    value: 'artisan_btp',
    label: 'Artisan / Professionnel du BTP',
    icon: Hammer,
    profession: 'Bâtiment et entretiens',
  },
  {
    value: 'consultant_freelance',
    label: 'Consultant / Freelance',
    icon: Briefcase,
    profession: 'Indépendants',
  },
  {
    value: 'commercial_immobilier',
    label: 'Commercial / Agent Immobilier',
    icon: TrendingUp,
    profession: 'Immobilier',
  },
  {
    value: 'expert_comptable_tns',
    label: 'Expert-Comptable / Dirigeant TNS',
    icon: Calculator,
    profession: 'Audit et expertise comptable',
  },
] as const;

export type PersonaValue = typeof PERSONA_OPTIONS[number]['value'];

interface PersonaPickerProps {
  onSelect: (persona: PersonaValue) => void;
}

export function PersonaPicker({ onSelect }: PersonaPickerProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-slate-700/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Question */}
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 tracking-tight">
          Quel est votre profil ?
        </h1>

        {/* Buttons */}
        <div className="space-y-3">
          {PERSONA_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isHovered = hoveredIndex === index;

            return (
              <button
                key={option.value}
                onClick={() => onSelect(option.value)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  'w-full flex items-center gap-4 px-6 py-4 rounded-xl border transition-all duration-200 text-left',
                  'bg-slate-900/60 border-slate-800/60 text-slate-200',
                  'hover:bg-slate-800/80 hover:border-slate-600/60 hover:text-white',
                  'active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50'
                )}
                style={{
                  animationDelay: `${index * 60}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200',
                  isHovered ? 'bg-blue-500/20' : 'bg-slate-800/80'
                )}>
                  <Icon className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    isHovered ? 'text-blue-400' : 'text-slate-400'
                  )} />
                </div>
                <span className="text-[15px] font-medium">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
