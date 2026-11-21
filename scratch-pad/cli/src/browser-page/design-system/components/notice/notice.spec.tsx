import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Notice } from './notice'

describe('Notice', () => {
  it('is a status when the tone is info', () => {
    render(<Notice tone="info">Loading…</Notice>)
    expect(screen.getByRole('status').textContent).toBe('Loading…')
  })

  it('is a note when the tone is warning', () => {
    render(<Notice tone="warning">There aren’t any blocks called :::chart.</Notice>)
    expect(screen.getByRole('note').className).toBe('notice notice--warning')
  })
})
