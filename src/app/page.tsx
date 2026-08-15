import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/app/components/HeroSection';

// Lazy load all below-fold sections for code splitting
const LiveInventorySection = dynamic(() => import('@/app/components/LiveInventorySection'));
const GiveawaysSection = dynamic(() => import('@/app/components/GiveawaysSection'));
const InvestmentPackagesSection = dynamic(() => import('@/app/components/InvestmentPackagesSection'));
const PlatformCredibilitySection = dynamic(() => import('@/app/components/PlatformCredibilitySection'));
const EcosystemSection = dynamic(() => import('@/app/components/EcosystemSection'));
const ElonMuskSection = dynamic(() => import('@/app/components/ElonMuskSection'));
const VIPSection = dynamic(() => import('@/app/components/VIPSection'));
const TestimonialsSection = dynamic(() => import('@/app/components/TestimonialsSection'));
const FinalCTASection = dynamic(() => import('@/app/components/FinalCTASection'));
const FloatingSupport = dynamic(() => import('@/app/components/FloatingSupport'));
const ScrollAnimationsClient = dynamic(() => import('@/app/components/ScrollAnimationsClient'));

function SectionSkeleton() {
  return <div className="w-full py-20 px-4" aria-hidden="true" />;
}

export default function HomePage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <div className="grid-bg" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <Header />
      <HeroSection />
      <Suspense fallback={<SectionSkeleton />}>
        <LiveInventorySection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <GiveawaysSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <InvestmentPackagesSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <PlatformCredibilitySection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <EcosystemSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ElonMuskSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <VIPSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FinalCTASection />
      </Suspense>
      <Footer />
      <FloatingSupport />
      <ScrollAnimationsClient />
    </main>
  );
}