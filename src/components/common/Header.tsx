import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-700">
              SubscriptionSentry
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition">
              Home
            </Link>
            <Link href="/sign-in" className="text-gray-700 hover:text-blue-600 transition">
              Sign In
            </Link>
            <Link href="/sign-up" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Get Started
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 