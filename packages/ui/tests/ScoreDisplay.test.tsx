import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreDisplay } from '../src/components/ScoreDisplay'

describe('ScoreDisplay', () => {
  it('renders percentage', () => {
    render(<ScoreDisplay points={5} maxPoints={10} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders points text', () => {
    render(<ScoreDisplay points={7} maxPoints={10} />)
    const el = screen.getByText(/7.*10 pts/i)
    expect(el).toBeInTheDocument()
  })

  it('applies className to container', () => {
    const { container } = render(<ScoreDisplay points={1} maxPoints={2} className="score-x" />)
    expect(container.firstChild).toHaveClass('score-x')
  })

  it('uses provided percentage override', () => {
    render(<ScoreDisplay points={0} maxPoints={10} percentage={80} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })
})
