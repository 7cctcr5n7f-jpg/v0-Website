import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/legal-page'
import { business, fullAddress } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'TENROUNDS website and studio terms covering free trials, memberships, session packs, payments, cancellations, safety and South African consumer rights.',
  alternates: { canonical: '/terms-and-conditions' },
  openGraph: {
    title: 'Terms and Conditions | TENROUNDS',
    description: 'Website use, bookings, membership and payment terms at TENROUNDS.',
    url: '/terms-and-conditions',
  },
}

const linkStyle = 'break-words text-neon-blue underline underline-offset-4 hover:text-foreground'

const sections: LegalSection[] = [
  {
    id: 'about-these-terms',
    title: 'About TENROUNDS and these terms',
    content: (
      <>
        <p>
          These terms explain the use of the TENROUNDS website and general arrangements for
          enquiries, trials, memberships and session purchases at our fitness studio.
          Read the specific agreement, offer and payment details presented for your chosen service
          before signing or paying.
        </p>
        <address className="space-y-2 not-italic">
          <p><strong className="text-foreground">Studio:</strong> {fullAddress}, {business.address.countryName}</p>
          <p><strong className="text-foreground">Email:</strong>{' '}<a href={`mailto:${business.email}`} className={linkStyle}>{business.email}</a></p>
          <p><strong className="text-foreground">Telephone:</strong>{' '}<a href={`tel:${business.phoneE164}`} className={linkStyle}>{business.phoneDisplay}</a></p>
        </address>
        <p>
          Your selected plan, signed membership or purchase agreement and any specific written
          arrangements govern the relevant service. These website terms do not retrospectively
          replace a signed agreement or introduce a new fee. Mandatory South African law takes
          precedence over inconsistent wording in these terms, forms or agreements.
        </p>
      </>
    ),
  },
  {
    id: 'using-the-website',
    title: 'Using the website and supplying information',
    content: (
      <>
        <p>
          Provide accurate details and only submit information, signatures or payment instructions
          that you are entitled to provide. Correct errors before submitting and contact us if you
          notice a mistake afterwards. Do not impersonate another person, submit fraudulent
          bookings, misuse forms, interfere with the service or bypass access controls.
        </p>
        <p>
          Ordinary browsing, search-engine indexing and authorised API use must respect applicable
          law and published access restrictions. Access to an API does not grant permission to
          retrieve private records, alter the website or exceed the access scopes supplied.
        </p>
        <p>
          If you are under 18, arrange your participation and any membership application with a
          parent, guardian or other legally competent person. Do not sign on behalf of another
          person or authorise deductions from their account without appropriate authority.
        </p>
      </>
    ),
  },
  {
    id: 'trials-and-enquiries',
    title: 'Free trials, enquiries and appointments',
    content: (
      <>
        <p>
          Our advertised free trial is a coach-supported introductory workout and assessment,
          without an obligation to buy a membership. Submitting the trial form does not create a
          paid membership or authorise a debit order. Select an available appointment and provide
          contact details so that we can confirm arrangements or communicate changes.
        </p>
        <p>
          If you cannot attend or need to reschedule, contact our team. Availability is subject to
          studio operating hours, staffing and the appointment options offered. Safety and relevant
          participation acknowledgements apply to trial sessions as well as paid visits, subject
          to the consumer protections below.
        </p>
        <p>
          A contact or corporate-wellness enquiry is a request for information, not a confirmed
          group booking or payment authority. Any corporate proposal or special arrangement must
          be agreed separately.
        </p>
      </>
    ),
  },
  {
    id: 'memberships-and-access',
    title: 'Membership plans and studio access',
    content: (
      <>
        <p>
          Review your access category, session allowance, contract length, payment method and total
          commitment before signing. An Anytime plan means access during studio operating hours,
          not 24-hour access. Off-Peak plans apply during the published off-peak times while the
          studio is open. Pair-Up prices are per member where indicated.
        </p>
        <p>
          The selected membership details and signed agreement govern your entitlement. Requests
          to change a plan, freeze a membership or transfer access should be discussed with our
          team and confirmed in writing, including any effect on price, access or contract dates.
          This page does not create a new automatic freeze or transfer entitlement.
        </p>
        <p>
          You can{' '}
          <a href="/api/membership-agreement" target="_blank" rel="noopener noreferrer" className={linkStyle}>
            read the full standard membership agreement (PDF)<span className="sr-only"> (opens in a new tab)</span>
          </a>
          {' '}before applying. Keep the copy supplied with your own membership details and contact
          us if you need an explanation before accepting it.
        </p>
      </>
    ),
  },
  {
    id: 'prices-and-payments',
    title: 'Prices, offers and membership payments',
    content: (
      <>
        <p>
          Website prices are in South African rand. Check the applicable plan or pack, contract
          duration, discounts, bonus sessions and payment summary before proceeding. Promotional
          eligibility and included items depend on the offer presented; a promotion does not
          automatically apply to earlier purchases or every plan.
        </p>
        <p>
          The agreed membership fee and payment schedule are recorded in your agreement.
          Under the standard agreement, cash memberships are paid in full in advance for the
          selected term rather than in monthly cash instalments. Debit-order memberships require
          the relevant account details and a separate debit authority and mandate; the mandate
          identifies Netcash as the collection provider.
        </p>
        <p>
          Cancelling a debit authority is not by itself cancellation of the underlying membership.
          Any outstanding amount or failed-payment administration charge must be lawfully due;
          this page does not set a new administration fee or make every future instalment
          automatically payable on cancellation.
        </p>
        <p>
          Prices and offers may change for future transactions, subject to applicable consumer
          law. An update to a price page does not by itself change the price already agreed for
          your contract. Contact us before paying if a displayed amount or offer is unclear.
        </p>
      </>
    ),
  },
  {
    id: 'session-purchases',
    title: 'Session packs and online checkout',
    content: (
      <>
        <p>
          A session pack supplies the number of sessions and any bonus sessions shown for that
          purchase. Buying a pack does not by itself create a recurring monthly membership or
          debit order. Any applicable usage restrictions or validity conditions must be disclosed
          for the purchase and remain subject to consumer law.
        </p>
        <p>
          Online session-pack payments are completed through PayFast. Starting checkout or
          returning to a success page is not, on its own, proof that payment cleared. Payment
          confirmation depends on verification of the transaction. A pending or cancelled
          checkout must not be treated as a paid session credit.
        </p>
        <p>
          Review your details before signing and paying, retain your agreement and payment
          reference, and contact us if a payment appears to have succeeded but your purchase
          remains pending. Do not send card security codes or passwords in an enquiry.
        </p>
      </>
    ),
  },
  {
    id: 'cancellations-and-refunds',
    title: 'Cancellations, cooling-off rights and refunds',
    content: (
      <>
        <p>
          Send membership cancellation requests in writing to{' '}
          <a href={`mailto:${business.email}?subject=Membership%20cancellation`} className={linkStyle}>{business.email}</a>,
          identifying the relevant membership and requested cancellation date. Ask for
          acknowledgement and a breakdown of any amount claimed. Your agreement contains
          cancellation provisions, but any notice period or charge is subject to applicable law.
        </p>
        <p>
          Where section 14 of the Consumer Protection Act applies to a fixed-term agreement, the
          consumer may cancel during the term on 20 business days of written or other recorded
          notice, subject to amounts lawfully owed up to cancellation and a reasonable cancellation
          charge where permitted. A percentage stated in an agreement is not automatically
          enforceable without regard to the applicable legal requirements.
        </p>
        <p>
          Any applicable cooling-off, refund, prepaid-credit and service-quality rights under the
          Consumer Protection Act or Electronic Communications and Transactions Act remain
          available. Conditions and exceptions depend on the transaction and circumstances.
          There is no blanket exclusion of legally required refunds under these website terms.
        </p>
        <p>
          Contact us promptly about an unused pack, disputed payment or refund request, with the
          purchase reference and relevant details. Simply stopping attendance does not itself
          notify us of cancellation. This page does not introduce a new expiry date for prepaid
          sessions or require a new fixed-term renewal without the agreement and notices required
          by law.
        </p>
      </>
    ),
  },
  {
    id: 'safety-and-conduct',
    title: 'Health, safety and studio conduct',
    content: (
      <>
        <p>
          Exercise involves physical effort and inherent risks. Follow reasonable studio rules,
          equipment instructions and staff guidance. Tell our team about matters relevant to safe
          participation and seek advice from a qualified healthcare professional if you are
          unsure whether an activity is suitable for you.
        </p>
        <p>
          Stop and alert staff if you feel unwell or notice a safety concern. Report injuries or
          faulty equipment promptly and treat staff and other members respectfully.
          Coaching, workout information and heart-rate feedback are fitness support, not a
          medical diagnosis or a guarantee of any particular result.
        </p>
        <p>
          Keep personal belongings appropriately secured. We may take reasonable steps to address
          unsafe or disruptive behaviour, including restricting an unsafe activity. Any suspension
          or termination of a membership remains subject to the agreement and applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'liability-and-consumer-rights',
    title: 'Risk acknowledgements and consumer protection',
    content: (
      <>
        <p>
          Read any risk acknowledgement or liability wording before accepting it and ask our team
          if it is unclear. Participation risks do not remove the obligations of TENROUNDS under
          applicable law or your right to services and facilities meeting legally required
          standards.
        </p>
        <p>
          Nothing on this page excludes liability where exclusion is unlawful, including liability
          for gross negligence, or requires you to give up a non-excludable consumer right.
          Any limitation or indemnity in a form or agreement must be interpreted subject to
          those protections. No statement about lost belongings or third-party services overrides
          a responsibility that the law places on TENROUNDS.
        </p>
      </>
    ),
  },
  {
    id: 'privacy-and-messages',
    title: 'Personal information and communications',
    content: (
      <p>
        Our{' '}<Link href="/privacy-policy" className={linkStyle}>Privacy Policy</Link>
        {' '}explains how we handle enquiries, bookings, identity and payment information, agreements
        and analytics. Contact details may be used for relevant service messages and administration.
        Agreement to service terms is not blanket permission for promotional marketing or analytics
        cookies; those choices and applicable legal requirements are separate.
      </p>
    ),
  },
  {
    id: 'content-and-third-parties',
    title: 'Website content and third-party services',
    content: (
      <>
        <p>
          TENROUNDS and relevant rights holders retain applicable rights in website branding,
          images, text and other content. You may browse the site and share public page links.
          Other copying, commercial reuse or distribution requires permission unless permitted
          by law. Submit only material that you are entitled to share with us.
        </p>
        <p>
          Maps, social media, payment pages and linked fitness apps may be operated by independent
          providers. Review their relevant terms and privacy notices when using them. Linking to a
          service does not guarantee its availability or change any responsibility we have to you
          under applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'availability-and-changes',
    title: 'Availability and service interruptions',
    content: (
      <>
        <p>
          Studio hours, appointment availability and website services can be affected by
          maintenance, safety issues, power interruptions or events beyond reasonable control.
          Contact the studio if you need confirmation before travelling. Website access is not a
          promise that every service or session is available at every time.
        </p>
        <p>
          Material changes affecting an existing service must be handled under the relevant
          agreement and consumer law, including any applicable notice, remedy or refund
          requirement. These website terms do not automatically waive rights arising from a
          closure or authorise charging for services contrary to law.
        </p>
      </>
    ),
  },
  {
    id: 'questions-and-disputes',
    title: 'Questions, complaints and governing law',
    content: (
      <>
        <p>
          Contact{' '}<a href={`mailto:${business.email}`} className={linkStyle}>{business.email}</a>
          {' '}with questions or complaints, including the booking or purchase reference where
          available. Please explain the issue and the outcome you are requesting so that our team
          can investigate.
        </p>
        <p>
          South African law governs these terms. You retain access to an appropriate court,
          consumer authority or dispute-resolution body under applicable law. Information about
          consumer rights and complaint procedures is available from the{' '}
          <a href="https://thencc.org.za/" target="_blank" rel="noopener noreferrer" className={linkStyle}>National Consumer Commission</a>.
          Nothing here requires private arbitration or removes a statutory complaint route.
        </p>
      </>
    ),
  },
  {
    id: 'updates-to-these-terms',
    title: 'Updates to these terms',
    content: (
      <p>
        The last-updated date identifies this version. We may update website terms for future
        use, but publication alone does not retrospectively alter an existing contract, add a
        charge, waive a statutory right or replace any notice or consent required by law.
        Keep the version of the agreement and purchase confirmation supplied for your transaction.
      </p>
    ),
  },
]

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      description="Website use, bookings, membership and payment arrangements, and the consumer rights that remain yours."
      eyebrow="Website & Studio"
      path="/terms-and-conditions"
      updatedAt="2026-11-23"
      intro={
        <>
          <p>Please read these terms alongside the specific agreement and offer for your selected service before signing or paying.</p>
          <p className="rounded-xl border border-steel bg-card p-4 text-sm">
            <strong className="text-foreground">Your consumer rights come first.</strong>{' '}
            These website terms do not replace a signed agreement or limit rights that South African law does not allow to be excluded.
          </p>
        </>
      }
      sections={sections}
    />
  )
}
