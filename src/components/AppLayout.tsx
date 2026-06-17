"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Layers,
  ClipboardList,
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Palette,
  Check,
  Menu,
  X,
  Plus
} from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  class: string;
  primaryColor: string;
  bgPreview: string;
}

const THEMES: Theme[] = [
  { id: 'alabaster', name: 'Alabaster Light', class: 'theme-alabaster', primaryColor: '#0f172a', bgPreview: 'bg-[#ffffff]' },
  { id: 'space-cadet', name: 'Space Cadet', class: 'theme-space-cadet', primaryColor: '#6366f1', bgPreview: 'bg-[#0f172a]' },
  { id: 'cyberpunk', name: 'Cyberpunk Glow', class: 'theme-cyberpunk', primaryColor: '#ec4899', bgPreview: 'bg-[#121217]' },
  { id: 'emerald', name: 'Emerald Forest', class: 'theme-emerald', primaryColor: '#10b981', bgPreview: 'bg-[#081714]' },
  { id: 'nebula', name: 'Nebula Fusion', class: 'theme-nebula', primaryColor: '#a855f7', bgPreview: 'bg-[#120a24]' },
  { id: 'sunset', name: 'Sunset Flare', class: 'theme-sunset', primaryColor: '#f97316', bgPreview: 'bg-[#1d100b]' },
  { id: 'gold', name: 'Midnight Gold', class: 'theme-gold', primaryColor: '#eab308', bgPreview: 'bg-[#17150e]' }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTheme, setActiveTheme] = useState('theme-alabaster');
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasActiveApplication, setHasActiveApplication] = useState(false);

  // Sync state with localStorage on mount
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('aijf_theme') || 'theme-alabaster';
      setActiveTheme(storedTheme);
      
      const resume = localStorage.getItem('resumeText');
      const jd = localStorage.getItem('jobDescription');
      setHasActiveApplication(!!(resume && jd));
    } catch (e) {
      console.error(e);
    }
  }, [pathname]);

  const handleThemeChange = (themeClass: string) => {
    try {
      const root = document.documentElement;
      THEMES.forEach(t => root.classList.remove(t.class));
      root.classList.add(themeClass);
      localStorage.setItem('aijf_theme', themeClass);
      setActiveTheme(themeClass);
    } catch (e) {
      console.error(e);
    }
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: hasActiveApplication ? '/dashboard' : '/apply',
      icon: Layers,
      match: ['/dashboard']
    },
    {
      name: 'Apply Wizard',
      href: '/apply',
      icon: Plus,
      match: ['/apply']
    },
    {
      name: 'Job Tracker',
      href: '/tracker',
      icon: ClipboardList,
      match: ['/tracker']
    },
    {
      name: 'History',
      href: '/history',
      icon: History,
      match: ['/history']
    },
    {
      name: 'AI Coach & Finder',
      href: '/chat',
      icon: MessageSquare,
      match: ['/chat']
    }
  ];

  const isActive = (item: typeof navigationItems[0]) => {
    return item.match.some(m => pathname.startsWith(m));
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main flex flex-col md:flex-row transition-all duration-300">
      
      {/* ── MOBILE HEADER ────────────────────────────────────────────────────── */}
      <header className="md:hidden flex h-16 items-center justify-between px-6 bg-bg-card/70 backdrop-blur-md border-b border-border-custom/40 sticky top-0 z-40 shadow-sm">
        <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight">
          <Sparkles className="w-4.5 h-4.5 text-primary" />
          <span>AI Job Factory</span>
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowThemePanel(!showThemePanel)}
            className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-bg-main transition-all"
            title="Theme Palette"
          >
            <Palette className="w-4.5 h-4.5" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-bg-main transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── MOBILE DRAWER NAVIGATION ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-bg-card border-r border-border-custom/50 flex flex-col p-6 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight" onClick={() => setMobileMenuOpen(false)}>
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <span>AI Job Factory</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5">
              {navigationItems.map(item => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                      active 
                        ? 'bg-primary text-bg-card border-transparent shadow-custom-card' 
                        : 'text-text-muted hover:text-text-main hover:bg-bg-main border-transparent'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-6 border-t border-border-custom/40 flex flex-col gap-2">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Workspace Mode</span>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-xs text-text-muted hover:text-text-main font-semibold">
                ← Exit to Home
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-bg-card border-r border-border-custom/30 shadow-custom-card transition-all duration-300 relative z-25 ${collapsed ? 'w-20' : 'w-64'}`}>
        
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-bg-card border border-border-custom/50 flex items-center justify-center text-text-muted hover:text-text-main shadow-md hover:scale-110 active:scale-95 transition-all z-35"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Logo Section */}
        <div className={`h-16 flex items-center border-b border-border-custom/30 px-6 overflow-hidden flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight select-none">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_8px_var(--glow)]">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && <span className="animate-in fade-in duration-300">AI Job Factory</span>}
          </Link>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 py-2.5 rounded-2xl transition-all border ${
                  collapsed ? 'justify-center px-0' : 'px-4'
                } ${
                  active
                    ? 'bg-primary text-bg-card border-transparent shadow-custom-card font-extrabold'
                    : 'text-text-muted hover:text-text-main hover:bg-bg-main/60 border-transparent hover:border-border-custom/10'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-bold animate-in fade-in duration-300">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Panel: Theme + Home Link */}
        <div className="p-4 border-t border-border-custom/30 flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setShowThemePanel(!showThemePanel)}
            className={`flex items-center gap-3 py-2 rounded-2xl text-text-muted hover:text-text-main hover:bg-bg-main/60 transition-all border border-transparent ${
              collapsed ? 'justify-center px-0' : 'px-4'
            }`}
            title="Switch Themes"
          >
            <Palette className="w-4.5 h-4.5 text-primary" />
            {!collapsed && <span className="text-xs font-bold animate-in fade-in duration-300">Switch Theme</span>}
          </button>

          {!collapsed && (
            <Link 
              href="/"
              className="px-4 py-1.5 text-[10px] text-text-muted hover:text-text-main transition-colors animate-in fade-in duration-300 font-bold"
            >
              ← Back to Landing Page
            </Link>
          )}
        </div>
      </aside>

      {/* ── THEME PALETTE OVERLAY PANEL ────────────────────────────────────────── */}
      {showThemePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowThemePanel(false)} />
          <div className="relative w-full max-w-sm bg-bg-card border border-border-custom/50 rounded-3xl p-6 shadow-custom-card animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center gap-2 text-text-main">
                <Palette className="w-5 h-5 text-primary" />
                Select Theme Style
              </h3>
              <button onClick={() => setShowThemePanel(false)} className="text-text-muted hover:text-text-main p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.class)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    activeTheme === theme.class
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border-custom bg-bg-main hover:border-slate-400'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {activeTheme === theme.class && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                  <span className="text-xs font-bold text-text-main">{theme.name}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowThemePanel(false)}
              className="mt-6 w-full bg-primary hover:bg-primary-hover text-bg-card font-extrabold py-2.5 rounded-2xl transition-all shadow-sm"
            >
              Apply Style
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CANVAS ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

    </div>
  );
}
