import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/AriSidebar.jsx';
import Navbar from './components/AriNavbar.jsx';
import TradeDetailModal from './components/TradeDetailModal.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';

import DashboardPage from './pages/AriDashboardPage.jsx';
import AddTradePage from './pages/AddTradePage.jsx';
import TradeHistoryPage from './pages/TradeHistoryPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AIAssistantPage from './pages/AriAIAssistantPage.jsx';
import PsychologyPage from './pages/PsychologyPage.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';
import SettingsPage from './pages/AriSettingsPage.jsx';

import { api } from './utils/api.js';
import { calculatePerformanceSummary, filterTrades, computeTradeMetrics } from './utils/calculations.js';
import { DEFAULT_STRATEGIES, DEFAULT_MARKETS, DEFAULT_RISK_SETTINGS } from './data/defaultStrategies.js';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline'

  // Application Data States
  const [trades, setTrades] = useState([]);
  const [strategies, setStrategies] = useState(DEFAULT_STRATEGIES);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_RISK_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Editing & Modal States
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });
  const [exclusionModal, setExclusionModal] = useState({
    isOpen: false,
    trade: null,
    reason: '',
  });

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Global Filters
  const [filters, setFilters] = useState({
    market: 'ALL',
    strategy: 'ALL',
    tradeType: 'ALL',
    direction: 'ALL',
    outcome: 'ALL',
    ruleCompliant: 'ALL',
    recordStatus: 'ALL',
    startDate: '',
    endDate: '',
    search: '',
  });

  // Initial Data Load
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const health = await api.checkHealth();
        setBackendStatus(health.status);

        const [loadedTrades, loadedStrats, loadedReviews, loadedSettings] = await Promise.all([
          api.getTrades(),
          api.getStrategies(),
          api.getReviews(),
          api.getSettings(),
        ]);

        setTrades(loadedTrades.map(computeTradeMetrics));
        setStrategies(loadedStrats);
        setReviews(loadedReviews);
        setSettings(loadedSettings);
      } catch (err) {
        console.error('Initialization error:', err);
        setBackendStatus('offline');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Performance Summary driven strictly by shared calculation engine
  const performanceSummary = useMemo(() => {
    return calculatePerformanceSummary(trades, filters);
  }, [trades, filters]);

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    return filterTrades(trades, filters);
  }, [trades, filters]);

  // Handlers for Trades
  const handleSaveTrade = async (tradeData) => {
    try {
      const computed = computeTradeMetrics(tradeData);
      if (computed.id && trades.some(t => t.id === computed.id)) {
        // Update existing
        await api.updateTrade(computed.id, computed);
        setTrades(prev => prev.map(t => (t.id === computed.id ? computed : t)));
        showToast(`Trade ${computed.id} updated successfully.`);
      } else {
        // Create new
        const saved = await api.createTrade(computed);
        const savedWithMetrics = computeTradeMetrics(saved);
        setTrades(prev => [savedWithMetrics, ...prev]);
        showToast(`Trade ${savedWithMetrics.id} recorded successfully.`);
      }
      setEditingTrade(null);
      setActivePage('history');
    } catch (err) {
      showToast('Failed to save trade record.', 'error');
    }
  };

  const handleDeleteTrade = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Trade Record',
      message: `Are you sure you want to permanently delete trade record ${id}? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteTrade(id);
          setTrades(prev => prev.filter(t => t.id !== id));
          if (selectedTrade?.id === id) setSelectedTrade(null);
          showToast(`Trade ${id} deleted.`);
        } catch {
          showToast('Failed to delete trade.', 'error');
        } finally {
          setConfirmDialog(p => ({ ...p, isOpen: false }));
        }
      }
    });
  };

  const handlePromptExclusion = (trade) => {
    setExclusionModal({
      isOpen: true,
      trade: trade,
      reason: trade.exclusionReason || 'Non-trading test order / Platform connectivity error',
    });
  };

  const handleConfirmExclusion = async () => {
    if (!exclusionModal.reason.trim()) {
      alert('An explicit exclusion reason is required according to blueprint audit rules.');
      return;
    }

    const updated = {
      ...exclusionModal.trade,
      recordStatus: 'excluded',
      exclusionReason: exclusionModal.reason,
    };

    try {
      await api.updateTrade(updated.id, updated);
      setTrades(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      if (selectedTrade?.id === updated.id) setSelectedTrade(updated);
      showToast(`Trade ${updated.id} marked as excluded.`);
    } catch {
      showToast('Failed to update exclusion status.', 'error');
    } finally {
      setExclusionModal({ isOpen: false, trade: null, reason: '' });
    }
  };

  const handleSaveReview = async (reviewData) => {
    try {
      const saved = await api.saveReview(reviewData);
      setReviews(prev => [saved, ...prev]);
      showToast('Review audit saved to persistent records.');
    } catch {
      showToast('Failed to save review.', 'error');
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const saved = await api.saveSettings(newSettings);
      setSettings(saved);
      showToast('Settings updated.');
    } catch {
      showToast('Failed to update settings.', 'error');
    }
  };

  const handleAddStrategy = async (newStrat) => {
    try {
      const saved = await api.saveStrategy(newStrat);
      setStrategies(prev => [...prev, saved]);
      showToast(`Strategy ${saved.name} added.`);
    } catch {
      showToast('Failed to add strategy.', 'error');
    }
  };

  const handleResetDemoData = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset to Blueprint Demo Trades',
      message: 'This will reset your journal to the 18 verified institutional Bitcoin and Gold demo records. Continue?',
      isDestructive: false,
      onConfirm: async () => {
        try {
          await api.resetDemoData();
          const [loadedTrades, loadedStrats] = await Promise.all([
            api.getTrades(),
            api.getStrategies(),
          ]);
          setTrades(loadedTrades.map(computeTradeMetrics));
          setStrategies(loadedStrats);
          showToast('Loaded 18 verified blueprint demo trades.');
        } catch {
          showToast('Failed to reset demo data.', 'error');
        } finally {
          setConfirmDialog(p => ({ ...p, isOpen: false }));
        }
      }
    });
  };

  const handleClearAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Wipe All Journal Records',
      message: 'Are you sure you want to delete ALL trades? This clears all records from the database.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.restoreBackup({ trades: [], strategies: DEFAULT_STRATEGIES, reviews: [] });
          setTrades([]);
          setReviews([]);
          showToast('All journal records cleared.');
        } catch {
          showToast('Failed to clear records.', 'error');
        } finally {
          setConfirmDialog(p => ({ ...p, isOpen: false }));
        }
      }
    });
  };

  const handleRestoreBackup = async (backupJson) => {
    try {
      await api.restoreBackup(backupJson);
      if (backupJson.trades) setTrades(backupJson.trades.map(computeTradeMetrics));
      if (backupJson.strategies) setStrategies(backupJson.strategies);
      if (backupJson.reviews) setReviews(backupJson.reviews);
      if (backupJson.settings) setSettings(backupJson.settings);
      showToast(`Restored backup with ${backupJson.trades?.length || 0} trades.`);
    } catch {
      showToast('Failed to restore backup.', 'error');
    }
  };

  // Page Title mapping
  const getPageInfo = () => {
    switch (activePage) {
      case 'dashboard':
        return { title: 'Trading Performance Dashboard', subtitle: 'At-a-glance performance, equity curve, and outcome distribution' };
      case 'add-trade':
        return { title: editingTrade ? 'Edit Trade Record' : 'Record New Trade', subtitle: 'Fast capture workflow with live mathematical calculation audit' };
      case 'history':
        return { title: 'Trade History & Records', subtitle: 'Searchable, filterable audit log with execution prices, R-multiples and costs' };
      case 'analytics':
        return { title: 'Institutional Performance Analytics', subtitle: 'Drawdown curve, R distribution, strategy comparisons, and discipline matrix' };
      case 'assistant':
        return { title: 'AI Trading Assistant', subtitle: 'Understand your saved journal with scoped, informational analysis' };
      case 'psychology':
        return { title: 'Trading Psychology & Discipline', subtitle: 'Emotion tracking, impulsive/revenge flags, and empirical lessons learned' };
      case 'reviews':
        return { title: 'Periodic Reviews & Audits', subtitle: '10-trade micro audit and 100-trade milestone review workflows' };
      case 'settings':
        return { title: 'Platform Settings & Rules', subtitle: 'Strategy versions, risk limits, persistence engine, and backups' };
      default:
        return { title: 'Ari Trading Journal', subtitle: '' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-glow-radial text-slate-800 flex flex-col antialiased selection:bg-blue-500/20 selection:text-blue-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-60 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl glass-panel shadow-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'border-rose-200 text-rose-800 bg-rose-50/95 shadow-rose-500/10'
              : 'border-emerald-200 text-emerald-800 bg-emerald-50/95 shadow-emerald-500/10'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={(page) => {
          setEditingTrade(null);
          setActivePage(page);
        }}
        tradeStats={performanceSummary}
        backendStatus={backendStatus}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenAddTrade={() => {
          setEditingTrade(null);
          setActivePage('add-trade');
        }}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Navbar */}
        <Navbar
          pageTitle={pageInfo.title}
          pageSubtitle={pageInfo.subtitle}
          backendStatus={backendStatus}
          filters={filters}
          setFilters={setFilters}
          strategies={strategies}
          sampleSize={performanceSummary.sampleSize}
          excludedCount={performanceSummary.excludedCount}
          onOpenAddTrade={() => {
            setEditingTrade(null);
            setActivePage('add-trade');
          }}
          onExportCsv={() => api.downloadCsv()}
          setMobileOpen={setMobileOpen}
        />

        {/* Page Routing */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Initializing institutional journal database...</p>
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardPage
                  summary={performanceSummary}
                  filteredTrades={filteredTrades}
                  filters={filters}
                  setFilters={setFilters}
                  onOpenTradeDetail={(trade) => setSelectedTrade(trade)}
                  onOpenAddTrade={() => {
                    setEditingTrade(null);
                    setActivePage('add-trade');
                  }}
                />
              )}

              {activePage === 'add-trade' && (
                <AddTradePage
                  initialData={editingTrade}
                  strategies={strategies}
                  markets={DEFAULT_MARKETS}
                  onSaveTrade={handleSaveTrade}
                  onCancel={() => {
                    setEditingTrade(null);
                    setActivePage('history');
                  }}
                />
              )}

              {activePage === 'history' && (
                <TradeHistoryPage
                  trades={trades}
                  strategies={strategies}
                  onOpenTradeDetail={(trade) => setSelectedTrade(trade)}
                  onEditTrade={(trade) => {
                    setEditingTrade(trade);
                    setActivePage('add-trade');
                  }}
                  onDeleteTrade={handleDeleteTrade}
                  onExcludeTrade={handlePromptExclusion}
                  onExportCsv={() => api.downloadCsv()}
                  onOpenAddTrade={() => {
                    setEditingTrade(null);
                    setActivePage('add-trade');
                  }}
                />
              )}

              {activePage === 'analytics' && (
                <AnalyticsPage
                  summary={performanceSummary}
                  trades={trades}
                  strategies={strategies}
                />
              )}

              {activePage === 'assistant' && <AIAssistantPage />}

              {activePage === 'psychology' && (
                <PsychologyPage trades={trades} />
              )}

              {activePage === 'reviews' && (
                <ReviewsPage
                  trades={trades}
                  savedReviews={reviews}
                  onSaveReview={handleSaveReview}
                />
              )}

              {activePage === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  strategies={strategies}
                  onAddStrategy={handleAddStrategy}
                  onResetDemoData={handleResetDemoData}
                  onClearAllData={handleClearAllData}
                  onRestoreBackup={handleRestoreBackup}
                  backendStatus={backendStatus}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={Boolean(selectedTrade)}
        onClose={() => setSelectedTrade(null)}
        onEdit={(trade) => {
          setSelectedTrade(null);
          setEditingTrade(trade);
          setActivePage('add-trade');
        }}
        onDelete={(id) => {
          setSelectedTrade(null);
          handleDeleteTrade(id);
        }}
        onExclude={(trade) => {
          setSelectedTrade(null);
          handlePromptExclusion(trade);
        }}
      />

      {/* Safe Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
        isDestructive={confirmDialog.isDestructive}
      />

      {/* Exclusion Reason Modal (Required by Blueprint: "Never silently remove a trade from calculations. Make exclusions and their reasons visible.") */}
      {exclusionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-200/80 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Exclude Trade from Statistics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              According to blueprint integrity rules, excluding a trade from headline metrics requires an explicit recorded reason so your audit trail remains trustworthy.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Exclusion <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Connectivity disconnect during order execution; fat-finger position size; or test order."
                value={exclusionModal.reason}
                onChange={(e) => setExclusionModal(p => ({ ...p, reason: e.target.value }))}
                className="w-full glass-input text-xs p-3 rounded-xl text-slate-900"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setExclusionModal({ isOpen: false, trade: null, reason: '' })}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExclusion}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Confirm Exclusion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
