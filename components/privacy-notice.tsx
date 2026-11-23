import Link from 'next/link'
import { cn } from '@/lib/utils'

export function PrivacyNotice({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs leading-relaxed text-light-grey', className)}>
      Read our{' '}
      <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-neon-blue underline underline-offset-4 hover:text-foreground">
        Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
      </Link>
      {' '}for how we use your information and how to make a privacy request.
      Analytics cookie choices are separate.
    </p>
  )
}
