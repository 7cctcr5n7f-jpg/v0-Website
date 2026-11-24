import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/legal-page'
import { business, fullAddress } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How TENROUNDS handles personal information, bookings, membership and payment records, cookies and analytics, and your privacy rights under POPIA.',
  alternates: { canonical: '/privacy-policy' },
  openGraph: {
    title: 'Privacy Policy | TENROUNDS',
    description: 'Personal information, website analytics and your privacy choices at TENROUNDS.',
    url: '/privacy-policy',
  },
}

const linkStyle = 'break-words text-neon-blue underline underline-offset-4 hover:text-foreground'

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are and how to contact us',
    content: (
      <>
        <p>
          TENROUNDS operates this website and the fitness studio in Garsfontein, Pretoria East.
          TENROUNDS is the responsible party for personal information used for the purposes described
          in this policy. Our approach is informed by the Protection of Personal Information Act,
          4 of 2013 (POPIA).
        </p>
        <address className="space-y-2 not-italic">
          <p><strong className="text-foreground">Studio:</strong> {fullAddress}, {business.address.countryName}</p>
          <p><strong className="text-foreground">Email:</strong>{' '}<a href={`mailto:${business.email}`} className={linkStyle}>{business.email}</a></p>
          <p><strong className="text-foreground">Telephone:</strong>{' '}<a href={`tel:${business.phoneE164}`} className={linkStyle}>{business.phoneDisplay}</a></p>
        </address>
        <p>
          Please address privacy enquiries to the TENROUNDS team, attention: Privacy / Information
          Officer. Use the subject &quot;Privacy request&quot; so that we can route your enquiry.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect and its sources',
    content: (
      <>
        <p>We collect information directly from you when you contact us or use our forms, including:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Enquiries: your name, email address, telephone number and message; corporate enquiries may also include your company and team size.</li>
          <li>Trial bookings: your name, contact details, preferred appointment date and time, and agreement acknowledgements.</li>
          <li>Memberships and session packs: your name, contact details, identity number, emergency contact details, selected plan or pack, fees, agreements and digital signature.</li>
          <li>Debit-order memberships: payer and account-holder details, bank and account information, debit date and payment authority. These details are separate from card checkout.</li>
          <li>Service records: booking and membership status, relevant staff notes, purchase and payment references, receipts, and correspondence with our team.</li>
        </ul>
        <p>
          A member or authorised payer may provide information about another account holder or an
          emergency contact. If you give us information about someone else, please make sure you
          are authorised to do so and make this policy available to them.
        </p>
        <p>
          Hosting and analytics services may also process technical information such as IP addresses,
          browser and device information, page requests, approximate location and security logs.
          The cookies and analytics section explains the website measurements in more detail.
        </p>
      </>
    ),
  },
  {
    id: 'purposes-and-grounds',
    title: 'Why we use information',
    content: (
      <>
        <p>We use information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Answer enquiries and arrange, confirm and administer trials, memberships and session purchases.</li>
          <li>Manage payments, debit authorities, agreements, receipts and related financial records.</li>
          <li>Provide service communications and reminders, maintain relevant operational records, and support safe participation.</li>
          <li>Protect the website against spam, fraud and misuse, resolve disputes and meet applicable legal obligations.</li>
          <li>Understand website use and improve pages and booking steps, subject to the analytics choices described below.</li>
        </ul>
        <p>
          Depending on the purpose and the information involved, processing may be based on your
          consent, steps you request before a contract, performance of a contract, a legal obligation,
          or legitimate interests where permitted by POPIA and balanced against your rights.
          Additional requirements apply to health information and information about children.
          Visiting the website is not blanket consent to every use of your information.
        </p>
      </>
    ),
  },
  {
    id: 'required-information',
    title: 'Required information and your choices',
    content: (
      <>
        <p>
          You can browse without completing a booking or membership form. Fields marked as required
          are needed for the particular online service as it is offered; this does not mean that
          every field is required by law. Without the necessary details or agreements, we may be
          unable to complete a booking, application, payment or enquiry.
        </p>
        <p>
          Contact us if you need an alternative way to supply necessary information. Please do not
          put full banking details, identity documents or detailed medical information in a general
          enquiry message. Ask our team how to provide sensitive information appropriately.
          Membership acknowledgements and payment mandates are separate from optional analytics
          cookie choices and marketing permissions.
        </p>
      </>
    ),
  },
  {
    id: 'health-and-children',
    title: 'Health information and children',
    content: (
      <>
        <p>
          Health declarations and relevant information you disclose to our team may be needed for
          safe participation. Health information receives additional protection under POPIA and
          must only be processed where an applicable authorisation or exception permits it.
          Only share what is relevant to the service or safety concern.
        </p>
        <p>
          If you choose a connected training service such as Uptivo, that service may handle a
          training profile, workout or heart-rate information. Its own privacy terms also apply.
          The website booking forms do not themselves collect a live heart-rate feed.
        </p>
        <p>
          A parent, guardian or other legally competent person should contact us before submitting
          information for someone under 18. Processing information about children requires the
          appropriate authority under POPIA. The website does not automatically verify guardianship.
        </p>
      </>
    ),
  },
  {
    id: 'cookies-and-analytics',
    title: 'Cookies, local storage and analytics',
    content: (
      <>
        <p>
          Cookies and similar browser storage can support website functionality, security and
          authorised administration. We also save your chosen Google Analytics preference in
          local storage so that it can be remembered in that browser.
        </p>
        <p>
          <strong className="text-foreground">Google Analytics:</strong> on approved public pages,
          a new visitor with no saved choice uses restricted, cookieless measurement with analytics
          storage denied. This can still send page and event measurements, and normal network and
          device information, to Google. Cookieless does not mean anonymous or that no information
          leaves your device.
        </p>
        <p>
          Open <strong className="text-foreground">Analytics preferences</strong> at the bottom of
          the page to turn Google Analytics off or explicitly allow analytics cookies. There is no
          automatic acceptance pop-up. Saved refusals, Do Not Track and Global Privacy Control
          signals block our Google Analytics integration; unavailable preference storage also
          leaves it off. Clearing browser storage can reset a saved choice.
        </p>
        <p>
          Our Google integration uses approved page paths and fixed booking/signup events, not form
          answers, identity numbers, signatures or banking details. It excludes query strings,
          hashes and referrer URLs, and does not measure our admin, operations, member or payment
          receipt pages. Advertising storage and personalisation are configured as denied.
        </p>
        <p>
          <strong className="text-foreground">Vercel Web Analytics:</strong> the production site
          separately uses Vercel to understand traffic. Vercel describes this as aggregated
          measurement without analytics cookies; data points can include page URLs, filtered query
          parameters, referrers, browser/device information and approximate location. The Google
          Analytics preference control does not switch off Vercel Web Analytics.
        </p>
        <p>
          Read the{' '}<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={linkStyle}>Google Privacy Policy</a>
          {' '}and{' '}<a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer" className={linkStyle}>Vercel Web Analytics privacy information</a>
          {' '}for provider details. Browser settings and blocking tools may offer additional controls.
          Analytics cookies are not required to book a trial or apply for membership.
        </p>
      </>
    ),
  },
  {
    id: 'sharing-and-providers',
    title: 'Who receives information',
    content: (
      <>
        <p>
          Information is available to authorised TENROUNDS staff and relevant service providers
          where needed for the purposes above. Depending on the service you use, these include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Website hosting, database and file-storage providers, including Vercel services where configured.</li>
          <li>FormSubmit for contact and corporate enquiries, and email delivery services such as Resend for confirmations and agreements.</li>
          <li>WhatsApp / Meta services for messages, booking reminders or notifications to authorised team recipients, where enabled.</li>
          <li>PayFast for session-pack checkout, and Netcash and relevant banking/payment providers for membership debit orders.</li>
          <li>Professional advisers, authorities or other recipients where disclosure is legally required or necessary to protect lawful rights.</li>
        </ul>
        <p>
          PayFast handles card entry during its checkout; our website forms do not collect your card
          number or card security code. Separately, debit-order bank details are saved with the
          membership record and agreement. Agreement PDFs emailed to you and TENROUNDS may contain
          identity, mandate and signature details.
        </p>
        <p>
          Authorised analysis tools or AI agents may use public website content and aggregate
          booking/signup counts. The website reporting API does not provide individual customer
          records, identity numbers or banking details.
        </p>
        <p>
          We do not sell personal information through this website. Links, embedded maps, social
          media and connected fitness apps may involve independent providers with their own
          privacy policies. Embedded content can send information to its provider when it loads,
          not only when you interact with it.
        </p>
      </>
    ),
  },
  {
    id: 'communications',
    title: 'Service messages and marketing',
    content: (
      <>
        <p>
          We use the contact details supplied for booking confirmations, reminders, membership
          administration, payment-related messages and replies to enquiries. These service
          communications are different from promotional marketing.
        </p>
        <p>
          Electronic direct marketing must have a lawful basis under POPIA, such as consent or an
          applicable existing-customer exception, with an opportunity to object. You can ask us to
          stop promotional messages using any provided unsubscribe method or by contacting{' '}
          <a href={`mailto:${business.email}`} className={linkStyle}>{business.email}</a>.
          An objection to marketing does not necessarily stop messages needed to administer an
          existing booking, contract or legal obligation.
        </p>
        <p>
          Public use of identifiable member photographs, testimonials or achievements is separate
          from necessary membership administration and requires an appropriate lawful basis.
          Contact us about permissions or concerns involving your image or testimonial.
        </p>
      </>
    ),
  },
  {
    id: 'international-processing',
    title: 'Processing outside South Africa',
    content: (
      <p>
        Internet, hosting, email, messaging, payment and analytics providers may process information
        outside South Africa. International transfers must meet an applicable POPIA requirement,
        such as adequate protection through law or binding agreements, necessary contract
        performance, or valid consent where applicable. Contact us for information about the
        providers and safeguards relevant to your records.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long information is kept',
    content: (
      <>
        <p>
          Retention depends on the purpose, the service relationship and applicable requirements.
          Booking and enquiry records may be needed for follow-up and service administration;
          membership agreements, mandates and transaction records may need to be kept for
          contractual, accounting, tax, dispute or other legal purposes. A deletion request may
          therefore not result in immediate removal of every record.
        </p>
        <p>
          Information should not be retained longer than a lawful purpose requires and is to be
          deleted or de-identified when lawful retention ends. Submitting a form does not create
          an automatic deletion date. Copies may also exist in email systems, agreements and
          backups until their relevant retention or replacement cycle ends.
          Contact us for the retention period applicable to a particular record or to make a request.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Protecting information',
    content: (
      <p>
        We use access-restricted administration tools and hosting, communications and payment
        services to support reasonable technical and organisational safeguards. Access to
        business records is intended for authorised people with a relevant purpose. No website,
        email or storage system can be guaranteed completely secure. Please contact us if you
        suspect misuse of your information. If a security compromise requires notification
        under POPIA, we will notify affected people and the Information Regulator as required.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your privacy rights and requests',
    content: (
      <>
        <p>Subject to applicable law and any lawful exceptions, you may:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Ask whether we hold personal information about you and request access to it.</li>
          <li>Request correction of inaccurate information or deletion of information that should no longer be held.</li>
          <li>Object to processing where POPIA permits, including direct marketing.</li>
          <li>Withdraw consent where processing relies on consent, without affecting prior lawful processing.</li>
          <li>Complain to the Information Regulator about the handling of your personal information.</li>
        </ul>
        <p>
          Send requests to{' '}<a href={`mailto:${business.email}?subject=Privacy%20request`} className={linkStyle}>{business.email}</a>.
          Explain the request and how we can contact you. We may need proportionate identity or
          authority checks before releasing or changing records. Do not send complete bank details
          or identity documents in an initial request; ask us about an appropriate verification
          method. We will explain any applicable procedure, lawful limitation or permitted fee.
        </p>
        <p>
          Withdrawal of consent does not cancel a membership or remove an independent lawful
          obligation to retain records. Tell us if you want to discuss an alternative way of
          receiving a service.
        </p>
      </>
    ),
  },
  {
    id: 'complaints',
    title: 'Complaints and the Information Regulator',
    content: (
      <p>
        You may raise a concern with us using the contact details above, or complain directly to
        the Information Regulator (South Africa). You do not have to exhaust our internal process
        before contacting the Regulator. Current complaint procedures, forms and contact details
        are available on the{' '}
        <a href="https://inforegulator.org.za/" target="_blank" rel="noopener noreferrer" className={linkStyle}>Information Regulator website</a>.
      </p>
    ),
  },
  {
    id: 'policy-updates',
    title: 'Updates to this policy',
    content: (
      <p>
        We may update this policy as the website, services or applicable requirements change.
        The last-updated date identifies this version. Where a change requires additional notice or
        consent, publishing an updated policy alone does not replace that requirement.
        This policy is the Privacy Notice referred to by our website forms; it does not replace
        your membership agreement or the notices of independent service providers.
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How we handle personal information, the choices available to you, and how to contact us about your privacy."
      eyebrow="Your Information"
      path="/privacy-policy"
      updatedAt="2026-11-23"
      intro={<p>This policy covers the TENROUNDS website, enquiries, trial bookings, memberships and session-pack purchases. Please read it before supplying personal information.</p>}
      sections={sections}
    />
  )
}
