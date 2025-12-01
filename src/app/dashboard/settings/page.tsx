'use client';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';

type SettingsTab = 'profile' | 'accounts' | 'security' | 'preferences' | 'data';

export default function SettingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || user?.firstName || '',
    email: user?.emailAddresses[0]?.emailAddress || '',
    timezone: 'America/New_York',
    currency: 'USD',
  });
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.fullName,
          timezone: profileData.timezone,
          currency: profileData.currency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      
      // Profile updated successfully

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: ProfileIcon },
    { id: 'accounts' as SettingsTab, label: 'Accounts', icon: AccountsIcon },
    { id: 'security' as SettingsTab, label: 'Security', icon: SecurityIcon },
    { id: 'preferences' as SettingsTab, label: 'Preferences', icon: PreferencesIcon },
    { id: 'data' as SettingsTab, label: 'Data', icon: DataIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account preferences and notifications</p>
      </div>

      <div className="rounded-2xl border border-[#18253d] bg-[#0d182d] shadow-[0_20px_45px_-35px_rgba(12,25,46,0.9)] overflow-hidden">
        <div className="flex min-h-[600px]">
          {/* Left Sub-navigation */}
          <div className="w-64 border-r border-[#172238] bg-[#0a1424] p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ff8b3d]/90 via-[#ff6d2f]/80 to-transparent text-white shadow-[0_4px_12px_-4px_rgba(255,139,61,0.5)]'
                        : 'text-slate-400 hover:text-white hover:bg-[#141f34]'
                    }`}
                  >
                    <tab.icon active={isActive} />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-[#ff8b3d]"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8">
            {activeTab === 'profile' && (
              <ProfileSection
                profileData={profileData}
                setProfileData={setProfileData}
                userInitials={getInitials(user?.fullName || user?.firstName)}
                userImage={user?.imageUrl}
                onSave={handleSave}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'accounts' && <AccountsSection />}
            {activeTab === 'security' && <SecuritySection />}
            {activeTab === 'preferences' && <PreferencesSection />}
            {activeTab === 'data' && <DataSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({
  profileData,
  setProfileData,
  userInitials,
  userImage,
  onSave,
  isSaving,
}: {
  profileData: any;
  setProfileData: any;
  userInitials: string;
  userImage?: string | null;
  onSave: () => void;
  isSaving: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userImage || null);
  const [isUploading, setIsUploading] = useState(false);

  // Update preview when userImage changes
  useEffect(() => {
    setAvatarPreview(userImage || null);
  }, [userImage]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      setAvatarPreview(data.image);
      
      // Reload page to refresh avatar in header
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
      setAvatarPreview(userImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8b3d]/20 text-[#ff8b3d]">
          <ProfileIcon active={true} />
        </div>
        <h2 className="text-xl font-semibold text-white">Profile Information</h2>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-4 pb-6 border-b border-[#172238]">
        <div className="relative">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover border-2 border-[#ff8b3d]"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8b3d] to-[#ff6d2f] text-2xl font-bold text-[#041024]">
              {userInitials}
            </div>
          )}
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0d182d] bg-[#ff8b3d]">
            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="text-sm font-medium text-[#ff8b3d] hover:text-[#ffa056] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Change Avatar'}
          </button>
          <p className="text-xs text-slate-500">JPG, PNG or GIF (max 5MB)</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
          <input
            type="text"
            className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#ff8b3d] focus:outline-none focus:ring-1 focus:ring-[#ff8b3d]"
            value={profileData.fullName}
            onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
          <input
            type="email"
            className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#ff8b3d] focus:outline-none focus:ring-1 focus:ring-[#ff8b3d]"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            placeholder="Enter your email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Timezone</label>
          <select
            className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-sm text-white focus:border-[#ff8b3d] focus:outline-none focus:ring-1 focus:ring-[#ff8b3d]"
            value={profileData.timezone}
            onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="America/Anchorage">Alaska Time</option>
            <option value="Pacific/Honolulu">Hawaii Time</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Currency</label>
          <select
            className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-sm text-white focus:border-[#ff8b3d] focus:outline-none focus:ring-1 focus:ring-[#ff8b3d]"
            value={profileData.currency}
            onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CAD">CAD ($)</option>
            <option value="AUD">AUD ($)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-[#172238]">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-3 bg-[#ff8b3d] text-[#041024] rounded-lg font-semibold hover:bg-[#ffa056] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function AccountsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8b3d]/20 text-[#ff8b3d]">
          <AccountsIcon active={true} />
        </div>
        <h2 className="text-xl font-semibold text-white">Connected Accounts</h2>
      </div>
      <p className="text-slate-400">Manage your connected bank accounts and payment methods.</p>
      <div className="rounded-lg border border-[#1b2740] bg-[#0a1424] p-6">
        <p className="text-sm text-slate-400">No accounts connected yet.</p>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8b3d]/20 text-[#ff8b3d]">
          <SecurityIcon active={true} />
        </div>
        <h2 className="text-xl font-semibold text-white">Security Settings</h2>
      </div>
      <p className="text-slate-400">Manage your password and security preferences.</p>
      <div className="space-y-4">
        <button className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-left text-sm text-white hover:bg-[#141f34] transition">
          Change Password
        </button>
        <button className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-left text-sm text-white hover:bg-[#141f34] transition">
          Enable Two-Factor Authentication
        </button>
      </div>
    </div>
  );
}

function PreferencesSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8b3d]/20 text-[#ff8b3d]">
          <PreferencesIcon active={true} />
        </div>
        <h2 className="text-xl font-semibold text-white">Preferences</h2>
      </div>
      <p className="text-slate-400">Customize your notification and display preferences.</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3">
          <span className="text-sm text-white">Email Notifications</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-[#243352] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff8b3d]"></div>
          </label>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3">
          <span className="text-sm text-white">Push Notifications</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-[#243352] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff8b3d]"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

function DataSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff8b3d]/20 text-[#ff8b3d]">
          <DataIcon active={true} />
        </div>
        <h2 className="text-xl font-semibold text-white">Data Management</h2>
      </div>
      <p className="text-slate-400">Export or delete your account data.</p>
      <div className="space-y-4">
        <button className="w-full rounded-lg border border-[#243352] bg-[#101b30] px-4 py-3 text-left text-sm text-white hover:bg-[#141f34] transition">
          Export Data
        </button>
        <button className="w-full rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20 transition">
          Delete Account
        </button>
      </div>
    </div>
  );
}

// Icon Components
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function AccountsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SecurityIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function PreferencesIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DataIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
