'use client';

import Link from "next/link";
import { ReactNode, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Toaster } from 'react-hot-toast';

const NotificationCenter = dynamic(() => import("@/components/features/NotificationCenter"), { ssr: false });

const navigation = [
  { name: "Overview", href: "/dashboard/overview", icon: OverviewIcon },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: SubscriptionsIcon },
  { name: "Analytics", href: "/dashboard/analytics", icon: AnalyticsIcon },
  { name: "AI Insights", href: "/dashboard/ai-insights", icon: InsightsIcon },
  { name: "Notifications", href: "/dashboard/notifications", icon: NotificationsIcon },
  { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

function DashboardHeader() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load read/dismissed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const read = localStorage.getItem('readNotifications');
      const dismissed = localStorage.getItem('dismissedNotifications');
      if (read) setReadNotifications(new Set(JSON.parse(read)));
      if (dismissed) setDismissedNotifications(new Set(JSON.parse(dismissed)));
    }
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (user?.id) {
      const fetchNotifications = async () => {
        try {
          const response = await fetch('/api/notifications');
          if (response.ok) {
            const data = await response.json();
            // Filter out dismissed notifications and mark read ones
            const filtered = data.notifications
              .filter((n: any) => !dismissedNotifications.has(n.id))
              .map((n: any) => ({
                ...n,
                isRead: readNotifications.has(n.id) || n.isRead
              }));
            setNotifications(filtered);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      };
      fetchNotifications();
    }
  }, [user?.id, dismissedNotifications, readNotifications]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    const newRead = new Set(readNotifications);
    newRead.add(notificationId);
    setReadNotifications(newRead);
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(newRead)));
    
    // Update local state
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ));

    // Call API (for future database storage)
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' })
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(notificationId);
    setDismissedNotifications(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify(Array.from(newDismissed)));
    
    // Remove from local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Call API (for future database storage)
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  // Generate initials from user's name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const userName = user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User';
  const userEmail = user?.emailAddresses[0]?.emailAddress || '';
  const userInitials = getInitials(user?.fullName || user?.firstName || undefined);
  const userImage = user?.imageUrl;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="border-b border-[#172238] bg-[#0c172d]/70 backdrop-blur relative z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-5 ml-auto">
          <NotificationCenter 
            notifications={notifications} 
            onMarkAsRead={handleMarkAsRead} 
            onDismiss={handleDismiss} 
          />
          <div className="relative z-[9999]" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 rounded-full border border-[#1c2842] bg-[#111d33] px-3 py-2 hover:bg-[#1a2538] transition-colors cursor-pointer relative z-[9999]"
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="h-9 w-9 rounded-full object-cover border border-[#ff8b3d]"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8b3d] to-[#ff6d2f] text-sm font-bold text-[#041024]">
                  {userInitials}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{userName}</p>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#1c2842] bg-[#0d182d] shadow-[0_20px_45px_-35px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-[#172238]">
                  <p className="text-sm font-semibold text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-400 truncate mt-1">{userEmail}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-[#141f34] hover:text-white transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-[#141f34] hover:text-white transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>

                {/* Sign Out Button */}
                <div className="border-t border-[#172238] p-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#040b18] text-slate-100 relative">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0d182d',
              color: '#e2e8f0',
              border: '1px solid #1b2740',
            },
            success: {
              iconTheme: {
                primary: '#34d399',
                secondary: '#0d182d',
              },
            },
            error: {
              iconTheme: {
                primary: '#fb7185',
                secondary: '#0d182d',
              },
            },
          }}
        />
        <div className="flex min-h-screen relative">
          <aside className="hidden lg:flex w-72 flex-col border-r border-[#172238] bg-gradient-to-b from-[#0b1527] via-[#0d1a32] to-[#081020] relative z-10">
            <div className="px-6 pt-7 pb-4">
              <Link href="/dashboard" className="text-2xl font-semibold tracking-tight text-[#ff8b3d]">
                SubscriptionSentry
              </Link>
              <p className="mt-2 text-xs text-slate-400">Stay on top of renewals, trends, and spend.</p>
            </div>
            <nav className="flex-1 space-y-1 px-3">
              {navigation.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-[#ff8b3d]/90 via-[#ff6d2f]/80 to-transparent text-white shadow-[0_18px_30px_-20px_rgba(255,109,47,0.85)]"
                        : "text-slate-300 hover:text-white hover:bg-[#141f34]"
                    }`}
                  >
                    <item.icon active={active} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="px-6 pb-8">
              <div className="rounded-xl border border-[#1b2740] bg-[#101a2f]/70 p-4">
                <p className="text-sm font-semibold text-white">Need more power?</p>
                <p className="mt-1 text-xs text-slate-400">
                  Upgrade to unlock AI budgeting, forecasting, and workflow automation.
                </p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#ff8b3d] px-3 py-2 text-xs font-semibold text-[#041024] hover:bg-[#ffa056]"
                >
                  View plans
                </Link>
              </div>
            </div>
          </aside>

          <main className="flex-1 bg-[#071121] relative z-0">
            <DashboardHeader />
            <div className="mx-auto w-full max-w-7xl px-6 py-8 relative z-0">{children}</div>
          </main>
        </div>
      </div>
  );
}

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-white" : "text-[#ff8b3d] group-hover:text-white"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-7L9 5H6a2 2 0 00-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8" />
    </svg>
  );
}

function SubscriptionsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-white" : "text-[#ff8b3d] group-hover:text-white"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l-2 2m0 0l-2-2 2-2m0 2h10a2 2 0 012 2v11a2 2 0 01-2 2H9z"
      />
    </svg>
  );
}

function AnalyticsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-white" : "text-[#ff8b3d] group-hover:text-white"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-3-3m0 0l3-3m-3 3h10m4-6h-4a2 2 0 01-2-2V4" />
    </svg>
  );
}

function InsightsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-white" : "text-[#ff8b3d] group-hover:text-white"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5a7 7 0 100 14c3.866 0 7-3.134 7-7m-7 7v3m0-20v3m-7 7H1m20 0h-3"
      />
    </svg>
  );
}

function NotificationsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-white" : "text-[#ff8b3d] group-hover:text-white"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-5 5v-5zM19 8v6a2 2 0 002 2H5a2 2 0 01-2-2V8"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8V6a5 5 0 019.584-1.67" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-white" : "text-[#ff8b3d] group-hover:text-white"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-1.14 1.978-1.14 2.278 0l.198.75a1 1 0 00.95.69h.764c1.18 0 1.667 1.507.588 2.2l-.651.422a1 1 0 00-.416 1.118l.184.757c.285 1.166-.998 2.036-1.986 1.356l-.638-.425a1 1 0 00-1.11 0l-.638.425c-.988.68-2.27-.19-1.986-1.356l.184-.757a1 1 0 00-.416-1.118l-.651-.422c-1.079-.693-.592-2.2.588-2.2h.764a1 1 0 00.95-.69l.198-.75z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v7" />
    </svg>
  );
}
