import type { Metadata } from 'next'
import { LandingTemplate, type LandingConfig } from '@/components/landing/landing-template'

export const metadata: Metadata = {
  title: 'Boxing Gym Pretoria East | Free Trial | TENROUNDS',
  description:
    'Looking for a boxing gym in Pretoria East? Train on boxing bags with coach-led technique and 30-minute HIIT at TENROUNDS in Garsfontein. Beginners welcome. Book your free trial.',
  alternates: { canonical: '/boxing-gym-pretoria-east' },
  openGraph: {
    title: 'Boxing Gym Pretoria East | Free Trial | TENROUNDS',
    description:
      'Boxing-bag training, coach-led technique and 30-minute HIIT in Garsfontein, Pretoria East. Beginners welcome. Book your free trial at TENROUNDS.',
    images: [{ url: '/round-boxing-bag.webp', width: 1200, height: 630, alt: 'Boxing gym Pretoria East — TENROUNDS Garsfontein' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Gym Pretoria East | Free Trial | TENROUNDS',
    description: 'Boxing-bag training and coach-led 30-minute HIIT in Garsfontein, Pretoria East. Beginners welcome. Book your free trial.',
    images: ['/round-boxing-bag.webp'],
  },
  keywords: ['boxing gym Pretoria East', 'boxing gym Garsfontein', 'boxing bag Pretoria', 'boxing fitness Pretoria East', 'HIIT boxing Garsfontein'],
}

const config: LandingConfig = {
  slug: 'boxing-gym-pretoria-east',
  breadcrumb: 'Boxing Gym Pretoria East',
  heroEyebrow: 'Boxing Gym Pretoria East',
  heroTitle: 'The Boxing Gym For',
  heroHighlight: 'Pretoria East',
  heroSubtitle:
    'Get the energy of boxing without a fight-gym commitment. TENROUNDS combines four dedicated bag stations, coach-guided technique and full-body HIIT in a 30-minute workout. Beginners are welcome, sessions are scaled to your level, and there are no fixed class times.',
  heroImage: '/round-boxing-bag.webp',
  heroImageAlt: 'Boxing-bag stations at the TENROUNDS boxing gym in Pretoria East',
  intro:
    'If you want to hit the bags, improve your conditioning and learn the basics of striking without sparring, TENROUNDS gives you a coached place to start. Every visit combines boxing-style bag work with functional strength and cardio across a structured 30-minute circuit.',
  blocks: [
    {
      type: 'features',
      eyebrow: 'What You Get',
      title: 'A Real Boxing Workout',
      description:
        'Everything you need to train like a boxer without the intimidation of a traditional fight gym.',
      items: [
        { icon: 'zap', title: 'Four Bag Stations', desc: 'Dedicated boxing bags so you get genuine striking work every session.' },
        { icon: 'users', title: 'Coach-Led Technique', desc: 'Learn proper punches, combinations and footwork from qualified coaches.' },
        { icon: 'heart', title: 'Heart-Rate Tracking', desc: 'See your effort live and train in the zones that build conditioning fastest.' },
        { icon: 'dumbbell', title: 'Strength + Boxing', desc: 'Bag rounds combined with functional strength for a complete body.' },
        { icon: 'timer', title: '30-Minute Rounds', desc: 'A full boxing-style conditioning session in half an hour.' },
        { icon: 'target', title: 'All Levels', desc: 'From total beginners to seasoned athletes, every round is scaled to you.' },
      ],
    },
    {
      type: 'compare',
      eyebrow: 'The Difference',
      title: 'Why Not A Traditional Fight Gym',
      failTitle: 'Old-School Boxing Gyms',
      winTitle: 'TENROUNDS Boxing',
      fail: [
        'Intimidating atmosphere that puts beginners off',
        'Sparring and contact when you just want fitness',
        'Little structure unless you pay for private coaching',
        'Fixed training times that clash with work and family',
      ],
      win: [
        'A welcoming floor where everyone trains together',
        'Bag-based conditioning with zero contact required',
        'Coaches guiding your technique in every session',
        'No class times — train whenever it suits you',
      ],
    },
    {
      type: 'split',
      eyebrow: 'Why It Works',
      title: 'Power, Conditioning, Confidence',
      body: [
        'Hitting the bag is a full-body effort — legs, core, shoulders and back all fire with every punch. Add our HIIT and strength stations and you build real athletic conditioning, not just gym fitness.',
        'And there is the mental side: few workouts beat boxing for stress relief and confidence. Members across Pretoria East tell us the bag is the best part of their day.',
      ],
      image: '/boxing-gloves-perk.png',
      imageAlt: 'Free TENROUNDS boxing gloves with membership in Pretoria East',
      bullets: [
        'Free TENROUNDS gloves on 6 and 12-month plans',
        'Full-body conditioning with every round',
        'Stress relief that keeps members coming back',
      ],
      dark: true,
    },
  ],
  faqs: [
    {
      question: 'Is this a real boxing gym or fitness boxing?',
      answer:
        'TENROUNDS is a fitness-focused boxing gym. You get genuine bag work and coach-led technique combined with HIIT and strength training, but without sparring or contact — so you build boxing skills and serious fitness safely.',
    },
    {
      question: 'Do I need boxing experience?',
      answer:
        'No. Our coaches teach you proper punching technique and footwork from your first session and scale the intensity to your level, so beginners are completely at home.',
    },
    {
      question: 'Are gloves provided?',
      answer:
        'You can bring your own, and all 6-month and 12-month memberships include a free pair of TENROUNDS boxing gloves to keep.',
    },
    {
      question: 'How many boxing stations do you have?',
      answer:
        'We have four dedicated boxing-bag stations as part of our circuit, so bag work is a real part of every session rather than an occasional extra.',
    },
    {
      question: 'Where is the gym located?',
      answer:
        'TENROUNDS is at 649 Borzoi Street, Garsfontein, Pretoria East — easy to reach from Moreleta Park, Faerie Glen, Woodhill, Olympus and Boardwalk.',
    },
  ],
  showMap: true,
  ctaHeadline: 'Step Into The Ring In Pretoria East',
  ctaSub:
    'Try real bag work and coach-led conditioning in one 30-minute session. Your first round in Garsfontein is on us.',
}

export default function Page() {
  return <LandingTemplate config={config} />
}
