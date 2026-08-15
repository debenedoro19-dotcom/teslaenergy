import { Suspense } from 'react';
import CryptoPaymentClient from './CryptoPaymentClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <CryptoPaymentClient />
    </Suspense>
  );
}
