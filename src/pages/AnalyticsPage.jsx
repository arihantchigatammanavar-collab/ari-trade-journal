import React from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  ShieldAlert,
  Brain,
  Layers,
  Coins,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { formatCurrency, formatR } from '../utils/calculations.js';

export default function AnalyticsPage({
  summary,
  trades = [],
  strategies = []
}) {
  const completeTrades = trades.filter(t => t.recordStatus === 'complete');

  // Strategy Comparison Data
  const strategyStats = strategies.map(s => {
    const stratTrades = completeTrades.filter(t => t.strategy === s.name);
    const count = stratTrades.length;
    const wins = stratTrades.filter(t => t.outcome === 'win').length;
    const net = stratTrades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
    const compliant = stratTrades.filter(t => t.ruleCompliant === 'yes').length;
    const knownCompliant = stratTrades.filter(t => ['yes', 'no', 'partial'].includes(t.ruleCompliant)).length;

    return {
      name: s.name,
      version: s.version,
      market: s.market,
      count,
      wins,
      winRate: count > 0 ? ((wins / count) * 100).toFixed(1) : 0,
      totalNet: net,
      expectancy: count > 0 ? (net / count).toFixed(2) : 0,
      complianceRate: knownCompliant > 0 ? ((compliant / knownCompliant) * 100).toFixed(1) : 0,
    };
  });

  // Market Comparison (Bitcoin vs Gold)
  const btcTrades = completeTrades.filter(t => (t.market || '').includes('BTC'));
  const goldTrades = completeTrades.filter(t => (t.market || '').includes('XAU') || (t.market || '').includes('Gold'));

  const getMarketSummary = (subTrades) => {
    const count = subTrades.length;
    const wins = subTrades.filter(t => t.outcome === 'win').length;
    const losses = subTrades.filter(t => t.outcome === 'loss').length;
    const net = subTrades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
    const grossPositive = subTrades.filter(t => Number(t.netPnL) > 0).reduce((acc, t) => acc + Number(t.netPnL), 0);
    const grossNegative = subTrades.filter(t => Number(t.netPnL) < 0).reduce((acc, t) => acc + Math.abs(Number(t.netPnL)), 0);

    return {
      count,
      winRate: count > 0 ? ((wins / count) * 100).toFixed(1) : 0,
      netPnL: net,
      expectancy: count > 0 ? (net / count).toFixed(2) : 0,
      profitFactor: grossNegative > 0 ? (grossPositive / grossNegative).toFixed(2) : (grossPositive > 0 ? 'N/A' : '0.00'),
    };
  };

  const btcSummary = getMarketSummary(btcTrades);
  const goldSummary = getMarketSummary(goldTrades);

  // Emotion vs Outcome Analysis
  const emotionMap = {};
  completeTrades.forEach(t => {
    (t.emotionTags || ['Unspecified']).forEach(emotion => {
      if (!emotionMap[emotion]) {
        emotionMap[emotion] = { emotion, count: 0, wins: 0, totalNet: 0 };
      }
      emotionMap[emotion].count++;
      if (t.outcome === 'win') emotionMap[emotion].wins++;
      emotionMap[emotion].totalNet += Number(t.netPnL) || 0;
    });
  });

  const emotionData = Object.values(emotionMap).map(e => ({
    ...e,
    winRate: e.count > 0 ? Number(((e.wins / e.count) * 100).toFixed(1)) : 0,
    avgNet: e.count > 0 ? Number((e.totalNet / e.count).toFixed(2)) : 0,
  }));

  // Session Performance
  const sessions = ['London', 'New York', 'Asian', 'London/NY Overlap'];
  const sessionData = sessions.map(sess => {
    const sessTrades = completeTrades.filter(t => t.session === sess);
    const count = sessTrades.length;
    const wins = sessTrades.filter(t => t.outcome === 'win').length;
    const net = sessTrades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
    return {
      session: sess,
      count,
      winRate: count > 0 ? ((wins / count) * 100).toFixed(1) : 0,
      netPnL: net,
    };
  });

  return (
    <div className="space-y-6">
      {/* Statistical Caution Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-start gap-3.5 shadow-sm">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Statistical Caution & Integrity Rule
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            A trading journal is an objective historical audit, not a guarantee of future edge. Results are heavily influenced by market regimes, execution discipline, sample size, and chance. Never confuse a rule-violating profitable trade with valid strategy edge.
          </p>
        </div>
      </div>

      {/* Row 1: Equity Curve & Drawdown Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Equity Curve */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Cumulative P&L Curve
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological account equity curve (USD)</p>
            </div>
            <span className={`text-xs font-mono font-bold ${summary.totalNetPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(summary.totalNetPnL)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Cumulative P&L']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', color: '#0f172a' }}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="cumulativePnL" stroke="#2563eb" strokeWidth={2.5} fill="url(#eqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown Curve */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                Drawdown Curve (Underwater Chart)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Peak-to-trough decline over time</p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600">
              Max: -{formatCurrency(summary.maxDrawdownAmount)} ({summary.maxDrawdownPercent}%)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.drawdownCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={v => `$${Math.abs(v)}`} />
                <Tooltip
                  formatter={(value) => [`-$${Math.abs(value)}`, 'Drawdown']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', color: '#0f172a' }}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="drawdownAmount" stroke="#ef4444" strokeWidth={2.5} fill="url(#ddGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: R-Multiple Distribution & 4-Quadrant Discipline Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realised R Distribution Histogram */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Realised R-Multiple Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Frequency of trades by risk-adjusted return bucket
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.rDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} trades`, 'Count']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', color: '#0f172a' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {summary.rDistribution.map((entry, index) => {
                    const isNeg = entry.bucket.includes('-');
                    const isPos = entry.bucket.includes('+');
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPos ? '#10b981' : isNeg ? '#f43f5e' : '#94a3b8'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4-Quadrant Discipline vs Outcome Matrix */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-purple-600" />
                Process vs Outcome Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Separating execution quality from market luck
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500 font-medium">N={summary.sampleSize}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Quadrant 1: Compliant Win */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">Compliant Win</span>
                <span className="font-mono text-base font-bold text-emerald-700">{summary.compliantWinCount}</span>
              </div>
              <p className="text-[10px] text-emerald-700/80">
                Textbook execution. Edge confirmed with disciplined rule adherence.
              </p>
            </div>

            {/* Quadrant 2: Compliant Loss */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800">Compliant Loss</span>
                <span className="font-mono text-base font-bold text-blue-700">{summary.compliantLossCount}</span>
              </div>
              <p className="text-[10px] text-blue-700/80">
                Healthy cost of doing business. Rules followed; acceptable statistical variance.
              </p>
            </div>

            {/* Quadrant 3: Rule-Violating Win */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800">Rule-Violating Win</span>
                <span className="font-mono text-base font-bold text-amber-700">{summary.violatingWinCount}</span>
              </div>
              <p className="text-[10px] text-amber-700/80">
                "Fool's Gold". Lucky outcome from bad habits. Danger of reinforcement!
              </p>
            </div>

            {/* Quadrant 4: Rule-Violating Loss */}
            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-800">Rule-Violating Loss</span>
                <span className="font-mono text-base font-bold text-rose-700">{summary.violatingLossCount}</span>
              </div>
              <p className="text-[10px] text-rose-700/80">
                Completely avoidable leak. Impulsive entry, moved stop, or revenge trading.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between font-medium">
            <span>Overall Process Discipline Score:</span>
            <span className="font-mono font-bold text-blue-600">{summary.complianceRate}%</span>
          </div>
        </div>
      </div>

      {/* Row 3: Bitcoin vs Gold Head-to-Head Comparison */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-600" />
            Market Head-to-Head: Bitcoin vs Gold
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized comparison between crypto and commodity asset classes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bitcoin */}
          <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-300/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                Bitcoin (BTC/USDT)
              </span>
              <span className="text-xs font-mono text-slate-500">N={btcSummary.count}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Net P&L</span>
                <span className={`font-mono font-bold ${btcSummary.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(btcSummary.netPnL)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Win Rate</span>
                <span className="font-mono font-bold text-slate-800">{btcSummary.winRate}%</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Expectancy</span>
                <span className="font-mono font-bold text-blue-600">{formatCurrency(btcSummary.expectancy)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Profit Factor</span>
                <span className="font-mono font-bold text-slate-800">{btcSummary.profitFactor}</span>
              </div>
            </div>
          </div>

          {/* Gold */}
          <div className="p-4 rounded-xl bg-yellow-500/[0.04] border border-yellow-300/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-yellow-800 flex items-center gap-1.5">
                Gold Spot & CFD (XAU/USD)
              </span>
              <span className="text-xs font-mono text-slate-500">N={goldSummary.count}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Net P&L</span>
                <span className={`font-mono font-bold ${goldSummary.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(goldSummary.netPnL)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Win Rate</span>
                <span className="font-mono font-bold text-slate-800">{goldSummary.winRate}%</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Expectancy</span>
                <span className="font-mono font-bold text-blue-600">{formatCurrency(goldSummary.expectancy)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Profit Factor</span>
                <span className="font-mono font-bold text-slate-800">{goldSummary.profitFactor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Strategy Comparison Table */}
      <div className="rounded-2xl glass-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            Strategy Edge & Rule Comparison
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual strategy performance across verified trades
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Strategy & Version</th>
                <th className="py-3 px-4">Asset Class</th>
                <th className="py-3 px-4">Sample (N)</th>
                <th className="py-3 px-4">Win Rate</th>
                <th className="py-3 px-4">Net P&L</th>
                <th className="py-3 px-4">Trade Expectancy</th>
                <th className="py-3 px-4">Discipline Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {strategyStats.map((strat, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {strat.name} <span className="text-blue-600 font-mono text-[11px] ml-1">{strat.version}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{strat.market}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{strat.count} trades</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{strat.winRate}%</td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={strat.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {formatCurrency(strat.totalNet)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-blue-600 font-semibold">
                    {formatCurrency(strat.expectancy)}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className={Number(strat.complianceRate) >= 80 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {strat.complianceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: Emotion vs Outcome and Session Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion vs Outcomes */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Emotional State vs Results
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Performance grouped by trader mindset at entry (Correlation ≠ Causation)
            </p>
          </div>

          <div className="space-y-2.5">
            {emotionData.map((e, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                    {e.emotion}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">{e.count} trades</span>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-600">{e.winRate}% Win</span>
                  <span className={`font-bold ${e.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(e.totalNet)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Analysis */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Trading Session Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Execution variance across international financial centers
            </p>
          </div>

          <div className="space-y-2.5">
            {sessionData.map((s, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-800">{s.session}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{s.count} trades</span>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-600">{s.winRate}% Win</span>
                  <span className={`font-bold ${s.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(s.netPnL)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
