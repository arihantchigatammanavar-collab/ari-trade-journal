import assert from 'node:assert/strict';
import {
  calculateGrossPnL,
  calculateNetPnL,
  calculatePlannedRisk,
  calculatePlannedRR,
  calculateRealisedR,
  classifyOutcome,
  calculatePerformanceSummary,
  buildEquityAndDrawdownCurves
} from '../src/utils/calculations.js';

console.log('--- RUNNING BLUEPRINT CALCULATION ACCURACY TESTS ---');

// Test 1: Long trade with profit
{
  const gross = calculateGrossPnL({ direction: 'Long', entryPrice: 90000, exitPrice: 92000, quantity: 0.1 });
  assert.equal(gross, 200, 'Long gross P&L should be 200');
  const net = calculateNetPnL({ grossPnL: gross, fees: 12, otherCosts: 0 });
  assert.equal(net, 188, 'Net P&L after $12 fee should be 188');
  console.log('✓ Test 1: Long trade with profit passed');
}

// Test 2: Short trade with profit
{
  const gross = calculateGrossPnL({ direction: 'Short', entryPrice: 2650, exitPrice: 2620, quantity: 5 });
  assert.equal(gross, 150, 'Short gross P&L should be 150');
  const net = calculateNetPnL({ grossPnL: gross, fees: 10, otherCosts: 2 });
  assert.equal(net, 138, 'Net P&L should be 138');
  console.log('✓ Test 2: Short trade with profit passed');
}

// Test 3: Losing trade and Realised R
{
  const gross = calculateGrossPnL({ direction: 'Long', entryPrice: 91000, exitPrice: 90500, quantity: 0.2 });
  assert.equal(gross, -100, 'Gross loss should be -100');
  const net = calculateNetPnL({ grossPnL: gross, fees: 10, otherCosts: 0 });
  assert.equal(net, -110, 'Net loss should be -110');
  const outcome = classifyOutcome(net);
  assert.equal(outcome, 'loss', 'Should classify as loss');
  const r = calculateRealisedR({ netPnL: net, plannedRisk: 100 });
  assert.equal(r.value, -1.1, 'Realised R should be -1.1R');
  console.log('✓ Test 3: Losing trade and Realised R passed');
}

// Test 4: Breakeven after fees
{
  const gross = calculateGrossPnL({ direction: 'Long', entryPrice: 100, exitPrice: 101, quantity: 10 }); // +10 gross
  const net = calculateNetPnL({ grossPnL: gross, fees: 10, otherCosts: 0 }); // 0 net
  assert.equal(net, 0, 'Net P&L should be 0');
  const outcome = classifyOutcome(net);
  assert.equal(outcome, 'breakeven', 'Should classify as breakeven within tolerance');
  console.log('✓ Test 4: Breakeven after fees passed');
}

// Test 5: Zero or missing planned risk (Safeguard: Never divide by zero)
{
  const rZero = calculateRealisedR({ netPnL: 200, plannedRisk: 0 });
  assert.equal(rZero.value, null, 'Realised R should be null when planned risk is 0');
  assert.ok(rZero.reason.includes('Valid planned risk'), 'Reason should be provided');

  const rMissing = calculateRealisedR({ netPnL: 200, plannedRisk: null });
  assert.equal(rMissing.value, null, 'Realised R should be null when planned risk is null');
  console.log('✓ Test 5: Zero or missing planned risk safe guard passed');
}

// Test 6: Profit factor with NO losing trades (Blueprint: "Must show N/A, not infinity")
{
  const allWinningTrades = [
    { recordStatus: 'complete', netPnL: 150, grossPnL: 160, fees: 10, outcome: 'win', ruleCompliant: 'yes' },
    { recordStatus: 'complete', netPnL: 250, grossPnL: 260, fees: 10, outcome: 'win', ruleCompliant: 'yes' }
  ];
  const summary = calculatePerformanceSummary(allWinningTrades);
  assert.equal(summary.profitFactor, 'N/A', 'Profit factor must be N/A when there are no losses, not Infinity');
  console.log('✓ Test 6: Profit factor N/A without losses passed');
}

// Test 7: Compliance rate calculation (Blueprint: "Unknown status is not compliant")
{
  const trades = [
    { recordStatus: 'complete', netPnL: 100, outcome: 'win', ruleCompliant: 'yes' },
    { recordStatus: 'complete', netPnL: -50, outcome: 'loss', ruleCompliant: 'no' },
    { recordStatus: 'complete', netPnL: 120, outcome: 'win', ruleCompliant: 'partial' },
    { recordStatus: 'complete', netPnL: 80, outcome: 'win', ruleCompliant: 'unknown' }
  ];
  // Known statuses: 'yes', 'no', 'partial' = 3 trades. Known compliant: 1 ('yes').
  // Compliance rate = 1 / 3 * 100 = 33.3%
  const summary = calculatePerformanceSummary(trades);
  assert.equal(summary.complianceRate, 33.3, 'Compliance rate should only count yes against known status');
  console.log('✓ Test 7: Compliance rate calculation passed');
}

// Test 8: Maximum Drawdown calculation
{
  const trades = [
    { tradeDatetime: '2026-10-01T10:00:00Z', netPnL: 100, recordStatus: 'complete' }, // Peak = 100
    { tradeDatetime: '2026-10-02T10:00:00Z', netPnL: -40, recordStatus: 'complete' }, // Cum = 60, DD = 40
    { tradeDatetime: '2026-10-03T10:00:00Z', netPnL: -30, recordStatus: 'complete' }, // Cum = 30, DD = 70
    { tradeDatetime: '2026-10-04T10:00:00Z', netPnL: 80, recordStatus: 'complete' },  // Cum = 110, New Peak = 110
    { tradeDatetime: '2026-10-05T10:00:00Z', netPnL: -20, recordStatus: 'complete' }, // Cum = 90, DD = 20
  ];
  const curves = buildEquityAndDrawdownCurves(trades);
  assert.equal(curves.maxDrawdownAmount, 70, 'Max drawdown amount should be 70');
  console.log('✓ Test 8: Maximum Drawdown calculation passed');
}

console.log('--- ALL BLUEPRINT FORMULA TESTS PASSED SUCCESSFULLY! ---');
