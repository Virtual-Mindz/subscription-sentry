"use client";
import { useState } from "react";
import MorphingNavigationBar from "@/components/MorphingNavigationBar";
import PricingTiers from "@/components/features/PricingTiers";

// FAQ data
const faqData = [
  {
    question: "Is my financial data secure?",
    answer: "Yes, absolutely. We use bank-level 256-bit encryption and never store your banking credentials. We only have read-only access to your transaction data through secure, encrypted connections."
  },
  {
    question: "How do you find subscriptions?",
    answer: "Our AI scans your connected accounts and analyzes transaction patterns to identify recurring payments. We look for regular charges from known subscription services, streaming platforms, software companies, and other recurring billing patterns."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your Subscription Sentry account at any time with no questions asked. Simply go to your account settings and click 'Cancel Subscription'."
  },
  {
    question: "What if I have issues canceling?",
    answer: "If you encounter any problems canceling subscriptions through our platform, our support team is here to help. We provide step-by-step guidance and direct links to cancellation pages."
  },
  {
    question: "Do you store my banking details?",
    answer: "No, we never store your banking credentials or passwords. We use secure, read-only connections through Plaid that only allows us to view your transaction history."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! You can start with our free plan which allows you to track up to 3 subscriptions with basic detection and email alerts."
  }
];

