import type { ReactNode } from 'react'
import { JsonLd } from '@/components/json-ld'
import { PageHero } from '@/components/page-hero'
import { business } from '@/lib/business'
import { breadcrumbSchema } from '@/lib/seo'

export type LegalSection = { id: string; title: string; content: ReactNode }

export function LegalPage({
  title,
  description,
  eyebrow,
  path,
  updatedAt,
  intro,
  sections,
}: {
  title: string
  description: string
  eyebrow: string
  path: string
  updatedAt: string
  intro: ReactNode
  sections: LegalSection[]
}) {
  const updatedLabel = new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(updatedAt))

  return (
    <main>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: title, path }])} />
      <PageHero compact eyebrow={eyebrow} title={title} description={description} />
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <p className="text-sm text-light-grey">
          Last updated: <time dateTime={updatedAt}>{updatedLabel}</time>
        </p>
        <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-light-grey">{intro}</div>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={`${title} sections`} className="rounded-xl border border-steel bg-card p-5 lg:sticky lg:top-28">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">In this document</h2>
            <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-light-grey transition-colors hover:text-neon-blue">
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article aria-label={`${business.name} ${title}`} className="min-w-0 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-28">
                <h2 id={`${section.id}-heading`} className="font-display text-xl font-bold uppercase tracking-tight text-foreground sm:text-2xl">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-light-grey sm:text-base">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  )
}
