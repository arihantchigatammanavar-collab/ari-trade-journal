# ARI TRADING JOURNAL — Premium Fintech Web Application

> **Product Principle:** *Record first. Calculate transparently. Review objectively. Never confuse a profitable outcome with good execution, or a losing outcome with a bad decision.*

Ari Trading Journal is an institutional-grade trading research, risk analytics, and psychology tracking platform designed for active Bitcoin and Gold traders. Built strictly according to the **Trading Journal Platform Blueprint v1.0**.

---

## 1. Visual & Design Direction — Premium Glassmorphism

- **Color Palette:** Deep midnight navy (`#07090e`, `#0c1322`), translucent layered surfaces, fine borders (`rgba(255,255,255,0.08)`), and electric-blue accents (`#38bdf8`, `#3b82f6`).
- **Financial Contrast:** Emerald green (`#10b981`) for positive P&L and rose red (`#ef4444`) for losses, accompanied by signed numeric values (`+$...`, `-$...`, `+1.85R`).
- **Institutional Typography:** Inter for clean user interface readability paired with JetBrains Mono for tabular financial numbers and prices.
- **Micro-Interactions:** Subtle backdrop blurs (12–16px), smooth hover states, responsive layout across desktop, tablet, and mobile.

---

## 2. Core Architecture & Features

### 1. Dashboard
- **8 Core Performance Cards:** Net P&L (after fees), Records Audit (Completed vs Drafts), Win Rate %, Average Realised R, Expectancy per trade, Profit Factor (displays `N/A` if no losses, never infinity), Maximum Drawdown (absolute $ and peak %), and Rule Compliance Rate %.
- **Interactive Visualizations:**
  - Chronological **Cumulative P&L / Equity Curve** with gradient fill and custom tooltip.
  - **Outcome Distribution Donut Chart** (Wins, Losses, Breakevens).
  - **Monthly Net P&L Bar Chart** with zero baseline.
- **Recent Trades Table** with quick status tags, direction badges, and detail inspection.

### 2. Add Trade (1–2 Minute Fast Workflow)
- **Section 1: Setup & Market:** Datetime, timezone, market (`BTC/USDT`, `XAU/USD`), platform (`CoinDCX`, `Exness`, `Binance`), Long/Short direction toggle, strategy versioning, trade classification (Planned vs Experimental), timeframe, session.
- **Section 2: Execution & Risk:** Entry, exit, position size with market units, stop-loss, take-profit, planned monetary risk, account equity, exchange fees, funding/slippage costs, and explicit **"Fees Unknown"** checkbox (never silently assumed 0).
- **Section 3: Real-Time Live Calculation Audit:** Live pre-save preview card displaying Gross P&L, Net P&L, Planned R:R, Realised R-multiple, Risk % of Account, and outcome classification.
- **Section 4: Psychology Checklist:** Setup validity under written rules (`Yes`/`No`/`Unsure`), Rule compliance status (`Yes`/`No`/`Partial`/`Unknown`), multi-select emotion tags (`Calm`, `Fear`, `FOMO`, `Greed`, `Frustration`, `Revenge Urge`, etc.), impulsive entry flag, revenge urge flag, entry thesis, and specific lesson learned.
- **Section 5: Chart Evidence:** Before-entry and After-exit screenshot uploads with captions, previews, and full-resolution modal zoom.
- **Fast Path:** Ability to save as incomplete **Draft** or verified **Complete** trade.

### 3. Trade History & Details
- Searchable and multi-filter table (Market, Strategy, Direction, Outcome, Compliance, Status).
- Sorting by date, Net P&L, and Realised R-multiple.
- Pagination with customizable items-per-page.
- Row actions: Full detail inspection, editing existing trades, excluding trades with mandatory recorded reasons, and deletion with safe confirmation dialog.
- **Trade Detail Modal:** Side-by-side Before/After chart comparisons, plan vs execution audit table, cost breakdown, emotion tags, and empirical lessons.
- **1-Click CSV Export.**

### 4. Dedicated Analytics
- Chronological Equity Curve & Underwater Drawdown Curve.
- Realised R-Multiple Distribution Histogram (`<-2R`, `-1R`, `0R`, `+1R`, `+2R`, `+3R+`).
- **4-Quadrant Discipline Matrix:** Separating execution process from luck:
  1. *Compliant Win* (Edge working)
  2. *Compliant Loss* (Normal cost of business)
  3. *Rule-Violating Win* ("Fool's Gold" - dangerous reinforcement of bad habits)
  4. *Rule-Violating Loss* (Avoidable leaks)