export default function Home() {
  const [subscriptionCount, setSubscriptionCount] = useState(6);
  const [averageCost, setAverageCost] = useState(15);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Calculate savings synchronously to avoid hydration mismatch
  const monthlySpending = subscriptionCount * averageCost;
  const monthlySavings = Math.round(monthlySpending * 0.3); // Assume 30% savings
  const yearlySavings = monthlySavings * 12;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white relative overflow-hidden" suppressHydrationWarning>
      {/* Morphing Navigation Bar */}
      <MorphingNavigationBar />
      
      {/* Spacer for fixed navbar */}
      <div className="h-20" />
      
      {/* floating-shapes placeholder - matches what browser extensions may inject */}
      <div className="floating-shapes" style={{ zIndex: -1 }} suppressHydrationWarning />
      
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center min-h-[80vh] px-4 py-16">
        <div className="max-w-4xl mx-auto opacity-100 translate-y-0">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
            Subscription Tracking
          </h1>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8">
            On <span className="text-orange-500">Auto-Pilot</span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            🔍 Find and 💰 Cancel forgotten subscriptions draining your account — save $200+ monthly while you sleep
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-up"
              className="px-8 py-4 rounded-full bg-orange-500 text-white font-bold shadow-lg hover:bg-orange-600 hover:scale-105 transition-all duration-200 text-lg"
            >
              Find My Hidden Subscriptions
            </a>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-full border-2 border-orange-500 text-orange-500 font-bold bg-white shadow-lg hover:bg-orange-50 hover:scale-105 transition-all duration-200 text-lg"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* The Subscription Problem Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            The Subscription Problem
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Statistics Card 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg text-center">
              <div className="text-5xl font-bold text-orange-500 mb-4">12+</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Average Subscriptions</h3>
              <p className="text-gray-600 mb-4">per person</p>
              <p className="text-gray-700 leading-relaxed">
                The average person now manages over 12 different subscription services, from streaming to software to fitness apps.
              </p>
            </div>
            
            {/* Statistics Card 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg text-center">
              <div className="text-5xl font-bold text-orange-500 mb-4">$273+</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Monthly Waste</h3>
              <p className="text-gray-600 mb-4">on forgotten services</p>
              <p className="text-gray-700 leading-relaxed">
                Most people waste $273+ every month on subscriptions they've forgotten about or no longer use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Savings Calculator Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-12">
            How Much Could You Save?
          </h2>
          
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
            {/* Input Fields */}
            <div className="space-y-8 mb-8">
              {/* Subscription Count Slider */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Number of subscriptions you have: <span className="text-orange-500 font-bold">{subscriptionCount}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={subscriptionCount}
                  onChange={(e) => setSubscriptionCount(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${(subscriptionCount - 3) / 17 * 100}%, #e5e7eb ${(subscriptionCount - 3) / 17 * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>3</span>
                  <span>20</span>
                </div>
              </div>

              {/* Average Cost Slider */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Average cost per subscription: <span className="text-orange-500 font-bold">${averageCost}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={averageCost}
                  onChange={(e) => setAverageCost(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${(averageCost - 5) / 45 * 100}%, #e5e7eb ${(averageCost - 5) / 45 * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>$5</span>
                  <span>$50</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white mb-8">
              <h3 className="text-xl font-semibold mb-4">Your Potential Savings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold mb-1">${monthlySavings}</div>
                  <div className="text-sm opacity-90">per month</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">${yearlySavings}</div>
                  <div className="text-sm opacity-90">per year</div>
                </div>
              </div>
              <p className="text-sm opacity-90 mt-4">
                Based on 30% average waste on forgotten subscriptions
              </p>
            </div>

            {/* CTA Button */}
            <a
              href="/sign-up"
              className="inline-block px-8 py-4 rounded-full bg-orange-500 text-white font-bold text-lg shadow-lg hover:bg-orange-600 hover:scale-105 transition-all duration-200"
            >
              Start Saving Now
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Why Choose Subscription Sentry?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 - Smart Detection */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Smart Detection</h3>
              <p className="text-gray-600 leading-relaxed">
                Our AI scans your accounts to find hidden subscriptions you've forgotten about, even those buried in old emails or bank statements.
              </p>
            </div>

            {/* Feature Card 2 - Price Alerts */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM12 6V4a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2v-2h6a2 2 0 002-2V8a2 2 0 00-2-2h-6z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Price Alerts</h3>
              <p className="text-gray-600 leading-relaxed">
                Get notified before your subscription prices increase, so you can decide whether to keep, downgrade, or cancel before the hike.
              </p>
            </div>

            {/* Feature Card 3 - Easy Cancellation */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Easy Cancellation</h3>
              <p className="text-gray-600 leading-relaxed">
                Cancel unwanted subscriptions with just one click. No more hunting through websites or calling customer service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            See How Simple It Is
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Get started in 3 easy steps and start saving immediately
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 - Connect Securely */}
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Connect Securely</h3>
              <p className="text-gray-600 leading-relaxed">
                Link your accounts with bank-level security using 256-bit encryption
              </p>
            </div>

            {/* Step 2 - AI Scans Everything */}
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">AI Scans Everything</h3>
              <p className="text-gray-600 leading-relaxed">
                Our AI finds subscriptions you forgot about in seconds
              </p>
            </div>

            {/* Step 3 - Cancel & Save */}
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Cancel & Save</h3>
              <p className="text-gray-600 leading-relaxed">
                Cancel unwanted subscriptions with one click and start saving
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mb-8">
            <a
              href="/sign-up"
              className="inline-block px-8 py-4 rounded-full bg-orange-500 text-white font-bold text-lg shadow-lg hover:bg-orange-600 hover:scale-105 transition-all duration-200"
            >
              Start My Free Scan
            </a>
          </div>

          {/* Security Badges */}
          <div id="security" className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              256-bit Encryption
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Bank-Level Security
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Read-Only Access
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Choose Your Plan
          </h2>
          
          {/* Monthly/Annual Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md font-semibold transition-all duration-200 ${
                  billingPeriod === 'monthly'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2 rounded-md font-semibold transition-all duration-200 ${
                  billingPeriod === 'annual'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          {/* Pricing Tiers */}
          <PricingTiers billing={billingPeriod} />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {faqData.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
                >
                  <h3 className="text-lg font-semibold text-gray-800 pr-4">
                    {faq.question}
                  </h3>
                  <svg
                    className={`w-5 h-5 text-orange-500 flex-shrink-0 transition-transform duration-300 ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="pt-20 pb-32 px-4"
        style={{
          background: 'linear-gradient(180deg, #1B0E63 0%, #4B1A86 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Shield Icon with Circular Background */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-orange-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
                />
              </svg>
            </div>
          </div>
          
          {/* Heading */}
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Saving?
          </h2>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands already saving hundreds every month with Subscription Sentry. Get started in less than 2 minutes.
          </p>
          
          {/* CTA Button */}
          <a
            href="/sign-in"
            className="inline-block px-8 py-4 rounded-full bg-green-500 text-white font-bold text-lg shadow-lg hover:bg-green-600 hover:scale-105 transition-all duration-200"
          >
            Find my hidden Subscription
          </a>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="text-white" style={{ backgroundColor: '#1A1A3A' }}>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:justify-between gap-12">
            {/* Left Side: Brand, tagline, social */}
            <div className="md:w-1/3 flex flex-col items-start justify-start">
              <h3 className="text-2xl font-bold text-orange-500 mb-2">Subscription Sentry</h3>
              <p className="text-gray-400 mb-4">Find and cancel forgotten subscriptions draining your account. Save money while you sleep.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
            {/* Right Side: Columns */}
            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {/* Product Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#how-it-works" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">Features</a></li>
                  <li><a href="#how-it-works" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">How it Works</a></li>
                  <li>
                    <a 
                      href="#pricing" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('pricing');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="text-gray-400 hover:text-orange-500 transition-colors duration-200"
                    >
                      Pricing
                    </a>
                  </li>
                </ul>
              </div>
              {/* Company Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">About</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">Help</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">Blog</a></li>
                </ul>
              </div>
              {/* Legal Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
          {/* Copyright Bottom Section */}
          <div className="border-t border-gray-800 pt-8 mt-8">
            <p className="text-center text-gray-400 text-sm">
              Copyright © 2025 Subscription Sentry. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
