/**
 * ARI TRADING JOURNAL — CORE FINANCIAL CALCULATION ENGINE
 * 
 * Blueprint Compliance:
 * - One source of truth for all calculations.
 * - Decimal-safe rounding and safeguards against divide-by-zero.
 * - Separate strategy execution from outcome.
 * - Explicit handling of unknown fees and missing risk values.
 */

// Tolerance for classifying a trade as Breakeven (in account currency)
export const BREAKEVEN_TOLERANCE = 1.0;

/**
 * Calculates Gross P&L based on trade direction, prices, and quantity.
 * Long gross P&L = (Exit Price − Entry Price) × Quantity
 * Short gross P&L = (Entry Price − Exit Price) × Quantity
 */
export function calculateGrossPnL({ direction, entryPrice, exitPrice, quantity, manualGrossPnL }) {
  if (manualGrossPnL !== undefined && manualGrossPnL !== null && manualGrossPnL !== '') {
    const val = Number(manualGrossPnL);
    if (!isNaN(val)) return roundTo(val, 2);
  }

  const entry = Number(entryPrice);
  const exit = Number(exitPrice);
  const qty = Number(quantity);

  if (isNaN(entry) || isNaN(exit) || isNaN(qty) || qty <= 0) {
    return null;
  }

  const dir = String(direction).toLowerCase();
  let gross = 0;
  if (dir === 'long' || dir === 'buy') {
    gross = (exit - entry) * qty;
  } else if (dir === 'short' || dir === 'sell') {
    gross = (entry - exit) * qty;
  } else {
    return null;
  }

  return roundTo(gross, 2);
}

/**
 * Calculates Net P&L: Gross P&L minus included fees and other costs.
 * Net P&L = Gross P&L − Included Fees − Included Other Costs
 */
export function calculateNetPnL({ grossPnL, fees = 0, otherCosts = 0, feesUnknown = false }) {
  if (grossPnL === null || grossPnL === undefined || isNaN(grossPnL)) {
    return null;
  }

  const feeVal = feesUnknown ? 0 : Number(fees) || 0;
  const costVal = Number(otherCosts) || 0;

  const net = Number(grossPnL) - feeVal - costVal;
  return roundTo(net, 2);
}

/**
 * Derives planned monetary risk if not explicitly entered.
 */
export function calculatePlannedRisk({ direction, entryPrice, stopLoss, quantity, plannedRisk }) {
  if (plannedRisk !== undefined && plannedRisk !== null && plannedRisk !== '') {
    const val = Number(plannedRisk);
    if (!isNaN(val) && val > 0) return roundTo(val, 2);
  }

  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  const qty = Number(quantity);

  if (isNaN(entry) || isNaN(stop) || isNaN(qty) || qty <= 0) {
    return null;
  }

  const dir = String(direction).toLowerCase();
  let riskDist = 0;
  if (dir === 'long' || dir === 'buy') {
    riskDist = entry - stop;
  } else if (dir === 'short' || dir === 'sell') {
    riskDist = stop - entry;
  }

  if (riskDist <= 0) return null;
  return roundTo(riskDist * qty, 2);
}

/**
 * Calculates Planned R:R (Reward-to-Risk ratio)
 */
export function calculatePlannedRR({ direction, entryPrice, stopLoss, takeProfit }) {
  const entry = Number(entryPrice);
  const stop = Number(stopLoss);
  const target = Number(takeProfit);

  if (isNaN(entry) || isNaN(stop) || isNaN(target)) {
    return null;
  }

  const dir = String(direction).toLowerCase();
  let riskDist = 0;
  let rewardDist = 0;

  if (dir === 'long' || dir === 'buy') {
    riskDist = entry - stop;
    rewardDist = target - entry;
  } else if (dir === 'short' || dir === 'sell') {
    riskDist = stop - entry;
    rewardDist = entry - target;
  }

  if (riskDist <= 0 || rewardDist <= 0) {
    return null;
  }

  return roundTo(rewardDist / riskDist, 2);
}

/**
 * Calculates Realised R-multiple: Net P&L ÷ Valid Planned Monetary Risk
 * Must be greater than zero.
 */
export function calculateRealisedR({ netPnL, plannedRisk }) {
  if (netPnL === null || netPnL === undefined || isNaN(netPnL)) {
    return { value: null, reason: 'Net P&L unavailable' };
  }
  const risk = Number(plannedRisk);
  if (isNaN(risk) || risk <= 0) {
    return { value: null, reason: 'Valid planned risk (> 0) required for R-multiple' };
  }

  const r = Number(netPnL) / risk;
  return { value: roundTo(r, 2), reason: null };
}

