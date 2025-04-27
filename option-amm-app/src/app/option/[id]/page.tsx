'use client'

import OptionDetail from '@/components/OptionDetail';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

export default function OptionDetailPage() {
  const params = useParams();
  const optionId = parseInt(params?.id as string);
  
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Options List
          </Link>
        </div>
        
        <OptionDetail optionId={optionId} />
      </div>
      
      <footer className="bg-gray-800 text-white py-6 mt-10">
        <div className="container mx-auto px-4 text-center">
          <p>Options AMM Platform - Decentralized Options Trading on Flare Network</p>
        </div>
      </footer>
    </main>
  );
}