import * as React from 'react'
import { cn } from '../lib/cn.ts'

type StreakBadgeProps = {
  streak: number
  className?: string
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak < 2) return null

  const tier =
    streak >= 10
      ? { label: 'LEGENDARY', classes: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🔥' }
      : streak >= 5
        ? { label: 'ON FIRE', classes: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🔥' }
        : { label: 'STREAK', classes: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⚡' }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide',
        tier.classes,
        className,
      )}
    >
      <span aria-hidden="true">{tier.icon}</span>
      <span>{tier.label}</span>
      <span className="rounded-full bg-current/10 px-1.5 py-0.5 font-mono">{streak}x</span>
    </div>
  )
}