/**
 * Calculates Risk % of Account: Planned Risk ÷ Account Equity × 100
 */
export function calculateRiskPercent({ plannedRisk, accountEquity }) {
  const risk = Number(plannedRisk);
  const equity = Number(accountEquity);
  if (isNaN(risk) || isNaN(equity) || risk <= 0 || equity <= 0) {
    return null;
  }
  return roundTo((risk / equity) * 100, 2);
}

/**
 * Classifies trade outcome into 'win', 'loss', or 'breakeven' based on net P&L.
 */
export function classifyOutcome(netPnL, tolerance = BREAKEVEN_TOLERANCE) {
  if (netPnL === null || netPnL === undefined || isNaN(netPnL)) {
    return 'unknown';
  }
  const val = Number(netPnL);
  if (Math.abs(val) <= tolerance) {
    return 'breakeven';
  }
  return val > tolerance ? 'win' : 'loss';
}

/**
 * Computes complete trade metrics for a single trade object
 */
export function computeTradeMetrics(trade) {
  const gross = calculateGrossPnL({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    quantity: trade.quantity,
    manualGrossPnL: trade.manualGrossPnL,
  });

  const net = calculateNetPnL({
    grossPnL: gross,
    fees: trade.fees,
    otherCosts: trade.otherCosts,
    feesUnknown: Boolean(trade.feesUnknown),
  });

  const plannedRisk = calculatePlannedRisk({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    stopLoss: trade.stopLoss,
    quantity: trade.quantity,
    plannedRisk: trade.plannedRisk,
  });

  const plannedRR = calculatePlannedRR({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
  });

  const realisedR = calculateRealisedR({
    netPnL: net,
    plannedRisk: plannedRisk,
  });

  const outcome = classifyOutcome(net);

  const riskPercent = calculateRiskPercent({
    plannedRisk: plannedRisk,
    accountEquity: trade.accountEquity,
  });

  return {
    ...trade,
    grossPnL: gross,
    netPnL: net,
    plannedRisk: plannedRisk,
    plannedRR: plannedRR,
    realisedR: realisedR.value,
    realisedRReason: realisedR.reason,
    outcome: outcome,
    riskPercent: riskPercent,
  };
}

/**
 * Computes portfolio and summary statistics across a set of trades.
 * Strictly adheres to blueprint rules:
 * - Only includes complete, non-excluded trades in performance metrics.
 * - If no losing trades, profit factor is 'N/A', NOT infinity.
 * - Prevents divide-by-zero.
 * - Documents sample sizes and excluded trade counts.
 */
