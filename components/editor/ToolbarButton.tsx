'use client'

import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode
  label: string
}

export default function ToolbarButton({ icon, label, className, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`text-xs px-2 py-1 rounded-full hover:bg-accent transition-colors inline-flex items-center gap-1 ${className ?? ''}`}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}


