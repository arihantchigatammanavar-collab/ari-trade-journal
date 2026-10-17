import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Eye,
  Edit3,
  Trash2,
  Ban,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { formatCurrency, formatR } from '../utils/calculations.js';

export default function TradeHistoryPage({
  trades = [],
  strategies = [],
  onOpenTradeDetail,
  onEditTrade,
  onDeleteTrade,
  onExcludeTrade,
  onExportCsv,
  onOpenAddTrade
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [filterStrategy, setFilterStrategy] = useState('ALL');
  const [filterDirection, setFilterDirection] = useState('ALL');
  const [filterOutcome, setFilterOutcome] = useState('ALL');
  const [filterCompliance, setFilterCompliance] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  // Sorting
  const [sortBy, setSortBy] = useState('date-desc');
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filtered & Sorted Trades
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const m = (trade.market || '').toLowerCase();
        const s = (trade.strategy || '').toLowerCase();
        const id = (trade.id || '').toLowerCase();
        const r = (trade.entryReason || '').toLowerCase();
        const l = (trade.lesson || '').toLowerCase();
        if (!m.includes(q) && !s.includes(q) && !id.includes(q) && !r.includes(q) && !l.includes(q)) {
          return false;
        }
      }

      // Market
      if (filterMarket !== 'ALL') {
        if (!String(trade.market || '').toUpperCase().includes(filterMarket.toUpperCase())) return false;
      }

      // Strategy
      if (filterStrategy !== 'ALL') {
        if (trade.strategy !== filterStrategy) return false;
      }

      // Direction
      if (filterDirection !== 'ALL') {
        if (String(trade.direction).toLowerCase() !== filterDirection.toLowerCase()) return false;
      }

      // Outcome
      if (filterOutcome !== 'ALL') {
        if (String(trade.outcome).toLowerCase() !== filterOutcome.toLowerCase()) return false;
      }

      // Compliance
      if (filterCompliance !== 'ALL') {
        if (String(trade.ruleCompliant).toLowerCase() !== filterCompliance.toLowerCase()) return false;
      }

      // Status
      if (filterStatus !== 'ALL') {
        if (trade.recordStatus !== filterStatus) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.tradeDatetime || b.createdAt) - new Date(a.tradeDatetime || a.createdAt);
      if (sortBy === 'date-asc') return new Date(a.tradeDatetime || a.createdAt) - new Date(b.tradeDatetime || b.createdAt);
      if (sortBy === 'pnl-desc') return (Number(b.netPnL) || 0) - (Number(a.netPnL) || 0);
      if (sortBy === 'pnl-asc') return (Number(a.netPnL) || 0) - (Number(b.netPnL) || 0);
      if (sortBy === 'r-desc') return (Number(b.realisedR) || 0) - (Number(a.realisedR) || 0);
      if (sortBy === 'r-asc') return (Number(a.realisedR) || 0) - (Number(b.realisedR) || 0);
      return 0;
    });
  }, [trades, searchTerm, filterMarket, filterStrategy, filterDirection, filterOutcome, filterCompliance, filterStatus, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-slate-200/80 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, market, strategy, or lesson..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full glass-input text-xs pl-9 pr-4 py-2.5 rounded-xl text-slate-800"
            />
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none glass-input text-xs pl-3 pr-8 py-2 rounded-xl text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                <option value="date-desc" className="bg-white">Newest Date First</option>
                <option value="date-asc" className="bg-white">Oldest Date First</option>
                <option value="pnl-desc" className="bg-white">Highest Net P&L</option>
                <option value="pnl-asc" className="bg-white">Lowest Net P&L</option>
                <option value="r-desc" className="bg-white">Highest Realised R</option>
                <option value="r-asc" className="bg-white">Lowest Realised R</option>
              </select>
              <ArrowUpDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>CSV Export</span>
            </button>

            <button
              onClick={onOpenAddTrade}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <span>+ Add Trade</span>
            </button>
          </div>
        </div>

        {/* Filter Pills / Dropdowns Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200/70 text-xs">
          {/* Market */}
          <select
            value={filterMarket}
            onChange={(e) => { setFilterMarket(e.target.value); setCurrentPage(1); }}
            className="glass-input text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-700 shadow-2xs"
          >
            <option value="ALL" className="bg-white">All Markets</option>
            <option value="BTC" className="bg-white">Bitcoin</option>
            <option value="XAU" className="bg-white">Gold (XAU)</option>
          </select>

          {/* Strategy */}
          <select
            value={filterStrategy}
            onChange={(e) => { setFilterStrategy(e.target.value); setCurrentPage(1); }}
            className="glass-input text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer truncate text-slate-700 shadow-2xs"
          >
            <option value="ALL" className="bg-white">All Strategies</option>
            {strategies.map(s => (
              <option key={s.id} value={s.name} className="bg-white">{s.name}</option>
            ))}
          </select>

          {/* Direction */}
          <select
            value={filterDirection}
            onChange={(e) => { setFilterDirection(e.target.value); setCurrentPage(1); }}
            className="glass-input text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-700 shadow-2xs"
          >
            <option value="ALL" className="bg-white">All Directions</option>
            <option value="Long" className="bg-white">Long Only</option>
            <option value="Short" className="bg-white">Short Only</option>
          </select>

          {/* Outcome */}
          <select
            value={filterOutcome}
            onChange={(e) => { setFilterOutcome(e.target.value); setCurrentPage(1); }}
            className="glass-input text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-700 shadow-2xs"
          >
            <option value="ALL" className="bg-white">All Outcomes</option>
            <option value="win" className="bg-white">Wins Only</option>
            <option value="loss" className="bg-white">Losses Only</option>
            <option value="breakeven" className="bg-white">Breakeven</option>
          </select>

          {/* Compliance */}
          <select
            value={filterCompliance}
            onChange={(e) => { setFilterCompliance(e.target.value); setCurrentPage(1); }}
            className="glass-input text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-700 shadow-2xs"
          >
            <option value="ALL" className="bg-white">All Compliance</option>
            <option value="yes" className="bg-white">Compliant Only</option>
            <option value="no" className="bg-white">Violated Only</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="glass-input text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer text-slate-700 shadow-2xs"
          >
            <option value="ALL" className="bg-white">All Statuses</option>
            <option value="complete" className="bg-white">Complete Records</option>
            <option value="draft" className="bg-white">Drafts Only</option>
            <option value="excluded" className="bg-white">Excluded Only</option>
          </select>
        </div>
      </div>

      {/* Main Trade Records Table */}
      <div className="rounded-2xl glass-card border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Record ID / Time</th>
                <th className="py-3 px-4">Market & Dir</th>
                <th className="py-3 px-4">Strategy & Type</th>
                <th className="py-3 px-4">Entry / Exit</th>
                <th className="py-3 px-4">Size & Risk</th>
                <th className="py-3 px-4">Net P&L</th>
                <th className="py-3 px-4">Realised R</th>
                <th className="py-3 px-4">Discipline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTrades.length > 0 ? (
                paginatedTrades.map((trade) => {
                  const isLong = String(trade.direction).toLowerCase() === 'long';
                  const isWin = trade.outcome === 'win';
                  const isLoss = trade.outcome === 'loss';
                  const isExcluded = trade.recordStatus === 'excluded';
                  const isDraft = trade.recordStatus === 'draft';

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => onOpenTradeDetail(trade)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isExcluded ? 'opacity-70 bg-purple-50/30' : ''
                      }`}
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-600">{trade.id}</div>
                        <div className="text-[10px] text-slate-500">
                          {trade.tradeDatetime ? new Date(trade.tradeDatetime).toLocaleDateString() : 'Draft'}
                        </div>
                      </td>

                      {/* Market & Direction */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{trade.market}</div>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold uppercase mt-0.5 ${
                            isLong ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {trade.direction}
                        </span>
                      </td>

                      {/* Strategy */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium truncate max-w-[140px]">{trade.strategy}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {trade.strategyVersion} · {trade.tradeType}
                        </div>
                      </td>

                      {/* Entry / Exit */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="text-slate-800 font-medium">
                          In: {trade.entryPrice ? Number(trade.entryPrice).toLocaleString() : '—'}
                        </div>
                        <div className="text-slate-500">
                          Out: {trade.exitPrice ? Number(trade.exitPrice).toLocaleString() : 'Open'}
                        </div>
                      </td>

                      {/* Size & Risk */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="text-slate-900 font-semibold">{trade.quantity} {trade.positionSizeUnit}</div>
                        <div className="text-slate-500">
                          Risk: {trade.plannedRisk ? formatCurrency(trade.plannedRisk) : '—'}
                        </div>
                      </td>

                      {/* Net P&L */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={isWin ? 'text-emerald-600' : isLoss ? 'text-rose-600' : 'text-slate-700'}>
                          {trade.netPnL !== null ? formatCurrency(trade.netPnL) : 'Pending'}
                        </span>
                        {trade.feesUnknown && (
                          <div className="text-[9px] text-amber-700 font-normal">Fees unverified</div>
                        )}
                      </td>

                      {/* Realised R */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={trade.realisedR > 0 ? 'text-emerald-600' : trade.realisedR < 0 ? 'text-rose-600' : 'text-slate-700'}>
                          {formatR(trade.realisedR)}
                        </span>
                      </td>

                      {/* Compliance */}
                      <td className="py-3.5 px-4">
                        {trade.ruleCompliant === 'yes' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Compliant
                          </span>
                        ) : trade.ruleCompliant === 'partial' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-semibold">
                            <XCircle className="h-3.5 w-3.5" /> Violated
                          </span>
                        )}
                      </td>

                      {/* Record Status */}
                      <td className="py-3.5 px-4">
                        {isDraft ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            Draft
                          </span>
                        ) : isExcluded ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-semibold" title={trade.exclusionReason}>
                            Excluded
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            Complete
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onOpenTradeDetail(trade)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Inspect Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => onEditTrade(trade)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Trade"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {!isExcluded && (
                            <button
                              onClick={() => onExcludeTrade(trade)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Exclude from Stats (Requires Reason)"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteTrade(trade.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Delete Trade"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No trade records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500 bg-white/40">
          <span>
            Showing {filteredTrades.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredTrades.length)} of {filteredTrades.length} trades
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-slate-700 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
