import { LandingNavbar } from '@/components/landing/landing-navbar'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingTrustStrip } from '@/components/landing/landing-trust-strip'
import { LandingAbout } from '@/components/landing/landing-about'
import { LandingChallenge } from '@/components/landing/landing-challenge'
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingRecommendation } from '@/components/landing/landing-recommendation'
import { LandingHumanInTheLoop } from '@/components/landing/landing-human-in-the-loop'
import { LandingBenefits } from '@/components/landing/landing-benefits'
import { LandingContact } from '@/components/landing/landing-contact'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-primary/15 selection:text-primary">
      {/* Public Sticky Navbar */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero Section */}
        <LandingHero />

        {/* 2. Value / Trust Strip */}
        <LandingTrustStrip />

        {/* 3. About Our Solution */}
        <LandingAbout />

        {/* 4. The Challenge / Problems We Solve */}
        <LandingChallenge />

        {/* 5. How It Works (5-Step Sequence) */}
        <LandingHowItWorks />

        {/* 6. Key Features (6 Cards) */}
        <LandingFeatures />

        {/* 7. Smart Recommendation (Product Demonstration) */}
        <LandingRecommendation />

        {/* 8. Human-in-the-Loop Principle */}
        <LandingHumanInTheLoop />

        {/* 9. Why This Matters (Benefits) */}
        <LandingBenefits />

        {/* 10. Contact Inquiries */}
        <LandingContact />
      </main>

      {/* Public Footer */}
      <LandingFooter />
    </div>
  )
}
