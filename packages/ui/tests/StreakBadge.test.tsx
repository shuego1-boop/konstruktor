import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StreakBadge } from '../src/components/StreakBadge'

describe('StreakBadge', () => {
  it('renders streak count with x suffix', () => {
    render(<StreakBadge streak={3} />)
    expect(screen.getByText('3x')).toBeInTheDocument()
  })

  it('returns null for streak < 2', () => {
    const { container } = render(<StreakBadge streak={1} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies className to container', () => {
    const { container } = render(<StreakBadge streak={3} className="streak-x" />)
    expect(container.firstChild).toHaveClass('streak-x')
  })

  it('shows LEGENDARY label for streak >= 10', () => {
    render(<StreakBadge streak={10} />)
    expect(screen.getByText('LEGENDARY')).toBeInTheDocument()
  })
})
