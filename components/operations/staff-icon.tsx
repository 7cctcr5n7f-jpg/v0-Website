// Renders a trainer's icon shown before their name on the roster.
// The '♀' glyph is rendered as a bright-pink female sign (not a woman emoji).
export function StaffIcon({ icon, className = '' }: { icon?: string | null; className?: string }) {
  if (!icon) return null
  const isFemaleSign = icon === '♀'
  return (
    <span aria-hidden className={`${isFemaleSign ? 'font-black text-[#ff2da8]' : ''} ${className}`}>
      {icon}
    </span>
  )
}

// Small palette offered in Settings for picking a trainer icon.
export const STAFF_ICON_CHOICES = ['🥊', '♀', '💪', '👑', '😄', '🔥', '⚡', '🏆', '🦾', '🐺', '🎯', '💥']