export function calculatePerformanceSummary(trades = [], filters = {}) {
  // Apply filtering
  const filtered = filterTrades(trades, filters);

  const totalRecords = filtered.length;
  const completeTrades = filtered.filter(t => t.recordStatus === 'complete' && t.netPnL !== null);
  const draftTrades = filtered.filter(t => t.recordStatus === 'draft');
  const excludedTrades = filtered.filter(t => t.recordStatus === 'excluded');

  const sampleSize = completeTrades.length;

  if (sampleSize === 0) {
    return {
      sampleSize: 0,
      totalRecords,
      draftCount: draftTrades.length,
      excludedCount: excludedTrades.length,
      totalNetPnL: 0,
      totalGrossPnL: 0,
      totalFees: 0,
      winCount: 0,
      lossCount: 0,
      breakevenCount: 0,
      winRate: 0,
      winRateExcludingBE: 0,
      averageWin: 0,
      averageLoss: 0,
      winLossRatio: 0,
      expectancy: 0,
      expectancyR: 0,
      profitFactor: 'N/A',
      profitFactorReason: 'No completed trades',
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      averageRealisedR: 0,
      averagePlannedRR: 0,
      complianceRate: 0,
      compliantWinCount: 0,
      compliantLossCount: 0,
      violatingWinCount: 0,
      violatingLossCount: 0,
      equityCurve: [],
      drawdownCurve: [],
      monthlyPnL: [],
      rDistribution: [],
    };
  }

  let totalNet = 0;
  let totalGross = 0;
  let totalFees = 0;
  let positiveNetSum = 0;
  let negativeNetSum = 0;

  const wins = [];
  const losses = [];
  const breakevens = [];
  const rValues = [];
  const plannedRRs = [];

  let compliantCount = 0;
  let knownComplianceCount = 0;
  let compliantWins = 0;
  let compliantLosses = 0;
  let violatingWins = 0;
  let violatingLosses = 0;

  // Process trades
  completeTrades.forEach(t => {
    const net = Number(t.netPnL) || 0;
    const gross = Number(t.grossPnL) || 0;
    const fee = (t.feesUnknown ? 0 : Number(t.fees) || 0) + (Number(t.otherCosts) || 0);

    totalNet += net;
    totalGross += gross;
    totalFees += fee;

    if (t.outcome === 'win') {
      wins.push(net);
      positiveNetSum += net;
    } else if (t.outcome === 'loss') {
      losses.push(net);
      negativeNetSum += Math.abs(net);
    } else {
      breakevens.push(net);
    }

    if (t.realisedR !== null && t.realisedR !== undefined && !isNaN(t.realisedR)) {
      rValues.push(Number(t.realisedR));
    }

    if (t.plannedRR !== null && t.plannedRR !== undefined && !isNaN(t.plannedRR)) {
      plannedRRs.push(Number(t.plannedRR));
    }

    // Rule compliance tracking (known compliant / known status)
    // Blueprint: "Unknown status is not compliant."
    const ruleComp = String(t.ruleCompliant || '').toLowerCase();
    if (ruleComp === 'yes') {
      compliantCount++;
      knownComplianceCount++;
      if (t.outcome === 'win') compliantWins++;
      if (t.outcome === 'loss') compliantLosses++;
    } else if (ruleComp === 'no' || ruleComp === 'partial') {
      knownComplianceCount++;
      if (t.outcome === 'win') violatingWins++;
      if (t.outcome === 'loss') violatingLosses++;
    } else {
      // unknown or unrecorded
      if (t.outcome === 'win') violatingWins++;
      if (t.outcome === 'loss') violatingLosses++;
    }
  });

  const winCount = wins.length;
  const lossCount = losses.length;
  const breakevenCount = breakevens.length;

  // Win rate: Total wins / total sample (standard) & Wins / (Wins + Losses)
  const winRate = roundTo((winCount / sampleSize) * 100, 1);
  const winLossTotal = winCount + lossCount;
  const winRateExcludingBE = winLossTotal > 0 ? roundTo((winCount / winLossTotal) * 100, 1) : 0;

  // Averages
  const averageWin = winCount > 0 ? roundTo(positiveNetSum / winCount, 2) : 0;
  const averageLoss = lossCount > 0 ? roundTo(negativeNetSum / lossCount, 2) : 0;
  const winLossRatio = averageLoss > 0 ? roundTo(averageWin / averageLoss, 2) : null;

  // Expectancy (mean net profit per trade)
  const expectancy = roundTo(totalNet / sampleSize, 2);
  const expectancyR = rValues.length > 0 ? roundTo(rValues.reduce((a, b) => a + b, 0) / rValues.length, 2) : 0;

  // Profit Factor: Sum of positive net P&L ÷ absolute sum of negative net P&L
  // Blueprint: "If no losses, show N/A, not infinity."
  let profitFactor = 'N/A';
  let profitFactorReason = null;
  if (negativeNetSum === 0) {
    if (positiveNetSum > 0) {
      profitFactor = 'N/A';
      profitFactorReason = 'No losing trades in selected sample';
    } else {
      profitFactor = 'N/A';
      profitFactorReason = 'Zero net profit and loss';
    }
  } else {
    profitFactor = roundTo(positiveNetSum / negativeNetSum, 2);
  }

  // Average Realised R and Planned R:R
  const averageRealisedR = rValues.length > 0 ? roundTo(rValues.reduce((a, b) => a + b, 0) / rValues.length, 2) : 0;
  const averagePlannedRR = plannedRRs.length > 0 ? roundTo(plannedRRs.reduce((a, b) => a + b, 0) / plannedRRs.length, 2) : 0;

  // Rule Compliance Rate
  const complianceRate = knownComplianceCount > 0 ? roundTo((compliantCount / knownComplianceCount) * 100, 1) : 0;

  // Calculate Equity Curve and Drawdown
  const { equityCurve, drawdownCurve, maxDrawdownAmount, maxDrawdownPercent } = buildEquityAndDrawdownCurves(completeTrades);

  // Calculate Monthly P&L
  const monthlyPnL = buildMonthlyPnL(completeTrades);

  // Calculate R distribution histogram buckets
  const rDistribution = buildRDistribution(rValues);

  return {
    sampleSize,
    totalRecords,
    draftCount: draftTrades.length,
    excludedCount: excludedTrades.length,
    totalNetPnL: roundTo(totalNet, 2),
    totalGrossPnL: roundTo(totalGross, 2),
    totalFees: roundTo(totalFees, 2),
    winCount,
    lossCount,
    breakevenCount,
    winRate,
    winRateExcludingBE,
    averageWin,
    averageLoss,
    winLossRatio,
    expectancy,
    expectancyR,
    profitFactor,
    profitFactorReason,
    maxDrawdownAmount: roundTo(maxDrawdownAmount, 2),
    maxDrawdownPercent: roundTo(maxDrawdownPercent, 1),
    averageRealisedR,
    averagePlannedRR,
    complianceRate,
    compliantWinCount: compliantWins,
    compliantLossCount: compliantLosses,
    violatingWinCount: violatingWins,
    violatingLossCount: violatingLosses,
    equityCurve,
    drawdownCurve,
    monthlyPnL,
    rDistribution,
  };
}

