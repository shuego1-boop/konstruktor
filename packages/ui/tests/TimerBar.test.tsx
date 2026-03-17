import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TimerBar } from '../src/components/TimerBar'

describe('TimerBar', () => {
  it('renders progressbar', () => {
    render(<TimerBar elapsedMs={0} durationMs={10000} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows remaining time in seconds', () => {
    render(<TimerBar elapsedMs={0} durationMs={10000} />)
    expect(screen.getByText('10s')).toBeInTheDocument()
  })

  it('applies className to container', () => {
    const { container } = render(<TimerBar elapsedMs={0} durationMs={5000} className="timer-x" />)
    expect(container.firstChild).toHaveClass('timer-x')
  })
})
