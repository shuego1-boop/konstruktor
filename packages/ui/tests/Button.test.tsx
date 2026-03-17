import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../src/components/Button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByRole('button').textContent).toContain('Click me')
  })

  it('passes props to button element', () => {
    render(<Button type="submit" data-testid="my-btn">OK</Button>)
    const btn = screen.getByTestId('my-btn')
    expect(btn.getAttribute('type')).toBe('submit')
  })

  it('calls onClick handler', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Test</Button>)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalled()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
