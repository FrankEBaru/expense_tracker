import React from 'react'

export type NavItemId = 'dashboard' | 'insights' | 'budgets' | 'settings'

export type PillNavItem = {
  id: NavItemId
  label: string
  colorVar: 'var(--color-green)' | 'var(--color-amber)' | 'var(--color-violet)' | 'var(--color-teal)'
  icon: React.ReactNode
}

export default function PillNav({
  items,
  activeId,
  onSelect,
}: {
  items: PillNavItem[]
  activeId: NavItemId
  onSelect: (id: NavItemId) => void
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed left-0 right-0 bottom-0 z-20 pb-safe"
      style={{ paddingLeft: 'var(--space-screen-h)', paddingRight: 'var(--space-screen-h)' }}
    >
      <div className="mx-auto w-full max-w-2xl">
        <div
          className="ui-pill"
          style={{
            background: 'var(--color-bg-nav)',
            padding: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {items.map((item) => {
            const active = item.id === activeId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className="ui-pill"
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: 40,
                  padding: active ? '10px 16px' : '10px',
                  background: active ? item.colorVar : item.colorVar,
                  color: 'var(--text-on-accent)',
                  flex: active ? 1 : undefined,
                  width: active ? undefined : 'var(--size-nav-icon)',
                }}
              >
                <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </span>
                {active && (
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>{item.label}</span>
                )}
                <span className="sr-only">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

