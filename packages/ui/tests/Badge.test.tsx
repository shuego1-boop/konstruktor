import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '../src/components/Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>BadgeText</Badge>)
    expect(screen.getByText('BadgeText')).toBeInTheDocument()
  })

  it('applies className', () => {
    render(<Badge className="my-badge">B</Badge>)
    expect(screen.getByText('B')).toHaveClass('my-badge')
  })

  it('renders with success variant', () => {
    render(<Badge variant="success">OK</Badge>)
    expect(screen.getByText('OK')).toHaveClass('text-green-800')
  })
})
