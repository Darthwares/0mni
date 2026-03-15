"use client"

import React from 'react'

interface StarBorderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType
  className?: string
  children?: React.ReactNode
  color?: string
  speed?: string
  thickness?: number
}

const StarBorder: React.FC<StarBorderProps> = ({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}) => {
  const Component = as || 'button'

  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-xl ${className}`}
      {...rest}
    >
      <div
        className="absolute inset-0 w-[300%] h-[300%] -top-full -left-full animate-[star-rotate_var(--star-speed)_linear_infinite] opacity-70"
        style={{
          '--star-speed': speed,
          background: `conic-gradient(from 0deg, transparent 0deg, ${color} 80deg, transparent 160deg)`,
        } as React.CSSProperties}
      />
      <div
        className="relative z-10 bg-card rounded-[calc(0.75rem-var(--star-thickness))] m-[var(--star-thickness)]"
        style={{ '--star-thickness': `${thickness}px` } as React.CSSProperties}
      >
        {children}
      </div>
    </Component>
  )
}

export default StarBorder
