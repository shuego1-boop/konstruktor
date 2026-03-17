import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Spinner } from '../src/components/Spinner'

describe('Spinner', () => {
  it('renders with accessible label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading…')).toBeInTheDocument()
  })

  it('applies className', () => {
    render(<Spinner className="spin-x" />)
    expect(screen.getByRole('status')).toHaveClass('spin-x')
  })

  it('renders custom label', () => {
    render(<Spinner label="Please wait" />)
    expect(screen.getByLabelText('Please wait')).toBeInTheDocument()
  })
})
