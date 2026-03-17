import * as React from 'react'
import { cn } from '../lib/cn.ts'

type AnswerFeedbackProps = {
  correct: boolean
  explanation?: string
  className?: string
}

export function AnswerFeedback({ correct, explanation, className }: AnswerFeedbackProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        correct
          ? 'bg-green-50 border-green-300 text-green-800'
          : 'bg-red-50 border-red-300 text-red-800',
        className,
      )}
    >
      <span className="text-xl leading-none mt-0.5" aria-hidden="true">
        {correct ? '✓' : '✗'}
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{correct ? 'Correct!' : 'Incorrect'}</p>
        {explanation && <p className="text-sm opacity-80">{explanation}</p>}
      </div>
    </div>
  )
}
