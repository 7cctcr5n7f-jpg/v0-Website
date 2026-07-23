// Route group layout — strips global Navbar, SiteFooter, WhatsAppFloat
// for internal staff pages (/operations, /admin)
export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
