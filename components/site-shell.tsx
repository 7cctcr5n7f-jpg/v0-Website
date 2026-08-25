'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './navbar'
import { SiteFooter } from './site-footer'
import { WhatsAppFloat } from './whatsapp-float'

const INTERNAL_PREFIXES = ['/operations', '/admin']

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isInternal = INTERNAL_PREFIXES.some((p) => pathname?.startsWith(p))

  if (isInternal) return <>{children}</>

  return (
    <>
      <Navbar />
      {children}
      <SiteFooter />
      <WhatsAppFloat />
    </>
  )
}
