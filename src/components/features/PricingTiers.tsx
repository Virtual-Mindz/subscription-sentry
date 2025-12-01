import React from "react";

interface PricingTiersProps {
  billing: 'monthly' | 'annual';
}

const plansData = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "Track up to 3 subscriptions",
      "Basic subscription detection",
      "Email notifications",
      "Community support",
    ],
    button: "Get Started Free",
    isFree: true,
    isPopular: false,
    annual: null,
  },
  {
    name: "Pro",
    price: "$7.99",
    period: "/month",
    features: [
      "Unlimited subscriptions",
      "AI-powered detection (finds 40% more)",
      "Price increase alerts",
      "One-click cancellation help",
      "Advanced analytics dashboard",
      "Priority email support",
    ],
    button: "Choose Pro",
    isFree: false,
    isPopular: true,
    annual: {
      price: "$6.66",
      period: "/month",
      billed: "$79.90 billed annually",
      badge: "Save 2 months",
    },
  },
];

const PricingTiers: React.FC<PricingTiersProps> = ({ billing }) => {
  return (
    <section aria-label="Pricing Plans" className="w-full">
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl mx-auto"
        style={{ alignItems: 'stretch' }}
      >
        {plansData.map((plan) => {
          const isAnnual = billing === 'annual' && plan.annual;
          return (
            <article
              key={plan.name}
              className={`bg-white rounded-2xl shadow-md transition-all duration-300 flex flex-col border relative h-full hover:shadow-2xl hover:-translate-y-1 focus-within:shadow-xl outline-none cursor-pointer`}
              tabIndex={0}
              style={{
                borderColor: plan.isPopular
                  ? '#f97316'
                  : plan.isFree
                  ? '#3b82f6'
                  : '#3b82f6',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderWidth: plan.isPopular ? 2 : 1,
                minHeight: 480,
              }}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-orange-500 text-white px-3 md:px-4 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-md">
                    Most Popular
                  </span>
                </div>
              )}
              {/* Header Section */}
              <header className="text-center mb-6 px-4 pt-6">
                <h3 className={`text-2xl md:text-3xl font-extrabold mb-2 tracking-tight ${
                  plan.isPopular ? 'text-orange-500' : plan.isFree ? 'text-blue-600' : 'text-blue-900'
                }`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className={`text-4xl md:text-5xl font-extrabold ${plan.isFree ? 'text-blue-600' : plan.isPopular ? 'text-gray-900' : 'text-gray-900'}`}>
                    {isAnnual ? plan.annual.price : plan.price}
                  </span>
                  <span className={`text-base text-gray-600`}>
                    {isAnnual ? plan.annual.period : plan.period}
                  </span>
                </div>
                {isAnnual && plan.annual?.billed && (
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {plan.annual.billed}
                  </div>
                )}
              </header>

              {/* Features Section - Fixed Height */}
              <div className="flex-1 mb-6 min-h-[200px] md:min-h-[220px] px-4">
                <ul className="space-y-3" aria-label="Plan Features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg 
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <span className={`text-base leading-relaxed ${
                        plan.isFree ? 'text-gray-600' : 'text-gray-800'
                      }`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Button Section */}
              <div className="mt-auto px-4 pb-6">
                <button
                  className={`w-full px-4 md:px-6 py-3 font-semibold rounded-lg transition text-base min-h-[44px] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    plan.isFree
                      ? 'bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50 active:bg-blue-100'
                      : plan.isPopular
                      ? 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700'
                      : 'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900'
                  }`}
                  style={{
                    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                  }}
                  tabIndex={0}
                >
                  {plan.button}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PricingTiers; 