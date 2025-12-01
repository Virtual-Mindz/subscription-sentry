"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const MorphingNavigationBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loginHovered, setLoginHovered] = useState(false);
  const [pricingHovered, setPricingHovered] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const shouldBeScrolled = scrollPosition > 100;
      setIsScrolled(shouldBeScrolled);
      // Debug logging
      console.log('Scroll Y:', scrollPosition, 'Is Scrolled:', shouldBeScrolled);
    };

    const checkDesktop = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      console.log('Is Desktop:', desktop, 'Window Width:', window.innerWidth);
    };

    // Check initial scroll position and desktop
    handleScroll();
    checkDesktop();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener('resize', checkDesktop);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  // Debug logging for navbar state
  useEffect(() => {
    if (isScrolled) {
      console.log('Navbar State - Is Scrolled:', isScrolled, 'Is Desktop:', isDesktop, 'Will Center:', isScrolled && isDesktop);
    }
  }, [isScrolled, isDesktop]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <nav className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-sm z-[1000] py-4 px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="font-bold text-xl text-orange-500">Subscription Sentry</div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/blog" className="text-gray-700 hover:text-orange-500 transition-colors">Blogs</Link>
            <Link href="#how-it-works" className="text-gray-700 hover:text-orange-500 transition-colors">How it Works</Link>
            <Link href="#security" className="text-gray-700 hover:text-orange-500 transition-colors">Security</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="px-6 py-2 border-2 border-gray-300 rounded-full text-gray-700 hover:border-gray-400 transition-colors">
              Login
            </Link>
            <Link 
              href="#pricing" 
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('pricing');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="px-6 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 hover:scale-105 transition-all"
            >
              Pricing
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Calculate styles based on state
  const navStyle: React.CSSProperties = isScrolled && isDesktop
    ? {
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'auto',
        maxWidth: '1300px',
        minWidth: '700px',
        backgroundColor: '#1a1a3e',
        borderRadius: '50px',
        padding: '0.875rem 2.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
      }
    : isScrolled
    ? {
        position: 'fixed',
        top: '1rem',
        left: '0',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '0',
        padding: '0.75rem 1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        borderRadius: '0',
        padding: '1rem 2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      };

  return (
    <nav
      className="transition-all duration-300 ease-in-out"
      style={navStyle}
    >
      <div
        className={`flex items-center justify-between transition-all duration-300 ${
          isScrolled && isDesktop
            ? "gap-6" 
            : isScrolled
            ? "gap-2 md:gap-4" 
            : "max-w-7xl mx-auto gap-4 md:gap-8"
        }`}
      >
        {/* Logo - Left Section */}
        <Link
          href="/"
          className={`font-bold transition-all duration-300 ${
            isScrolled && isDesktop
              ? "text-orange-500 text-lg"
              : isScrolled
              ? "text-orange-500 text-lg"
              : "text-orange-500 text-xl"
          }`}
        >
          {isScrolled && isDesktop ? (
            "SS"
          ) : isScrolled ? (
            "Subscription Sentry"
          ) : (
            "Subscription Sentry"
          )}
        </Link>

        {/* Navigation Links - Center Section */}
        <div
          className={`hidden md:flex items-center transition-all duration-300 ${
            isScrolled && isDesktop ? "gap-6" : isScrolled ? "gap-3 md:gap-4" : "gap-8"
          }`}
        >
          <Link
            href="/blog"
            className={`transition-colors duration-300 ${
              isScrolled && isDesktop
                ? "text-white hover:text-orange-400"
                : isScrolled
                ? "text-gray-700 hover:text-orange-500"
                : "text-gray-700 hover:text-orange-500"
            }`}
          >
            Blogs
          </Link>
          <Link
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById('how-it-works');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className={`transition-colors duration-300 ${
              isScrolled && isDesktop
                ? "text-white hover:text-orange-400"
                : isScrolled
                ? "text-gray-700 hover:text-orange-500"
                : "text-gray-700 hover:text-orange-500"
            }`}
          >
            How it Works
          </Link>
          <Link
            href="#security"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById('security');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className={`transition-colors duration-300 ${
              isScrolled && isDesktop
                ? "text-white hover:text-orange-400"
                : isScrolled
                ? "text-gray-700 hover:text-orange-500"
                : "text-gray-700 hover:text-orange-500"
            }`}
          >
            Security
          </Link>
        </div>

        {/* Buttons - Right Section */}
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/sign-in"
            className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all duration-300 text-sm md:text-base hover:scale-105 ${
              isScrolled && isDesktop
                ? "border-2 border-white text-white"
                : isScrolled
                ? "border-2 border-gray-300 text-gray-700"
                : "border-2 border-gray-300 text-gray-700"
            }`}
            style={{
              backgroundColor: loginHovered ? '#f97316' : 'transparent',
              borderColor: loginHovered ? '#f97316' : undefined,
              color: loginHovered ? 'white' : undefined,
            }}
            onMouseEnter={() => setLoginHovered(true)}
            onMouseLeave={() => setLoginHovered(false)}
          >
            Login
          </Link>
          <Link
            href="#pricing"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById('pricing');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className={`px-4 md:px-6 py-2 rounded-full font-semibold transition-all duration-300 text-sm md:text-base hover:scale-105 ${
              isScrolled && isDesktop
                ? "border-2 border-white text-white"
                : "border-2 border-gray-300 text-gray-700"
            }`}
            style={{
              backgroundColor: pricingHovered ? '#f97316' : 'transparent',
              borderColor: pricingHovered ? '#f97316' : undefined,
              color: pricingHovered ? 'white' : undefined,
            }}
            onMouseEnter={() => setPricingHovered(true)}
            onMouseLeave={() => setPricingHovered(false)}
          >
            Pricing
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MorphingNavigationBar;
