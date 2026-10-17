import React, { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Calendar, Timer, Wind,
  Activity, Bot, Settings, ChevronLeft, ChevronRight,
  BookOpen, Menu, X, Zap, AlertCircle
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'tasks',        label: 'Tasks',            icon: CheckSquare },
  { id: 'schedule',     label: 'Study Schedule',   icon: Calendar },
  { id: 'focus',        label: 'Focus Timer',      icon: Timer },
  { id: 'breaks',       label: 'Breaks & Wellness',icon: Wind },
  { id: 'checkins',     label: 'Stress & Focus',   icon: Activity },
  { id: 'progress',     label: 'Progress',         icon: Zap },
  { id: 'assistant',    label: 'AI Assistant',     icon: Bot },
  { id: 'settings',     label: 'Settings',         icon: Settings },
];

export default function Sidebar({ activePage, setActivePage, workloadSeverity, mobileOpen, setMobileOpen }) {
  const [collapsed, setCollapsed] = useState(false);

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;
    return (
      <button
        className={`sf-sidebar-item ${isActive ? 'active' : ''}`}
        onClick={() => { setActivePage(item.id); setMobileOpen(false); }}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.id === 'dashboard' && workloadSeverity === 'high' && (
          <AlertCircle size={14} className="ml-auto text-red-400" />
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="sf-sidebar flex flex-col h-full" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shrink-0 shadow-lg">
          <BookOpen size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-tight">StudyFlow AI</div>
            <div className="text-white/40 text-[10px] font-medium leading-tight mt-0.5">Study smarter, not harder</div>
          </div>
        )}
        <button
          className="ml-auto text-white/30 hover:text-white/70 transition-colors hidden lg:flex"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        {!collapsed && (
          <p className="text-white/25 text-[10px] leading-relaxed">
            All scheduling is deterministic.<br />
            AI assistance is optional.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col">
            <button
              className="absolute top-4 right-4 text-white/50 hover:text-white z-10"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
