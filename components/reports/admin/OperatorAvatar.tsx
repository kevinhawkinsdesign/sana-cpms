import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface OperatorAvatarProps {
  operator?: {
    id?: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    // Defensive aliases used elsewhere in the codebase
    avatar?: string | null
    profilePicture?: string | null
    picture?: string | null
  } | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASS: Record<NonNullable<OperatorAvatarProps['size']>, string> = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-sm',
}

const PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
]

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const f = firstName?.charAt(0) || ''
  const l = lastName?.charAt(0) || ''
  return `${l}${f}`.toUpperCase() || 'OP'
}

const getColorClass = (seed: string) => PALETTE[seed.charCodeAt(0) % PALETTE.length]

export function OperatorAvatar({ operator, size = 'md', className = '' }: OperatorAvatarProps) {
  const initials = getInitials(operator?.firstName, operator?.lastName)
  const colorClass = getColorClass(initials || 'OP')
  const src = operator?.imageUrl || operator?.avatar || operator?.profilePicture || operator?.picture || undefined
  return (
    <Avatar className={`${SIZE_CLASS[size]} flex-shrink-0 ${className}`}>
      <AvatarImage src={src ?? undefined} alt={`${operator?.firstName ?? ''} ${operator?.lastName ?? ''}`.trim() || 'Operator'} />
      <AvatarFallback className={`font-semibold ${colorClass}`}>{initials}</AvatarFallback>
    </Avatar>
  )
}