- **Bitcoin vs Gold Head-to-Head Comparison:** Normalized sample size, win rate, expectancy, and profit factor.
- **Strategy Comparison Table:** Individual performance metrics per strategy version.
- **Emotion vs Outcomes Analysis:** Average net profit and win rate grouped by mindset at entry.
- **Session Analysis:** London, New York, Asian, and Overlap performance.

### 5. Psychology & Empirical Wisdom
- Behavioral cost audit: Net P&L on rule-compliant trades vs Cost of Undiscipline on rule-violating trades.
- Impulsive & Revenge trading frequency monitors.
- Emotion frequency breakdown with progress bars.
- Searchable Wisdom Journal of lessons learned from real executions.

### 6. Periodic Reviews & Audits
- **10-Trade Micro Audit:** Selects the last 10 completed trades, checks risk discipline, records key observations, and commits to a single actionable rule for the next 10 trades.
- **100-Trade Milestone Audit:** Evaluates market regime diversity, sample size stability, and strategy robustness with prominent statistical caution warnings.
- **Audit Log Trail:** Persistent storage of historical reviews and commitments.

### 7. Settings & Data Management
- Risk limits: Currency selection (`$`, `€`, `£`, `₹`), default equity, max risk % per trade, daily loss limit, and breakeven tolerance.
- Strategy Version Manager: Create and version strategies with written rules and default timeframes.
- Data Persistence & Backup:
  - Real Node.js file-backed persistence (`data/trades.json`, `data/strategies.json`, `data/reviews.json`).
  - Full database JSON export and restore.
  - Reset to 18 verified blueprint demo trades.
  - Safe database wipe with confirmation.
  - Privacy by design disclosures (zero external telemetry, local file storage).

---

## 3. Mathematical Safeguards & Formula Definitions

Implemented once in a shared, tested calculation engine (`src/utils/calculations.js`):
- **Gross P&L (Long):** `(Exit Price - Entry Price) * Quantity`
- **Gross P&L (Short):** `(Entry Price - Exit Price) * Quantity`
- **Net P&L:** `Gross P&L - Fees - Other Costs` (if fees unknown, flagged with warning).
- **Realised R-Multiple:** `Net P&L / Valid Planned Monetary Risk` (when planned risk > 0; returns explanation if missing or zero, preventing division by zero).
- **Profit Factor:** `Sum of Positive Net P&L / |Sum of Negative Net P&L|` (displays `N/A` if no losing trades, **never infinity**).
- **Drawdown:** Running peak-to-trough decline across chronological cumulative P&L.
- **Compliance Rate:** `Known Compliant Trades / Known Status Trades * 100` (Unknown status is strictly **not** compliant).

---

## NVIDIA AI Assistant Setup

The optional AI Assistant sends a bounded journal summary and up to 18 recent journal-note records to NVIDIA's OpenAI-compatible chat endpoint. Ari calculates headline statistics locally from the persisted `data/trades.json` records before each request. Trade IDs, screenshots, broker details, and account identifiers are omitted. Common email addresses, URLs, and long number patterns in journal text are redacted; review free-text notes before enabling the integration because other personal details may still be included when relevant to your notes.

1. Copy `.env.example` to `.env` on the machine running Ari's server.
2. Set `NVIDIA_API_KEY` to your NVIDIA API key in `.env`.
3. Keep `.env` private; it is excluded by `.gitignore`.
4. Run the backend with `npm run server`. Node loads `.env` for this command. Do not put the key in frontend files or Vite environment variables.

The key is sent to NVIDIA only in the server-side HTTPS `Authorization` header required to authenticate the API request. It is not included in the model prompt, returned to the browser, or logged by Ari.

`NVIDIA_MODEL` is optional. The default is `nvidia/nemotron-3.5-lightning-30b-a3b`, an efficient text model that NVIDIA currently lists with a free hosted endpoint for chat completions. Model access can depend on your NVIDIA account; if NVIDIA rejects the model, set `NVIDIA_MODEL` to a chat model enabled for your account and restart the server. See the [NVIDIA model catalog](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b) and [Chat Completions API reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b-infer).

If no key is configured, the assistant displays setup instructions and the journal remains available. AI responses are informational interpretations; calculated metrics are displayed separately, and the assistant cannot edit trades or place orders.

## 4. How to Run the Application

### 1. Run Automated Calculation Tests
```bash
npm test
```
Executes the test suite verifying all 8 core formulas against blueprint edge cases.

### 2. Build the Application
```bash
npm run build
```

### 3. Start the Server (Backend API + Frontend SPA)
```bash
npm run server
```
Open your browser to:
```
http://localhost:5001
```

### 4. Development Mode with Hot Reloading
```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start Vite dev server
npm run dev
```
Open your browser to `http://localhost:3000`.
