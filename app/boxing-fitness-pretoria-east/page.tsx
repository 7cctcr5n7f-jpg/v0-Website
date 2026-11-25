import type { Metadata } from 'next'
import { LandingTemplate, type LandingConfig } from '@/components/landing/landing-template'
import type { Testimonial } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Boxing-Inspired Fitness Pretoria East',
  description:
    'Enjoy boxing-inspired fitness as part of a coach-supported 30-minute HIIT workout at TENROUNDS in Pretoria East. Build strength and conditioning with no sparring or boxing experience needed.',
  alternates: { canonical: '/boxing-fitness-pretoria-east' },
  openGraph: {
    title: 'Boxing-Inspired Fitness Pretoria East | TENROUNDS',
    description:
      'Coach-supported HIIT fitness in Pretoria East, with boxing-inspired bag rounds, strength and cardio. No sparring and no class times.',
    images: [{ url: '/coach-support.png', width: 1200, height: 630, alt: 'Boxing-inspired fitness at TENROUNDS Pretoria East' }],
  },
  twitter: { card: 'summary_large_image', images: ['/coach-support.png'] },
  keywords: ['boxing-inspired fitness Pretoria East', 'HIIT gym Pretoria East', 'fitness studio Pretoria East', '30 minute workout Pretoria East', 'boxing fitness Garsfontein'],
}

const boxingTestimonials: Testimonial[] = [
  {
    quote:
      'The boxing-style conditioning melts stress away and the fat came off fast. Best decision I made in Pretoria East.',
    name: 'Marius B.',
    detail: 'Olympus · Member 7 months',
  },
  {
    quote:
      'I was nervous as a total beginner but the coaches made it easy. No sparring, just the best workout of my week.',
    name: 'Ayesha S.',
    detail: 'Garsfontein · Member 5 months',
  },
  {
    quote:
      'Stronger, leaner and far less stressed. The 30-minute boxing sessions are addictive.',
    name: 'Tumelo R.',
    detail: 'Moreleta Park · Member 1 year',
  },
  {
    quote:
      'Finally a boxing workout that fits my lunch break. The confidence boost is real.',
    name: 'Hannelie V.',
    detail: 'Faerie Glen · Member 9 months',
  },
]

const config: LandingConfig = {
  slug: 'boxing-fitness-pretoria-east',
  breadcrumb: 'Boxing-Inspired Fitness Pretoria East',
  heroEyebrow: 'Boxing-Inspired Fitness Pretoria East',
  heroTitle: 'HIIT Fitness With',
  heroHighlight: 'Boxing-Inspired Rounds',
  heroSubtitle:
    'Enjoy boxing-inspired bag rounds as one part of a complete, coach-supported 30-minute HIIT workout. TENROUNDS combines strength, cardio and conditioning in Pretoria East, with no sparring or boxing experience required.',
  heroImage: '/coach-support.png',
  heroImageAlt: 'Coach-supported boxing fitness session at TENROUNDS Pretoria East',
  intro:
    'TENROUNDS is a boutique HIIT fitness studio, not a traditional boxing gym. Boxing-inspired bag rounds add energy and variety to a balanced workout that also includes strength, cardio and functional training, all supported by a coach.',
  blocks: [
    {
      type: 'features',
      eyebrow: 'The Benefits',
      title: 'Why Members Enjoy Boxing-Inspired Fitness',
      description:
        'A boxing-style workout hits everything at once — and it is genuinely fun, which is why members keep coming back.',
      items: [
        { icon: 'trending', title: 'Weight Loss', desc: 'High-intensity rounds torch calories long after you leave.' },
        { icon: 'heart', title: 'Fitness & Conditioning', desc: 'Build serious cardio and muscular endurance fast.' },
        { icon: 'zap', title: 'Stress Relief', desc: 'There is nothing like hitting pads to clear your head.' },
        { icon: 'target', title: 'Confidence', desc: 'Move with power and walk out standing taller.' },
        { icon: 'dumbbell', title: 'Full-Body Strength', desc: 'Combine boxing-inspired bag rounds with functional strength training.' },
        { icon: 'timer', title: '30 Minutes Flat', desc: 'A complete HIIT fitness session that fits your day.' },
      ],
    },
    {
      type: 'split',
      eyebrow: 'The Science',
      title: 'A Full-Body Mix Of Strength And Cardio',
      body: [
        'Boxing fitness blends explosive intervals with constant movement, recruiting your entire body. That elevates your heart rate into fat-burning zones and keeps your metabolism elevated for hours afterwards.',
        'At TENROUNDS every round is coached and tracked, so you stay in the right intensity zone for maximum results — no wasted effort, no guesswork.',
      ],
      image: '/strength-training.png',
      imageAlt: 'High-intensity boxing conditioning at TENROUNDS',
      bullets: [
        'Explosive intervals for maximum calorie burn',
        'Heart-rate tracking keeps you in the fat-burning zone',
        'Strength and conditioning built into every session',
      ],
    },
    {
      type: 'checklist',
      eyebrow: 'Who It Is For',
      title: 'Built For Everyone In Pretoria East',
      description: 'No experience required. No contact. Just a brilliant workout coached for your level.',
      items: [
        'Beginners who have never thrown a punch',
        'Professionals who want maximum results in minimum time',
        'Parents fitting fitness around a busy family schedule',
        'Students looking for an affordable, high-energy workout',
      ],
    },
    {
      type: 'split',
      eyebrow: 'Your Session',
      title: 'What Happens In A TENROUNDS Session',
      reverse: true,
      body: [
        'You arrive whenever it suits you — no class times. Your coach warms you up, then guides you through boxing-style intervals layered with strength and functional movement.',
        'Thirty minutes later you walk out sweaty, energised and a step closer to your goals. Every session is different, coach-supported and built around full-body fitness.',
      ],
      image: '/coach-support.png',
      imageAlt: 'TENROUNDS coach guiding a boxing fitness member',
      dark: true,
    },
  ],
  faqs: [
    {
      question: 'Do I need boxing experience?',
      answer:
        'None at all. Our HIIT workouts are fully coached and scaled to beginners. No boxing experience is needed to enjoy the boxing-inspired bag rounds.',
    },
    {
      question: 'Will I get hit or have to spar?',
      answer:
        'No. Boxing-inspired bag work is non-contact fitness. There is no sparring or fighting at TENROUNDS.',
    },
    {
      question: 'Where are you based?',
      answer:
        'We are at 649 Borzoi Street, Garsfontein, Pretoria East — central to Faerie Glen, Woodhill, Olympus, Boardwalk and Moreleta Park.',
    },
    {
      question: 'How long is a session?',
      answer:
        'Each TENROUNDS session is 30 minutes and combines HIIT, strength, cardio and boxing-inspired fitness.',
    },
    {
      question: 'Can I try a session for free?',
      answer:
        'Yes. Your first coached session and fitness assessment are free. Book your free trial online or message us on WhatsApp.',
    },
  ],
  testimonials: boxingTestimonials,
  showMap: true,
  ctaHeadline: 'Get Fitter With TENROUNDS In Pretoria East',
  ctaSub:
    'Experience coach-supported HIIT, strength, cardio and boxing-inspired rounds in one 30-minute workout. Claim your free trial at TENROUNDS today.',
}

export default function Page() {
  return <LandingTemplate config={config} />
}
