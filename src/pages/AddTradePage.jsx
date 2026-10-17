import React, { useState, useEffect } from 'react';
import {
  Save,
  FileClock,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Trash2,
  Sparkles,
  Coins,
  Shield
} from 'lucide-react';
import {
  calculateGrossPnL,
  calculateNetPnL,
  calculatePlannedRisk,
  calculatePlannedRR,
  calculateRealisedR,
  calculateRiskPercent,
  classifyOutcome,
  formatCurrency,
  formatR
} from '../utils/calculations.js';
import { api } from '../utils/api.js';

const EMOTION_OPTIONS = [
  'Calm',
  'Fear',
  'FOMO',
  'Greed',
  'Frustration',
  'Revenge Urge',
  'Impatience',
  'Overconfidence'
];

export default function AddTradePage({
  initialData = null,
  strategies = [],
  markets = [],
  onSaveTrade,
  onCancel
}) {
  const isEditing = Boolean(initialData && initialData.id);

  // Form State
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    tradeDatetime: initialData?.tradeDatetime || new Date().toISOString().slice(0, 16),
    timezone: initialData?.timezone || 'UTC+0',
    session: initialData?.session || 'London',
    market: initialData?.market || 'BTC/USDT',
    platform: initialData?.platform || 'CoinDCX',
    direction: initialData?.direction || 'Long',
    strategy: initialData?.strategy || (strategies[0]?.name || 'BTC EMA Confirmation'),
    strategyVersion: initialData?.strategyVersion || (strategies[0]?.version || 'v1.2'),
    tradeType: initialData?.tradeType || 'Planned',
    timeframe: initialData?.timeframe || '15m',
    
    entryPrice: initialData?.entryPrice !== undefined && initialData?.entryPrice !== null ? initialData.entryPrice : '',
    exitPrice: initialData?.exitPrice !== undefined && initialData?.exitPrice !== null ? initialData.exitPrice : '',
    stopLoss: initialData?.stopLoss !== undefined && initialData?.stopLoss !== null ? initialData.stopLoss : '',
    takeProfit: initialData?.takeProfit !== undefined && initialData?.takeProfit !== null ? initialData.takeProfit : '',
    quantity: initialData?.quantity !== undefined && initialData?.quantity !== null ? initialData.quantity : '',
    positionSizeUnit: initialData?.positionSizeUnit || 'BTC',
    
    plannedRisk: initialData?.plannedRisk !== undefined && initialData?.plannedRisk !== null ? initialData.plannedRisk : '',
    accountEquity: initialData?.accountEquity !== undefined && initialData?.accountEquity !== null ? initialData.accountEquity : 25000,
    fees: initialData?.fees !== undefined && initialData?.fees !== null ? initialData.fees : '',
    otherCosts: initialData?.otherCosts !== undefined && initialData?.otherCosts !== null ? initialData.otherCosts : 0,
    feesUnknown: Boolean(initialData?.feesUnknown),
    manualGrossPnL: initialData?.manualGrossPnL !== undefined ? initialData.manualGrossPnL : '',
    
    setupValid: initialData?.setupValid || 'yes',
    ruleCompliant: initialData?.ruleCompliant || 'yes',
    emotionTags: initialData?.emotionTags || ['Calm'],
    isImpulsive: Boolean(initialData?.isImpulsive),
    isRevenge: Boolean(initialData?.isRevenge),
    
    entryReason: initialData?.entryReason || '',
    exitReason: initialData?.exitReason || '',
    lesson: initialData?.lesson || '',
    
    beforeScreenshot: initialData?.beforeScreenshot || '',
    beforeScreenshotCaption: initialData?.beforeScreenshotCaption || '',
    afterScreenshot: initialData?.afterScreenshot || '',
    afterScreenshotCaption: initialData?.afterScreenshotCaption || '',
    
    recordStatus: initialData?.recordStatus || 'complete',
    exclusionReason: initialData?.exclusionReason || '',
  });

  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [errors, setErrors] = useState({});

  // Sync unit when market changes
  useEffect(() => {
    if (!initialData) {
      if (formData.market.includes('BTC')) {
        setFormData(prev => ({ ...prev, positionSizeUnit: 'BTC' }));
      } else if (formData.market.includes('XAU') || formData.market.includes('Gold')) {
        setFormData(prev => ({ ...prev, positionSizeUnit: 'oz' }));
      } else if (formData.market.includes('ETH')) {
        setFormData(prev => ({ ...prev, positionSizeUnit: 'ETH' }));
      }
    }
  }, [formData.market, initialData]);

  // Sync strategy version when strategy name changes
  const handleStrategyChange = (stratName) => {
    const found = strategies.find(s => s.name === stratName);
    setFormData(prev => ({
      ...prev,
      strategy: stratName,
      strategyVersion: found ? found.version : 'v1.0'
    }));
  };

  // Real-time Live Calculations
  const computedGross = calculateGrossPnL({
    direction: formData.direction,
    entryPrice: formData.entryPrice,
    exitPrice: formData.exitPrice,
    quantity: formData.quantity,
    manualGrossPnL: formData.manualGrossPnL,
  });

  const computedNet = calculateNetPnL({
    grossPnL: computedGross,
    fees: formData.fees,
    otherCosts: formData.otherCosts,
    feesUnknown: formData.feesUnknown,
  });

  const computedPlannedRisk = calculatePlannedRisk({
    direction: formData.direction,
    entryPrice: formData.entryPrice,
    stopLoss: formData.stopLoss,
    quantity: formData.quantity,
    plannedRisk: formData.plannedRisk,
  });

  const computedPlannedRR = calculatePlannedRR({
    direction: formData.direction,
    entryPrice: formData.entryPrice,
    stopLoss: formData.stopLoss,
    takeProfit: formData.takeProfit,
  });

  const computedRealisedR = calculateRealisedR({
    netPnL: computedNet,
    plannedRisk: computedPlannedRisk,
  });

  const computedOutcome = classifyOutcome(computedNet);
  const computedRiskPercent = calculateRiskPercent({
    plannedRisk: computedPlannedRisk,
    accountEquity: formData.accountEquity,
  });

  // Toggle Emotion Tag
  const toggleEmotion = (emotion) => {
    setFormData(prev => {
      const exists = prev.emotionTags.includes(emotion);
      return {
        ...prev,
        emotionTags: exists ? prev.emotionTags.filter(e => e !== emotion) : [...prev.emotionTags, emotion]
      };
    });
  };

  // File Upload Handlers
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'before') setUploadingBefore(true);
    else setUploadingAfter(true);

    try {
      const res = await api.uploadScreenshot(file);
      if (type === 'before') {
        setFormData(prev => ({ ...prev, beforeScreenshot: res.url }));
      } else {
        setFormData(prev => ({ ...prev, afterScreenshot: res.url }));
      }
    } catch (err) {
      alert('Failed to upload image. Please check file type (JPG/PNG/WebP) and size (<10MB).');
    } finally {
      if (type === 'before') setUploadingBefore(false);
      else setUploadingAfter(false);
    }
  };

  // Validation
  const validateForm = (isDraft = false) => {
    const errs = {};
    if (!formData.tradeDatetime) errs.tradeDatetime = 'Date and time required';
    if (!formData.market) errs.market = 'Market instrument required';
    if (!formData.strategy) errs.strategy = 'Strategy required';

    if (!isDraft) {
      if (!formData.entryPrice || Number(formData.entryPrice) <= 0) {
        errs.entryPrice = 'Valid entry price required for complete trade';
      }
      if (!formData.exitPrice || Number(formData.exitPrice) <= 0) {
        errs.exitPrice = 'Valid exit price required for complete trade';
      }
      if (!formData.quantity || Number(formData.quantity) <= 0) {
        errs.quantity = 'Position quantity required';
      }
      if (!formData.entryReason || formData.entryReason.trim().length < 5) {
        errs.entryReason = 'Please enter a brief entry thesis / reason';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = (targetStatus = 'complete') => {
    const isValid = validateForm(targetStatus === 'draft');
    if (!isValid) return;

    const payload = {
      ...formData,
      recordStatus: targetStatus,
      entryPrice: formData.entryPrice !== '' ? Number(formData.entryPrice) : null,
      exitPrice: formData.exitPrice !== '' ? Number(formData.exitPrice) : null,
      stopLoss: formData.stopLoss !== '' ? Number(formData.stopLoss) : null,
      takeProfit: formData.takeProfit !== '' ? Number(formData.takeProfit) : null,
      quantity: formData.quantity !== '' ? Number(formData.quantity) : null,
      plannedRisk: computedPlannedRisk,
      grossPnL: computedGross,
      netPnL: computedNet,
      fees: formData.feesUnknown ? null : (formData.fees !== '' ? Number(formData.fees) : 0),
      otherCosts: Number(formData.otherCosts) || 0,
      plannedRR: computedPlannedRR,
      realisedR: computedRealisedR.value,
      realisedRReason: computedRealisedR.reason,
      outcome: computedOutcome,
      riskPercent: computedRiskPercent,
      updatedAt: new Date().toISOString(),
    };

    onSaveTrade(payload);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <FileClock className="h-4 w-4 text-amber-500" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('complete')}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isEditing ? 'Update Trade' : 'Save Verified Trade'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Real-Time Calculation Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Setup & Market */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/80 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-600" />
              1. Setup, Market & Instrument
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Execution Datetime</label>
                <input
                  type="datetime-local"
                  value={formData.tradeDatetime}
                  onChange={(e) => setFormData(p => ({ ...p, tradeDatetime: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl text-slate-800"
                />
                {errors.tradeDatetime && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.tradeDatetime}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Market / Instrument</label>
                <select
                  value={formData.market}
                  onChange={(e) => setFormData(p => ({ ...p, market: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl cursor-pointer text-slate-800"
                >
                  <option value="BTC/USDT" className="bg-white">BTC/USDT (Bitcoin)</option>
                  <option value="XAU/USD" className="bg-white">XAU/USD (Gold Spot)</option>
                  <option value="ETH/USDT" className="bg-white">ETH/USDT (Ethereum)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Platform / Broker</label>
                <input
                  type="text"
                  placeholder="e.g. CoinDCX, Binance, Exness"
                  value={formData.platform}
                  onChange={(e) => setFormData(p => ({ ...p, platform: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl text-slate-800"
                />
              </div>
            </div>

            {/* Direction & Trade Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, direction: 'Long' }))}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      formData.direction === 'Long'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, direction: 'Short' }))}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      formData.direction === 'Short'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trade Classification</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, tradeType: 'Planned' }))}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      formData.tradeType === 'Planned'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Planned
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, tradeType: 'Experimental' }))}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      formData.tradeType === 'Experimental'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Experimental
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Session & Timeframe</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={formData.session}
                    onChange={(e) => setFormData(p => ({ ...p, session: e.target.value }))}
                    className="glass-input text-xs px-2 py-2 rounded-xl cursor-pointer text-slate-800"
                  >
                    <option value="London" className="bg-white">London</option>
                    <option value="New York" className="bg-white">New York</option>
                    <option value="Asian" className="bg-white">Asian</option>
                    <option value="London/NY Overlap" className="bg-white">Overlap</option>
                  </select>
                  <select
                    value={formData.timeframe}
                    onChange={(e) => setFormData(p => ({ ...p, timeframe: e.target.value }))}
                    className="glass-input text-xs px-2 py-2 rounded-xl cursor-pointer text-slate-800"
                  >
                    <option value="1m" className="bg-white">1m</option>
                    <option value="5m" className="bg-white">5m</option>
                    <option value="15m" className="bg-white">15m</option>
                    <option value="1H" className="bg-white">1H</option>
                    <option value="4H" className="bg-white">4H</option>
                    <option value="1D" className="bg-white">1D</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Strategy Rule Set</label>
                <select
                  value={formData.strategy}
                  onChange={(e) => handleStrategyChange(e.target.value)}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl cursor-pointer text-slate-800"
                >
                  {strategies.map(s => (
                    <option key={s.id} value={s.name} className="bg-white">
                      {s.name} ({s.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Strategy Version</label>
                <input
                  type="text"
                  value={formData.strategyVersion}
                  onChange={(e) => setFormData(p => ({ ...p, strategyVersion: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                  placeholder="v1.0"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Execution & Risk */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/80 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              2. Execution Prices, Risk & Costs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 90000"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData(p => ({ ...p, entryPrice: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
                {errors.entryPrice && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.entryPrice}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 91500 (or leave empty if draft)"
                  value={formData.exitPrice}
                  onChange={(e) => setFormData(p => ({ ...p, exitPrice: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
                {errors.exitPrice && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.exitPrice}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Position Size & Unit</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 0.25"
                    value={formData.quantity}
                    onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                    className="w-2/3 glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                  />
                  <input
                    type="text"
                    value={formData.positionSizeUnit}
                    onChange={(e) => setFormData(p => ({ ...p, positionSizeUnit: e.target.value }))}
                    className="w-1/3 glass-input text-xs px-2 py-2 rounded-xl font-mono uppercase text-center text-slate-800 font-semibold"
                  />
                </div>
                {errors.quantity && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.quantity}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Stop-Loss Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 89500"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData(p => ({ ...p, stopLoss: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Take-Profit Target</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 91800"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData(p => ({ ...p, takeProfit: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Planned Monetary Risk ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 150 (or auto-derived)"
                  value={formData.plannedRisk}
                  onChange={(e) => setFormData(p => ({ ...p, plannedRisk: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Fees and Costs Handling */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/70">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Exchange Fees ($)</label>
                <input
                  type="number"
                  step="any"
                  disabled={formData.feesUnknown}
                  placeholder="e.g. 12.50"
                  value={formData.fees}
                  onChange={(e) => setFormData(p => ({ ...p, fees: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800 disabled:opacity-50"
                />
                <label className="flex items-center gap-1.5 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.feesUnknown}
                    onChange={(e) => setFormData(p => ({ ...p, feesUnknown: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-amber-700 font-semibold">Fees unknown (Never silently assume 0)</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Other Costs (Funding/Slippage)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.otherCosts}
                  onChange={(e) => setFormData(p => ({ ...p, otherCosts: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account Equity ($)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.accountEquity}
                  onChange={(e) => setFormData(p => ({ ...p, accountEquity: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Psychology & Rules */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/80 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              3. Setup Validity & Psychology Checklist
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Setup Valid Under Written Strategy Rules?
                </label>
                <select
                  value={formData.setupValid}
                  onChange={(e) => setFormData(p => ({ ...p, setupValid: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl cursor-pointer text-slate-800"
                >
                  <option value="yes" className="bg-white">Yes — All conditions satisfied</option>
                  <option value="no" className="bg-white">No — Deviated or chased</option>
                  <option value="unsure" className="bg-white">Unsure / Ambiguous</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Rule Compliance Status
                </label>
                <select
                  value={formData.ruleCompliant}
                  onChange={(e) => setFormData(p => ({ ...p, ruleCompliant: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl cursor-pointer text-slate-800"
                >
                  <option value="yes" className="bg-white">Yes — Fully compliant</option>
                  <option value="no" className="bg-white">No — Violations occurred</option>
                  <option value="partial" className="bg-white">Partial — Minor deviation</option>
                  <option value="unknown" className="bg-white">Unknown (Not counted as compliant)</option>
                </select>
              </div>
            </div>

            {/* Emotions Multi-Select Pills */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-2">
                Emotion State Prior to & During Execution:
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTIONS.map((emotion) => {
                  const isSelected = formData.emotionTags.includes(emotion);
                  return (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => toggleEmotion(emotion)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs'
                          : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 border border-slate-200/80'
                      }`}
                    >
                      {emotion}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impulsive / Revenge Flags */}
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isImpulsive}
                  onChange={(e) => setFormData(p => ({ ...p, isImpulsive: e.target.checked }))}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-rose-700 font-semibold">Impulsive / FOMO Entry</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRevenge}
                  onChange={(e) => setFormData(p => ({ ...p, isRevenge: e.target.checked }))}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-red-700 font-semibold">Revenge Urge (Attempting to recover loss)</span>
              </label>
            </div>

            {/* Reasons and Lesson */}
            <div className="space-y-3 pt-2 border-t border-slate-200/70">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Entry Reason & Thesis <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Why was this trade taken? (e.g. 15m pullback to 21 EMA with bullish rejection wick)"
                  value={formData.entryReason}
                  onChange={(e) => setFormData(p => ({ ...p, entryReason: e.target.value }))}
                  className="w-full glass-input text-xs p-3 rounded-xl text-slate-800"
                />
                {errors.entryReason && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.entryReason}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Exit Context & Execution Reality
                </label>
                <textarea
                  rows={2}
                  placeholder="How was the exit executed? (e.g. Scaled out at target resistance cluster)"
                  value={formData.exitReason}
                  onChange={(e) => setFormData(p => ({ ...p, exitReason: e.target.value }))}
                  className="w-full glass-input text-xs p-3 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                  One Specific Lesson Learned
                </label>
                <input
                  type="text"
                  placeholder="e.g. Moving stop loss outside plan converted a controlled -1R loss into an avoidable leak."
                  value={formData.lesson}
                  onChange={(e) => setFormData(p => ({ ...p, lesson: e.target.value }))}
                  className="w-full glass-input text-xs px-3 py-2 rounded-xl text-amber-900 border-amber-200 bg-amber-50/50"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Chart Screenshots & Evidence */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/80 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              4. Before & After Chart Screenshots
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Entry */}
              <div className="p-4 rounded-xl glass-card border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-blue-700 block">Before-Entry Chart</span>
                
                {formData.beforeScreenshot ? (
                  <div className="relative h-36 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group shadow-2xs">
                    <img src={formData.beforeScreenshot} alt="Before" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, beforeScreenshot: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-white shadow-sm transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="h-36 rounded-lg border border-dashed border-slate-300 hover:border-blue-500/60 bg-slate-50/60 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition">
                    <Upload className="h-5 w-5 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-700 font-semibold">Upload Chart</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG, WebP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'before')}
                    />
                  </label>
                )}

                <input
                  type="text"
                  placeholder="Or paste image URL"
                  value={formData.beforeScreenshot}
                  onChange={(e) => setFormData(p => ({ ...p, beforeScreenshot: e.target.value }))}
                  className="w-full glass-input text-[11px] px-2.5 py-1.5 rounded-lg text-slate-800"
                />

                <input
                  type="text"
                  placeholder="Caption (e.g. 15m hammer candle)"
                  value={formData.beforeScreenshotCaption}
                  onChange={(e) => setFormData(p => ({ ...p, beforeScreenshotCaption: e.target.value }))}
                  className="w-full glass-input text-[11px] px-2.5 py-1.5 rounded-lg text-slate-800"
                />
              </div>

              {/* After Exit */}
              <div className="p-4 rounded-xl glass-card border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-emerald-700 block">After-Exit Chart</span>
                
                {formData.afterScreenshot ? (
                  <div className="relative h-36 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group shadow-2xs">
                    <img src={formData.afterScreenshot} alt="After" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, afterScreenshot: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-white shadow-sm transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="h-36 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500/60 bg-slate-50/60 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition">
                    <Upload className="h-5 w-5 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-700 font-semibold">Upload Chart</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG, WebP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'after')}
                    />
                  </label>
                )}

                <input
                  type="text"
                  placeholder="Or paste image URL"
                  value={formData.afterScreenshot}
                  onChange={(e) => setFormData(p => ({ ...p, afterScreenshot: e.target.value }))}
                  className="w-full glass-input text-[11px] px-2.5 py-1.5 rounded-lg text-slate-800"
                />

                <input
                  type="text"
                  placeholder="Caption (e.g. Take profit reached at 91450)"
                  value={formData.afterScreenshotCaption}
                  onChange={(e) => setFormData(p => ({ ...p, afterScreenshotCaption: e.target.value }))}
                  className="w-full glass-input text-[11px] px-2.5 py-1.5 rounded-lg text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Computed Values Preview Card (1 col) */}
        <div className="space-y-4">
          <div className="sticky top-20 p-5 rounded-2xl glass-card border border-blue-200/90 shadow-xl space-y-4 bg-white/95">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Live Calculation Audit
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Transparent pre-save verification</p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                computedOutcome === 'win'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : computedOutcome === 'loss'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {computedOutcome}
              </span>
            </div>

            {/* Big Net Result Display */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 block font-semibold">Estimated Net P&L:</span>
              <div className="text-2xl font-bold font-mono">
                <span className={computedNet > 0 ? 'text-emerald-600' : computedNet < 0 ? 'text-rose-600' : 'text-slate-700'}>
                  {formatCurrency(computedNet)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                <span>Gross: {formatCurrency(computedGross)}</span>
                <span>
                  {formData.feesUnknown ? (
                    <span className="text-amber-700 font-semibold">Fees Unknown</span>
                  ) : (
                    `Fees: ${formatCurrency(formData.fees || 0)}`
                  )}
                </span>
              </div>
            </div>

            {/* R-Multiple and Risk Analysis */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Realised R-Multiple:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatR(computedRealisedR.value)}
                </span>
              </div>

              {computedRealisedR.reason && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium">
                  {computedRealisedR.reason}
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Planned Reward / Risk:</span>
                <span className="font-mono font-semibold text-blue-600">
                  {computedPlannedRR ? `1 : ${computedPlannedRR}` : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Planned Monetary Risk:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(computedPlannedRisk)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Account Risk %:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {computedRiskPercent ? `${computedRiskPercent}%` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Blueprint Safeguard Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[10px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Blueprint Safeguards:</span>
              <p>• Never silently treat unknown fees as zero.</p>
              <p>• R-multiple requires valid positive planned risk.</p>
              <p>• Incomplete trades saved as drafts are excluded from headline metrics until verified.</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit('complete')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save Verified Trade</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-2xs transition cursor-pointer"
              >
                <FileClock className="h-4 w-4 text-amber-500" />
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
