import React from 'react';
import { Menu, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function Navbar({ pageTitle, pageSubtitle, backendStatus, onOpenMobile, onReplan, replanning }) {
  return (
    <header className="sf-header sticky top-0 z-20 px-4 sm:px-6 h-14 flex items-center gap-3">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-slate-800 truncate leading-tight">{pageTitle}</h1>
        {pageSubtitle && (
          <p className="text-xs text-slate-400 truncate leading-tight hidden sm:block">{pageSubtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onReplan && (
          <button
            className="sf-btn sf-btn-secondary text-xs hidden sm:flex"
            onClick={onReplan}
            disabled={replanning}
            aria-label="Replan my study day"
          >
            <RefreshCw size={14} className={replanning ? 'animate-spin' : ''} />
            {replanning ? 'Replanning…' : 'Replan Day'}
          </button>
        )}

        {/* Backend status indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
            backendStatus === 'online'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-slate-400 bg-slate-100'
          }`}
          title={backendStatus === 'online' ? 'Server connected' : 'Server offline'}
        >
          {backendStatus === 'online'
            ? <Wifi size={13} />
            : <WifiOff size={13} />
          }
          <span className="hidden sm:inline">{backendStatus === 'online' ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
