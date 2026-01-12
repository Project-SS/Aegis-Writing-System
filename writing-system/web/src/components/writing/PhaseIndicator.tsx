'use client';

import { WritingPhase, PHASES } from '@/types';
import { Check, Circle, Loader2 } from 'lucide-react';

interface PhaseIndicatorProps {
  currentPhase: WritingPhase;
  completedPhases: WritingPhase[];
  quickMode?: boolean;
}

export function PhaseIndicator({ currentPhase, completedPhases, quickMode = false }: PhaseIndicatorProps) {
  const displayPhases = quickMode 
    ? PHASES.filter(p => ['strategy', 'writing', 'proofread'].includes(p.id))
    : PHASES;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">진행 단계</h3>
      <div className="space-y-1">
        {displayPhases.map((phase, index) => {
          const isCompleted = completedPhases.includes(phase.id);
          const isCurrent = currentPhase === phase.id;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div
              key={phase.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all
                ${isCurrent ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30' : ''}
                ${isCompleted ? 'opacity-70' : ''}
              `}
            >
              {/* Status Icon */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isCompleted ? 'bg-[var(--success)]/20 text-[var(--success)]' : ''}
                ${isCurrent ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]' : ''}
                ${isPending ? 'bg-[var(--bg-hover)] text-[var(--text-muted)]' : ''}
              `}>
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Phase Info */}
              <div className="flex-1 min-w-0">
                <p className={`
                  text-sm font-medium truncate
                  ${isCurrent ? 'text-[var(--accent-primary)]' : ''}
                  ${isCompleted ? 'text-[var(--text-secondary)]' : ''}
                  ${isPending ? 'text-[var(--text-muted)]' : ''}
                `}>
                  {phase.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {phase.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
