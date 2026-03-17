import * as React from 'react'
import { cn } from '../lib/cn.ts'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode
  footer?: React.ReactNode
  elevation?: 'flat' | 'raised' | 'floating'
}

const elevationClasses = {
  flat: 'border border-gray-200',
  raised: 'shadow-md border border-gray-100',
  floating: 'shadow-xl border border-gray-50',
}

export function Card({ header, footer, elevation = 'raised', className, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn('rounded-xl bg-white overflow-hidden', elevationClasses[elevation], className)}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">
          {header}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  )
}
