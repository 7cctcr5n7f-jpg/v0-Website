import type { Metadata } from 'next'
import { LandingTemplate, type LandingConfig } from '@/components/landing/landing-template'
import { testimonials } from '@/lib/content'

export const metadata: Metadata = {
  title: 'HIIT Gym Near Woodhill | TENROUNDS Garsfontein',
  description:
    'Searching for a gym near Woodhill? TENROUNDS in Garsfontein offers coach-supported 30-minute HIIT, boxing-bag and strength workouts with no fixed class times. Book a free first session.',
  alternates: { canonical: '/gym-near-woodhill' },
  openGraph: {
    title: 'Gym Near Woodhill | TENROUNDS Pretoria East',
    description:
      'Coach-supported 30-minute HIIT and boxing fitness in Garsfontein, convenient for Woodhill, Boardwalk and Olympus. No fixed class times. Try a session free.',
    images: [{ url: '/gym-stations.png', width: 1200, height: 630, alt: 'Gym near Woodhill Pretoria East — TENROUNDS Garsfontein' }],
  },
  twitter: { card: 'summary_large_image', images: ['/gym-stations.png'] },
  keywords: ['gym near Woodhill', 'gym Woodhill Pretoria', 'HIIT gym near Woodhill', 'fitness Woodhill Pretoria East', 'gym near Boardwalk Pretoria'],
}

const config: LandingConfig = {
  slug: 'gym-near-woodhill',
  breadcrumb: 'Gym Near Woodhill',
  heroEyebrow: 'Gym Near Woodhill',
  heroTitle: '30-Minute HIIT Near',
  heroHighlight: 'Woodhill',
  heroSubtitle:
    'TENROUNDS is based in Garsfontein, a practical option for Woodhill residents looking for coach-supported 30-minute HIIT, boxing-bag work and strength training without fixed class times.',
  heroImage: '/gym-stations.png',
  heroImageAlt: 'TENROUNDS HIIT gym near Woodhill in Garsfontein, Pretoria East',
  intro:
    'If you are based in Woodhill, compare your usual gym commute with a focused 30-minute session in Garsfontein. Arrive during opening hours and a coach will guide you through the ten-round circuit.',
  blocks: [
    {
      type: 'features',
      eyebrow: 'Minutes Away',
      title: 'How Close Are We?',
      description:
        'TENROUNDS sits in Garsfontein, perfectly positioned for residents across the eastern suburbs.',
      items: [
        { icon: 'clock', title: 'Minutes From Woodhill', desc: 'A short, easy drive from Woodhill estates straight to your session.' },
        { icon: 'clock', title: 'Minutes From Boardwalk', desc: 'Quick access from Boardwalk means you train more and commute less.' },
        { icon: 'clock', title: 'Minutes From Olympus', desc: 'Conveniently reachable from Olympus and the surrounding suburbs.' },
        { icon: 'timer', title: '30-Minute Sessions', desc: 'In, trained, and out — without sacrificing your whole evening.' },
        { icon: 'users', title: 'Coach-Supported Always', desc: 'A qualified coach guides every session from start to finish.' },
        { icon: 'clock', title: 'No Class Times', desc: 'Arrive when it suits you — no bookings, no waiting for a slot.' },
      ],
    },
    {
      type: 'split',
      eyebrow: 'Why Woodhill Trains Here',
      title: 'Why Woodhill Residents Choose TENROUNDS',
      body: [
        'For residents of Woodhill, location and time both matter. TENROUNDS is in Garsfontein, with 30-minute sessions that combine boxing-bag work, functional strength and cardio.',
        'A coach supports your technique and helps you use the live heart-rate display to understand your effort during each workout.',
      ],
      image: '/coach-support.png',
      imageAlt: 'Coach supporting a member at TENROUNDS near Woodhill',
      bullets: [
        'A short, convenient drive from Woodhill',
        'Coach-supported 30-minute sessions, no class times',
        'Secure, premium boutique facility in Garsfontein',
      ],
    },
    {
      type: 'compare',
      eyebrow: 'The No Class Times Advantage',
      title: 'Train On Your Schedule, Not Theirs',
      failTitle: 'Class-Based Studios',
      winTitle: 'TENROUNDS Near Woodhill',
      fail: [
        'Locked into rigid class times that rarely fit your day',
        'Miss the slot and you miss the workout entirely',
        'Booking apps, waitlists and cancellation penalties',
        'Packed classes where you barely get coached',
      ],
      win: [
        'Walk in any time during opening hours and start',
        'Never miss a session because of a fixed timetable',
        'No bookings, no waitlists, no penalties',
        'Personal coaching attention every single visit',
      ],
    },
  ],
  faqs: [
    {
      question: 'How far is TENROUNDS from Woodhill?',
      answer:
        'TENROUNDS is just a few minutes from Woodhill at 649 Borzoi Street, Garsfontein, Pretoria East — an easy drive from Woodhill, Boardwalk and Olympus.',
    },
    {
      question: 'Do I have to book a class time?',
      answer:
        'No. TENROUNDS has no class times. Arrive whenever it suits you during opening hours and a coach will guide your 30-minute session.',
    },
    {
      question: 'Is there secure parking?',
      answer:
        'Yes. Our Garsfontein facility offers convenient, secure parking so getting in and out for your 30-minute session is effortless.',
    },
    {
      question: 'What are your opening hours?',
      answer:
        'We are open Monday to Friday 05:00–10:00 and 13:00–19:00, and Saturday 07:00–10:00, with no class times in between.',
    },
    {
      question: 'Can I try a session before joining?',
      answer:
        'Absolutely. Your first coach-supported session and fitness assessment are free. Claim your trial online or via WhatsApp.',
    },
  ],
  testimonials: [testimonials[2], testimonials[0], testimonials[1]],
  showMap: true,
  ctaHeadline: 'The Closest Premium Gym To Woodhill',
  ctaSub:
    'Coach-supported 30-minute training, minutes from home, with no class times. Your first session is on us.',
}

export default function Page() {
  return <LandingTemplate config={config} />
}
