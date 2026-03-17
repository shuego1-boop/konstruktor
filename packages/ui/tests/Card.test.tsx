import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '../src/components/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders header and footer', () => {
    render(<Card header="Title" footer="Footer">Body</Card>)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('applies className to root element', () => {
    const { container } = render(<Card className="test-class">X</Card>)
    expect(container.firstChild).toHaveClass('test-class')
  })
})
