import * as React from 'react'
import { cn } from '../lib/cn.ts'

type ScoreDisplayProps = {
  /** Points earned */
  points: number
  /** Maximum possible points */
  maxPoints: number
  /** Percentage score 0–100 */
  percentage?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeConfig = {
  sm: { points: 'text-2xl', label: 'text-xs', pct: 'text-sm' },
  md: { points: 'text-4xl', label: 'text-sm', pct: 'text-base' },
  lg: { points: 'text-6xl', label: 'text-base', pct: 'text-xl' },
}

export function ScoreDisplay({ points, maxPoints, percentage, size = 'md', className }: ScoreDisplayProps) {
  const pct = percentage ?? (maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0)
  const passingColor = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
  const cfg = sizeConfig[size]

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <span className={cn('font-bold tabular-nums', cfg.points, passingColor)}>
        {pct}%
      </span>
      <span className={cn('text-gray-500', cfg.label)}>
        {points} / {maxPoints} pts
      </span>
    </div>
  )
}
