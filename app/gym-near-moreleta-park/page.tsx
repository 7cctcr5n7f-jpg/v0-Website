import type { Metadata } from 'next'
import { LandingTemplate, type LandingConfig } from '@/components/landing/landing-template'
import { testimonials } from '@/lib/content'

export const metadata: Metadata = {
  title: 'HIIT Gym Near Moreleta Park | TENROUNDS Garsfontein',
  description:
    'Looking for a gym near Moreleta Park? TENROUNDS in neighbouring Garsfontein offers coach-supported 30-minute HIIT, boxing-bag and strength workouts with no fixed class times. Book a free first session.',
  alternates: { canonical: '/gym-near-moreleta-park' },
  openGraph: {
    title: 'Gym Near Moreleta Park | TENROUNDS Pretoria East',
    description:
      'Coach-supported 30-minute HIIT and boxing fitness in Garsfontein, convenient for Moreleta Park. No fixed class times. Book your free first session.',
    images: [{ url: '/gym-exterior-night.jpg', width: 1200, height: 630, alt: 'Gym near Moreleta Park Pretoria East — TENROUNDS Garsfontein' }],
  },
  twitter: { card: 'summary_large_image', images: ['/gym-exterior-night.jpg'] },
  keywords: ['gym near Moreleta Park', 'gym Moreleta Park Pretoria', 'HIIT gym Moreleta Park', 'fitness Moreleta Park Pretoria East', 'gym near Constantia Park Pretoria'],
}

const config: LandingConfig = {
  slug: 'gym-near-moreleta-park',
  breadcrumb: 'Gym Near Moreleta Park',
  heroEyebrow: 'Gym Near Moreleta Park',
  heroTitle: '30-Minute HIIT Near',
  heroHighlight: 'Moreleta Park',
  heroSubtitle:
    'TENROUNDS is based in Garsfontein, a practical option for Moreleta Park residents looking for coach-supported 30-minute HIIT, boxing-bag work and strength training without fixed class times.',
  heroImage: '/gym-exterior-night.jpg',
  heroImageAlt: 'TENROUNDS HIIT gym near Moreleta Park in Garsfontein, Pretoria East',
  intro:
    'If you are based in Moreleta Park, compare your usual gym commute with a focused 30-minute session in nearby Garsfontein. Arrive during opening hours and a coach will guide you through the ten-round circuit.',
  blocks: [
    {
      type: 'features',
      eyebrow: 'Minutes Away',
      title: 'How Close Are We?',
      description:
        'TENROUNDS sits in neighbouring Garsfontein, perfectly positioned for Moreleta Park residents.',
      items: [
        { icon: 'clock', title: 'Minutes From Moreleta Park', desc: 'A short, easy drive from Moreleta Park straight to your session.' },
        { icon: 'clock', title: 'Minutes From Constantia Park', desc: 'Quick access from Constantia Park means you train more and commute less.' },
        { icon: 'clock', title: 'Minutes From Elardus Park', desc: 'Conveniently reachable from Elardus Park and the surrounding suburbs.' },
        { icon: 'timer', title: '30-Minute Sessions', desc: 'In, trained, and out — without sacrificing your whole evening.' },
        { icon: 'users', title: 'Coach-Supported Always', desc: 'A qualified coach guides every session from start to finish.' },
        { icon: 'clock', title: 'No Class Times', desc: 'Arrive when it suits you — no bookings, no waiting for a slot.' },
      ],
    },
    {
      type: 'split',
      eyebrow: 'Why Moreleta Park Trains Here',
      title: 'Why Moreleta Park Residents Choose TENROUNDS',
      body: [
        'For residents of Moreleta Park, location and time both matter. TENROUNDS is in nearby Garsfontein, with 30-minute sessions that combine boxing-bag work, functional strength and cardio.',
        'A coach supports your technique and helps you use the live heart-rate display to understand your effort during each workout.',
      ],
      image: '/coach-support.png',
      imageAlt: 'Coach supporting a member at TENROUNDS near Moreleta Park',
      bullets: [
        'A short, convenient drive from Moreleta Park',
        'Coach-supported 30-minute sessions, no class times',
        'Secure, premium boutique facility in Garsfontein',
      ],
    },
    {
      type: 'compare',
      eyebrow: 'The No Class Times Advantage',
      title: 'Train On Your Schedule, Not Theirs',
      failTitle: 'Class-Based Studios',
      winTitle: 'TENROUNDS Near Moreleta Park',
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
      question: 'How far is TENROUNDS from Moreleta Park?',
      answer:
        'TENROUNDS is just a few minutes from Moreleta Park at 649 Borzoi Street, Garsfontein, Pretoria East — an easy drive from Moreleta Park, Constantia Park and Elardus Park.',
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
  testimonials: [testimonials[1], testimonials[3], testimonials[0]],
  showMap: true,
  ctaHeadline: 'The Closest Premium Gym To Moreleta Park',
  ctaSub:
    'Coach-supported 30-minute training, minutes from home, with no class times. Your first session is on us.',
}

export default function Page() {
  return <LandingTemplate config={config} />
}
