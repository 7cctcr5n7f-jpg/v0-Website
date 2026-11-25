import type { Metadata } from 'next'
import { LandingTemplate, type LandingConfig } from '@/components/landing/landing-template'

export const metadata: Metadata = {
  title: 'Boxing-Inspired Fitness Pretoria East',
  description:
    'Enjoy boxing-inspired fitness as part of a coach-supported 30-minute HIIT workout at TENROUNDS in Pretoria East. No boxing experience needed. Book your free trial.',
  alternates: { canonical: '/boxing-gym-pretoria-east' },
  openGraph: {
    title: 'Boxing-Inspired Fitness Pretoria East | TENROUNDS',
    description:
      'Boxing-inspired rounds are one part of our coach-supported 30-minute HIIT workouts. Build fitness with strength and cardio at TENROUNDS.',
    images: [{ url: '/round-boxing-bag.webp', width: 1200, height: 630, alt: 'Boxing-inspired fitness as part of a TENROUNDS HIIT workout in Pretoria East' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boxing Gym Pretoria East | Free Trial | TENROUNDS',
    description: 'Coach-supported 30-minute HIIT with boxing-inspired rounds, strength and cardio. No boxing experience needed.',
    images: ['/round-boxing-bag.webp'],
  },
  keywords: ['boxing-inspired fitness Pretoria East', 'boxing fitness Pretoria East', 'HIIT gym Pretoria East', '30 minute workout Pretoria East', 'fitness studio Garsfontein'],
}

const config: LandingConfig = {
  slug: 'boxing-gym-pretoria-east',
  breadcrumb: 'Boxing-Inspired Fitness Pretoria East',
  heroEyebrow: 'Boxing-Inspired Fitness Pretoria East',
  heroTitle: 'Fitness With A',
  heroHighlight: 'Boxing-Inspired Edge',
  heroSubtitle:
    'Boxing-inspired rounds bring energy and variety to our full-body HIIT workout. At TENROUNDS, they are combined with functional strength and cardio in a coach-supported 30-minute session. No boxing experience, sparring or fight training required.',
  heroImage: '/round-boxing-bag.webp',
  heroImageAlt: 'Boxing-bag stations used for boxing-inspired fitness at TENROUNDS',
  intro:
    'TENROUNDS is a boutique fitness studio, not a traditional boxing gym. Boxing-inspired bag work is one part of our structured 30-minute HIIT circuit, alongside strength, cardio and functional training. Your coach guides you through the workout and scales each round to your fitness level.',
  blocks: [
    {
      type: 'features',
      eyebrow: 'Part Of The Workout',
      title: 'A Full-Body HIIT Workout With Boxing-Inspired Rounds',
      description:
        'Enjoy the energy of bag work as part of a balanced workout that develops strength, cardio fitness and conditioning.',
      items: [
        { icon: 'zap', title: 'Boxing-Inspired Bag Work', desc: 'Use the dedicated bags for energetic, non-contact fitness rounds.' },
        { icon: 'users', title: 'Coach Support', desc: 'Your coach guides the workout, demonstrates movements and helps you train with good form.' },
        { icon: 'heart', title: 'Heart-Rate Tracking', desc: 'See your effort live and train in the zones that build conditioning fastest.' },
        { icon: 'dumbbell', title: 'Strength + Cardio', desc: 'Combine bag rounds with functional strength and cardio for a complete workout.' },
        { icon: 'timer', title: '30-Minute Sessions', desc: 'A complete, coach-supported workout in half an hour.' },
        { icon: 'target', title: 'All Levels', desc: 'Every round is adapted to your current ability and fitness goals.' },
      ],
    },
    {
      type: 'compare',
      eyebrow: 'The TENROUNDS Difference',
      title: 'Fitness Studio, Not A Fight Gym',
      failTitle: 'Traditional Boxing Training',
      winTitle: 'TENROUNDS HIIT Fitness',
      fail: [
        'Focused on learning boxing as a sport',
        'May include sparring or contact training',
        'Often follows scheduled classes',
        'Fixed training times that clash with work and family',
      ],
      win: [
        'A balanced workout combining HIIT, strength and cardio',
        'Boxing-inspired bag work with no sparring or contact',
        'A coach-supported 30-minute full-body session',
        'No class times — train whenever it suits you',
      ],
    },
    {
      type: 'split',
      eyebrow: 'Why It Works',
      title: 'Variety, Energy And A Stronger You',
      body: [
        'Boxing-inspired bag rounds add variety and intensity to the workout, while strength and functional stations help develop full-body fitness.',
        'Every session is coach-supported and designed to help you improve conditioning, build strength and enjoy the process of getting fitter.',
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
      question: 'Is TENROUNDS a traditional boxing gym?',
      answer:
        'No. TENROUNDS is a boutique HIIT fitness studio. Boxing-inspired bag work is one element of our coach-supported 30-minute workout, alongside strength, cardio and functional training. We do not offer fight training or sparring.',
    },
    {
      question: 'Do I need boxing experience?',
      answer:
        'Not at all. No boxing experience is needed. Your coach explains the movements and helps you work at a level that suits your fitness.',
    },
    {
      question: 'Are gloves provided?',
      answer:
        'You can bring your own gloves if you prefer. All 6-month and 12-month memberships include a free pair of TENROUNDS training gloves to keep.',
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
  ctaHeadline: 'Try A Different Kind Of Fitness In Pretoria East',
  ctaSub:
    'Experience coach-supported HIIT, strength, cardio and boxing-inspired rounds in one 30-minute workout. Your first session is free.',
}

export default function Page() {
  return <LandingTemplate config={config} />
}