/**
 * Builds chronological Cumulative Equity curve and Drawdown Curve
 */
export function buildEquityAndDrawdownCurves(trades = []) {
  if (trades.length === 0) {
    return { equityCurve: [], drawdownCurve: [], maxDrawdownAmount: 0, maxDrawdownPercent: 0 };
  }

  // Sort chronologically by date/time
  const sorted = [...trades].sort((a, b) => new Date(a.tradeDatetime || a.createdAt) - new Date(b.tradeDatetime || b.createdAt));

  let runningCumPnL = 0;
  let peakCumPnL = 0;
  let maxDrawdownAmt = 0;
  let maxDrawdownPct = 0;

  const equityCurve = [
    {
      tradeIndex: 0,
      tradeId: 'START',
      date: sorted[0]?.tradeDatetime ? new Date(sorted[0].tradeDatetime).toLocaleDateString() : 'Baseline',
      pnl: 0,
      cumulativePnL: 0,
      market: 'Baseline',
    }
  ];

  const drawdownCurve = [
    {
      tradeIndex: 0,
      tradeId: 'START',
      date: sorted[0]?.tradeDatetime ? new Date(sorted[0].tradeDatetime).toLocaleDateString() : 'Baseline',
      drawdownAmount: 0,
      drawdownPercent: 0,
    }
  ];

  sorted.forEach((trade, idx) => {
    const net = Number(trade.netPnL) || 0;
    runningCumPnL = roundTo(runningCumPnL + net, 2);

    if (runningCumPnL > peakCumPnL) {
      peakCumPnL = runningCumPnL;
    }

    const currentDrawdownAmt = roundTo(peakCumPnL - runningCumPnL, 2);
    const currentDrawdownPct = peakCumPnL > 0 ? roundTo((currentDrawdownAmt / peakCumPnL) * 100, 1) : 0;

    if (currentDrawdownAmt > maxDrawdownAmt) {
      maxDrawdownAmt = currentDrawdownAmt;
      maxDrawdownPct = currentDrawdownPct;
    }

    const formattedDate = trade.tradeDatetime ? new Date(trade.tradeDatetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `T#${idx + 1}`;

    equityCurve.push({
      tradeIndex: idx + 1,
      tradeId: trade.id || `TR-${idx + 1}`,
      date: formattedDate,
      fullDate: trade.tradeDatetime,
      pnl: net,
      cumulativePnL: runningCumPnL,
      market: trade.market || 'Unknown',
      strategy: trade.strategy || 'Unknown',
      outcome: trade.outcome,
      realisedR: trade.realisedR,
    });

    drawdownCurve.push({
      tradeIndex: idx + 1,
      tradeId: trade.id || `TR-${idx + 1}`,
      date: formattedDate,
      drawdownAmount: -currentDrawdownAmt, // negative for downward visualization
      drawdownPercent: -currentDrawdownPct,
    });
  });

  return {
    equityCurve,
    drawdownCurve,
    maxDrawdownAmount: maxDrawdownAmt,
    maxDrawdownPercent: maxDrawdownPct,
  };
}

/**
 * Builds monthly net P&L aggregation
 */
export function buildMonthlyPnL(trades = []) {
  const monthsMap = {};

  trades.forEach(t => {
    const d = new Date(t.tradeDatetime || t.createdAt);
    if (isNaN(d.getTime())) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    if (!monthsMap[key]) {
      monthsMap[key] = { monthKey: key, label: label, netPnL: 0, tradesCount: 0, winCount: 0 };
    }

    monthsMap[key].netPnL = roundTo(monthsMap[key].netPnL + (Number(t.netPnL) || 0), 2);
    monthsMap[key].tradesCount += 1;
    if (t.outcome === 'win') {
      monthsMap[key].winCount += 1;
    }
  });

  return Object.keys(monthsMap)
    .sort()
    .map(key => {
      const item = monthsMap[key];
      return {
        ...item,
        winRate: item.tradesCount > 0 ? roundTo((item.winCount / item.tradesCount) * 100, 1) : 0,
      };
    });
}

/**
 * Builds R-multiple distribution histogram buckets
 * <-2R, -2R to -1R, -1R to 0R, 0R to +1R, +1R to +2R, +2R to +3R, >+3R
 */
export function buildRDistribution(rValues = []) {
  const buckets = [
    { label: '< -2R', min: -Infinity, max: -2.0001, count: 0 },
    { label: '-2R to -1R', min: -2.0, max: -1.0001, count: 0 },
    { label: '-1R to 0R', min: -1.0, max: -0.0001, count: 0 },
    { label: '0R (BE)', min: 0.0, max: 0.0001, count: 0 },
    { label: '0R to +1R', min: 0.0001, max: 1.0, count: 0 },
    { label: '+1R to +2R', min: 1.0001, max: 2.0, count: 0 },
    { label: '+2R to +3R', min: 2.0001, max: 3.0, count: 0 },
    { label: '> +3R', min: 3.0001, max: Infinity, count: 0 },
  ];

  rValues.forEach(r => {
    const val = Number(r);
    if (isNaN(val)) return;

    for (const b of buckets) {
      if (val >= b.min && val <= b.max) {
        b.count += 1;
        break;
      }
    }
  });

  return buckets.map(b => ({ bucket: b.label, count: b.count }));
}

/**
 * Filters trade collection according to criteria
 */
export function filterTrades(trades = [], filters = {}) {
  return trades.filter(trade => {
    // Market filter
    if (filters.market && filters.market !== 'ALL') {
      const m = String(trade.market || '').toUpperCase();
      const filterM = String(filters.market).toUpperCase();
      if (!m.includes(filterM)) return false;
    }

    // Strategy filter
    if (filters.strategy && filters.strategy !== 'ALL') {
      if (trade.strategy !== filters.strategy) return false;
    }

    // Trade Type (Planned vs Experimental)
    if (filters.tradeType && filters.tradeType !== 'ALL') {
      if (String(trade.tradeType).toLowerCase() !== String(filters.tradeType).toLowerCase()) return false;
    }

    // Direction (Long vs Short)
    if (filters.direction && filters.direction !== 'ALL') {
      if (String(trade.direction).toLowerCase() !== String(filters.direction).toLowerCase()) return false;
    }

    // Outcome (Win, Loss, Breakeven)
    if (filters.outcome && filters.outcome !== 'ALL') {
      if (String(trade.outcome).toLowerCase() !== String(filters.outcome).toLowerCase()) return false;
    }

    // Rule Compliance
    if (filters.ruleCompliant && filters.ruleCompliant !== 'ALL') {
      if (String(trade.ruleCompliant).toLowerCase() !== String(filters.ruleCompliant).toLowerCase()) return false;
    }

    // Record Status (Complete, Draft, Excluded)
    if (filters.recordStatus && filters.recordStatus !== 'ALL') {
      if (trade.recordStatus !== filters.recordStatus) return false;
    }

    // Date Range (startDate, endDate)
    if (filters.startDate) {
      const tradeDate = new Date(trade.tradeDatetime || trade.createdAt);
      const start = new Date(filters.startDate);
      if (tradeDate < start) return false;
    }

    if (filters.endDate) {
      const tradeDate = new Date(trade.tradeDatetime || trade.createdAt);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (tradeDate > end) return false;
    }

    // Search query
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase();
      const matchMarket = (trade.market || '').toLowerCase().includes(q);
      const matchStrategy = (trade.strategy || '').toLowerCase().includes(q);
      const matchNotes = (trade.entryReason || '').toLowerCase().includes(q) || (trade.lesson || '').toLowerCase().includes(q);
      const matchId = (trade.id || '').toLowerCase().includes(q);
      if (!matchMarket && !matchStrategy && !matchNotes && !matchId) return false;
    }

    return true;
  });
}

/**
 * Formats a currency value with standard institutional symbols and signs
 */
export function formatCurrency(amount, currencySymbol = '$', decimals = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }
  const num = Number(amount);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  const absFormatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${currencySymbol}${absFormatted}`;
}

/**
 * Formats R multiple string: e.g. +2.45R, -1.00R, 0.00R
 */
export function formatR(rValue) {
  if (rValue === null || rValue === undefined || isNaN(rValue)) {
    return 'N/A';
  }
  const num = Number(rValue);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}${Math.abs(num).toFixed(2)}R`;
}

/**
 * Decimal safe helper
 */
function roundTo(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((Number(val) + Number.EPSILON) * factor) / factor;
}
