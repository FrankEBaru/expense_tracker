import React from 'react'

type IconProps = {
  size?: number
  strokeWidth?: number
  className?: string
}

function baseProps({ size = 16, strokeWidth = 1.8, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    className,
    xmlns: 'http://www.w3.org/2000/svg',
    children: null as React.ReactNode,
    strokeWidth,
  }
}

export function IconPlus(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth={p.strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconLogout(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path
        d="M6.2 3.3H4.7A1.7 1.7 0 0 0 3 5v6a1.7 1.7 0 0 0 1.7 1.7h1.5"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 11.2 12.6 8 9.4 4.8"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.4 8H6.2" stroke="currentColor" strokeWidth={p.strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconSun(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path
        d="M8 10.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
      />
      <path d="M8 2.2v1.2M8 12.6v1.2M2.2 8h1.2M12.6 8h1.2" stroke="currentColor" strokeWidth={p.strokeWidth} strokeLinecap="round" />
      <path d="M3.6 3.6l.9.9M11.5 11.5l.9.9M12.4 3.6l-.9.9M4.5 11.5l-.9.9" stroke="currentColor" strokeWidth={p.strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconMoon(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path
        d="M13 9.5A5.1 5.1 0 0 1 6.5 3 4.6 4.6 0 1 0 13 9.5Z"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconChevronLeft(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path d="M9.8 3.2 5.2 8l4.6 4.8" stroke="currentColor" strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevronRight(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path d="M6.2 3.2 10.8 8 6.2 12.8" stroke="currentColor" strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBank(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path
        d="M2.8 6.4h10.4M4 6.4V12.6h8V6.4M6.2 12.6V9.6M9.8 12.6V9.6M5.4 5.2h5.2a1.1 1.1 0 0 0 0-2.2H5.4a1.1 1.1 0 0 0 0 2.2Z"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconWallet(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path
        d="M3.2 6.2c0-1.1.9-2 2-2h5.6c1.1 0 2 .9 2 2v6.6c0 1.1-.9 2-2 2H5.2c-1.1 0-2-.9-2-2V6.2Z"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 7.6h9.6v2.4H9.6a1.2 1.2 0 0 1-1.2-1.2V7.6"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconTag(props: IconProps) {
  const p = baseProps(props)
  return (
    <svg {...p}>
      <path
        d="M5.8 3.4h3.6l4.6 4.6-3.6 3.6a1.1 1.1 0 0 1-1.55 0L4.25 9.05A1.1 1.1 0 0 1 3.9 8.1V5.5c0-.94.76-1.7 1.7-1.7h.2Z"
        stroke="currentColor"
        strokeWidth={p.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.05 6.05h.01" stroke="currentColor" strokeWidth={p.strokeWidth * 1.35} strokeLinecap="round" />
    </svg>
  )
}

