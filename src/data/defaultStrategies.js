export const DEFAULT_STRATEGIES = [
  {
    id: 'strat-1',
    name: 'BTC EMA Confirmation',
    version: 'v1.2',
    market: 'BTC/USDT',
    timeframe: '15m',
    status: 'active',
    description: 'Trend-continuation entry following 21/55 EMA bullish or bearish alignment with RSI confirmation.',
    rules: [
      'Enter only in direction of 4H market structure.',
      'Wait for 15m pullback to 21 EMA with bullish/bearish candle closure.',
      'Stop-loss strictly placed beyond structural swing high/low.',
      'Minimum planned 1:2 Reward-to-Risk ratio.'
    ],
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'strat-2',
    name: 'Gold S/R Liquidity Sweep',
    version: 'v2.0',
    market: 'XAU/USD',
    timeframe: '5m',
    status: 'active',
    description: 'Counter-trend or reversal entry after institutional liquidity run above Asian highs or below lows.',
    rules: [
      'Identify Asian session high/low liquidity pools.',
      'Wait for sweep during London or NY session open.',
      'Look for displacement back inside key range within 5m.',
      'Risk capped at 1.0% of total account equity.'
    ],
    createdAt: '2026-09-05T08:00:00Z',
  },
  {
    id: 'strat-3',
    name: 'BTC Orderblock Retest',
    version: 'v1.0',
    market: 'BTC/USDT',
    timeframe: '1H',
    status: 'active',
    description: 'High timeframe institutional supply/demand order block mitigation with volume spike.',
    rules: [
      'Identify unbroken 1H breaker or order block with fair value gap.',
      'Enter on limit order upon 50% equilibrium test.',
      'Invalidated if 1H body closes beyond the block.',
      'Take partials at opposing liquidity.'
    ],
    createdAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'strat-4',
    name: 'Gold London Open Breakout',
    version: 'v1.1',
    market: 'XAU/USD',
    timeframe: '15m',
    status: 'active',
    description: 'Momentum breakout during London 08:00 UTC session opening expansion.',
    rules: [
      'Trade only between 07:45 UTC and 09:30 UTC.',
      'Breakout candle must close with high relative volume.',
      'Trail stop to breakeven once +1R is secured.'
    ],
    createdAt: '2026-09-12T08:00:00Z',
  }
];

export const DEFAULT_MARKETS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin / Tether Spot & Perp', baseCurrency: 'BTC', quoteCurrency: 'USDT', defaultUnit: 'BTC', contractSize: 1 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar Spot & CFD', baseCurrency: 'XAU', quoteCurrency: 'USD', defaultUnit: 'oz', contractSize: 100 },
  { symbol: 'ETH/USDT', name: 'Ethereum / Tether', baseCurrency: 'ETH', quoteCurrency: 'USDT', defaultUnit: 'ETH', contractSize: 1 }
];

export const DEFAULT_RISK_SETTINGS = {
  currency: 'USD',
  currencySymbol: '$',
  defaultAccountEquity: 25000,
  maxRiskPerTradePercent: 1.0,
  maxDailyLoss: 750,
  maxOpenPositions: 3,
  breakevenTolerance: 1.0,
};
