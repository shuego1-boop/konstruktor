import * as React from 'react'
import { cn } from '../lib/cn.ts'

type ProgressBarProps = {
  /** Value between 0 and 1 */
  value: number
  label?: string
  showPercent?: boolean
  colorClass?: string
  className?: string
}

export function ProgressBar({
  value,
  label,
  showPercent = false,
  colorClass = 'bg-blue-600',
  className,
}: ProgressBarProps) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label ?? showPercent) && (
        <div className="flex justify-between text-sm text-gray-600">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct}%</span>}
        </div>
      )}
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
