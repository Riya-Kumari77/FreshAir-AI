import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  CalendarClock,
  Home,
  Leaf,
  User,
  MapPin,
  RefreshCw,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import type { AppTab, LanguageCode, LocationInfo } from '../types/freshair';

interface LayoutShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  location: LocationInfo;
  onOpenLocationPicker: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  savedCount: number;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  labelHi: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Assistant', labelHi: 'AI सहायक', icon: MessageSquare },
  { id: 'planner', label: 'Daily Planner', labelHi: 'दैनिक योजना', icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Air', labelHi: 'इनडोर वायु', icon: Home },
  { id: 'sustainability', label: 'Sustainability', labelHi: 'स्थिरता ट्रैकर', icon: Leaf },
  { id: 'profile', label: 'Profile', labelHi: 'प्रोफ़ाइल', icon: User },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeTab,
  onSelectTab,
  location,
  onOpenLocationPicker,
  onRefreshData,
  isRefreshing,
  language,
  onChangeLanguage,
  savedCount,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const handleNavClick = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[#E2E8E4]">
      <div className="flex h-16 items-center justify-between px-5 border-b border-[#E2E8E4]">
        <button
          type="button"
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F766E] text-white shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 14.5C7.5 14.5 9.5 12 13 12C16.5 12 18.5 9.5 20 7.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              <path
                d="M4 18.5C8 18.5 10.5 16.5 14.5 16.5C17.5 16.5 19.5 15 20.5 13.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                opacity="0.72"
              />
              <path
                d="M5 10.5C8 10.5 10 8.5 12.5 5.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight text-[#0F1F1C] whitespace-nowrap">
            FreshAir-AI
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 text-[#526460] hover:text-[#0F1F1C] rounded-md"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                isActive
                  ? 'bg-[#0F766E]/10 text-[#0F766E]'
                  : 'text-[#445652] hover:bg-[#F3F6F4] hover:text-[#0F1F1C]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{language === 'hi' ? item.labelHi : item.label}</span>
              </span>
              {item.id === 'profile' && savedCount > 0 && (
                <span className="font-mono text-xs tabular-nums text-[#526460]">{savedCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#E2E8E4] p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-[#526460] mb-1.5">
            {language === 'hi' ? 'भाषा चुनें' : 'Language'}
          </p>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F2F5F3]">
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'en'
                  ? 'bg-white text-[#0F1F1C] shadow-xs'
                  : 'text-[#526460] hover:text-[#0F1F1C]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('hi')}
              className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'hi'
                  ? 'bg-white text-[#0F1F1C] shadow-xs'
                  : 'text-[#526460] hover:text-[#0F1F1C]'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-[#EDF1EE] text-xs text-[#526460] space-y-0.5">
          <p className="font-medium text-[#0F1F1C] truncate">{location.name}</p>
          <p className="font-mono tabular-nums text-[11px] text-[#647571]">
            {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F8F7] text-[#0F1F1C]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0F766E] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0F1F1C]/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb Left — Location & Primary Action Right */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E2E8E4] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#445652] hover:text-[#0F1F1C] rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#647571] whitespace-nowrap">FreshAir-AI</span>
              <span className="hidden sm:inline text-[#B4C0BA]" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-semibold text-[#0F1F1C] truncate">
                {language === 'hi' ? currentNav.labelHi : currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-[#0F1F1C] bg-[#F4F7F5] hover:bg-[#EAEFEA] border border-[#DCE3DF] rounded-lg transition-colors whitespace-nowrap max-w-[190px] sm:max-w-[260px]"
            >
              <MapPin className="h-4 w-4 text-[#0F766E] shrink-0" />
              <span className="truncate">
                {location.name}
                {location.country ? `, ${location.country}` : ''}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#647571] shrink-0" />
            </button>

            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing
                  ? language === 'hi'
                    ? 'अपडेट हो रहा है'
                    : 'Updating'
                  : language === 'hi'
                    ? 'डेटा रिफ्रेश करें'
                    : 'Refresh Data'}
              </span>
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-[#E2E8E4] bg-white px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#647571]">
            <p>
              FreshAir-AI · Environmental data sourced from Open-Meteo APIs · Informational guidance only, not medical advice.
            </p>
            <p className="whitespace-nowrap">PromptWars Virtual – Challenge 6</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
