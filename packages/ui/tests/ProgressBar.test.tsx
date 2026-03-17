import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressBar } from '../src/components/ProgressBar'

describe('ProgressBar', () => {
  it('renders progressbar role', () => {
    render(<ProgressBar value={0.7} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria-valuenow correctly', () => {
    render(<ProgressBar value={0.5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })

  it('applies className to container', () => {
    const { container } = render(<ProgressBar value={0.1} className="progress-x" />)
    expect(container.firstChild).toHaveClass('progress-x')
  })

  it('shows percentage when showPercent is true', () => {
    render(<ProgressBar value={0.75} showPercent />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })
})
