import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

const DEFAULT_SETTINGS = {
  currency: 'USD', currencySymbol: '$', defaultAccountEquity: 25000,
  maxRiskPerTradePercent: 1, maxDailyLoss: 750, maxOpenPositions: 3,
  breakevenTolerance: 1,
};

function csvCell(value) {
  const text = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function createAriRouter({ rootDir }) {
  const router = Router();
  const dataDir = path.join(rootDir, 'data');
  const uploadDir = path.join(rootDir, 'uploads');
  const files = {
    trades: path.join(dataDir, 'trades.json'),
    strategies: path.join(dataDir, 'strategies.json'),
    reviews: path.join(dataDir, 'reviews.json'),
    settings: path.join(dataDir, 'settings.json'),
  };

  const read = (key, fallback) => {
    try {
      const value = JSON.parse(fs.readFileSync(files[key], 'utf8'));
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return fallback;
      throw error;
    }
  };
  const write = (key, value) => {
    fs.mkdirSync(dataDir, { recursive: true });
    const temporary = `${files[key]}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(temporary, files[key]);
  };
  const id = () => crypto.randomUUID();

  const storage = multer.diskStorage({
    destination: (_req, _file, done) => {
      fs.mkdirSync(uploadDir, { recursive: true });
      done(null, uploadDir);
    },
    filename: (_req, file, done) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
      done(null, `${id()}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, done) => {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)) {
        return done(new Error('Upload a PNG, JPEG, WebP, or GIF image.'));
      }
      done(null, true);
    },
  });

  router.get('/health', (_req, res) => res.json({ status: 'online', product: 'Ari Trading Journal' }));
  router.get('/trades', (_req, res) => res.json(read('trades', [])));
  router.post('/trades', (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'A trade record is required.' });
    }
    const trades = read('trades', []);
    const trade = { ...req.body, id: req.body.id || `TR-${id().slice(0, 8).toUpperCase()}` };
    if (trades.some(item => item.id === trade.id)) return res.status(409).json({ error: 'A trade with that ID already exists.' });
    trades.unshift(trade);
    write('trades', trades);
    res.status(201).json(trade);
  });
  router.put('/trades/:id', (req, res) => {
    const trades = read('trades', []);
    const index = trades.findIndex(trade => String(trade.id) === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Trade record not found.' });
    trades[index] = { ...trades[index], ...req.body, id: trades[index].id };
    write('trades', trades);
    res.json(trades[index]);
  });
  router.delete('/trades/:id', (req, res) => {
    const trades = read('trades', []);
    const next = trades.filter(trade => String(trade.id) !== req.params.id);
    if (next.length === trades.length) return res.status(404).json({ error: 'Trade record not found.' });
    write('trades', next);
    res.json({ success: true });
  });

  router.get('/strategies', (_req, res) => res.json(read('strategies', [])));
  router.post('/strategies', (req, res) => {
    if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Strategy name is required.' });
    const strategies = read('strategies', []);
    const strategy = { ...req.body, id: req.body.id || id(), name: req.body.name.trim(), createdAt: req.body.createdAt || new Date().toISOString() };
    strategies.push(strategy);
    write('strategies', strategies);
    res.status(201).json(strategy);
  });

  router.get('/reviews', (_req, res) => res.json(read('reviews', [])));
  router.post('/reviews', (req, res) => {
    const reviews = read('reviews', []);
    const review = { ...req.body, id: req.body.id || id(), createdAt: new Date().toISOString() };
    reviews.unshift(review);
    write('reviews', reviews);
    res.status(201).json(review);
  });

  router.get('/settings', (_req, res) => res.json({ ...DEFAULT_SETTINGS, ...read('settings', {}) }));
  router.put('/settings', (req, res) => {
    const settings = { ...DEFAULT_SETTINGS, ...read('settings', {}), ...req.body };
    write('settings', settings);
    res.json(settings);
  });

  router.get('/backup', (_req, res) => {
    const backup = {
      appName: 'Ari Trading Journal', exportedAt: new Date().toISOString(), version: '1.0.0',
      trades: read('trades', []), strategies: read('strategies', []),
      reviews: read('reviews', []), settings: { ...DEFAULT_SETTINGS, ...read('settings', {}) },
    };
    res.setHeader('Content-Disposition', 'attachment; filename="ari-trading-journal-backup.json"');
    res.json(backup);
  });
  router.post('/restore', (req, res) => {
    const backup = req.body;
    if (!backup || !['Ari Trading Journal', undefined].includes(backup.appName)) {
      return res.status(400).json({ error: 'This file is not an Ari Trading Journal backup.' });
    }
    for (const key of ['trades', 'strategies', 'reviews']) {
      if (backup[key] !== undefined && !Array.isArray(backup[key])) {
        return res.status(400).json({ error: `Backup field ${key} must be an array.` });
      }
    }
    if (backup.settings !== undefined && (typeof backup.settings !== 'object' || Array.isArray(backup.settings))) {
      return res.status(400).json({ error: 'Backup settings must be an object.' });
    }
    for (const key of ['trades', 'strategies', 'reviews', 'settings']) {
      if (backup[key] !== undefined) write(key, backup[key]);
    }
    res.json({ success: true, restoredTrades: backup.trades?.length });
  });

  router.get('/trades.csv', (_req, res) => {
    const trades = read('trades', []);
    const columns = ['id', 'tradeDatetime', 'market', 'strategy', 'direction', 'entryPrice', 'exitPrice', 'quantity', 'grossPnL', 'netPnL', 'realisedR', 'outcome', 'ruleCompliant', 'emotionTags', 'lesson'];
    const csv = [columns.join(','), ...trades.map(trade => columns.map(key => csvCell(trade[key])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ari-trades.csv"');
    res.send(csv);
  });
  router.post('/screenshots', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });

  return router;
}
