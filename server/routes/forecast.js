/**
 * NexaERP — Demand Forecast Routes (AI Analytics)
 * Lightweight time-series forecasting using moving averages + exponential smoothing
 */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const Order  = require('../models/Order');
const Product = require('../models/Product');

// In-memory cache (1 hour TTL)
const forecastCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getCached(key) {
  const entry = forecastCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

// ─── Forecasting Algorithms ─────────────────────────────────────
function exponentialSmoothing(series, alpha = 0.3) {
  if (!series.length) return [];
  const smoothed = [series[0]];
  for (let i = 1; i < series.length; i++) {
    smoothed.push(alpha * series[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

function movingAverage(series, window = 7) {
  return series.map((_, i) => {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

function predictNextN(series, n = 7, alpha = 0.3) {
  if (series.length < 3) return Array(n).fill(series[series.length - 1] || 0);
  const smoothed = exponentialSmoothing(series, alpha);
  const last = smoothed[smoothed.length - 1];
  const trend = (smoothed[smoothed.length - 1] - smoothed[Math.max(0, smoothed.length - 8)]) / Math.min(7, smoothed.length - 1);
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(last + trend * (i + 1))));
}

// ─── GET /api/forecast/product/:id ──────────────────────────────
router.get('/product/:id', auth, async (req, res) => {
  try {
    const cacheKey = `product-${req.params.id}-${req.user.storeId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    // Get last 90 days of sales for this product
    const since = new Date(); since.setDate(since.getDate() - 90);
    const orders = await Order.find({ storeId: req.user.storeId, createdAt: { $gte: since } });

    // Build daily sales series
    const dailySales = {};
    for (let d = 0; d < 90; d++) {
      const day = new Date(); day.setDate(day.getDate() - (89 - d));
      dailySales[day.toISOString().split('T')[0]] = 0;
    }

    for (const order of orders) {
      const day = order.createdAt.toISOString().split('T')[0];
      const item = (order.items || []).find(i => String(i.productId) === req.params.id);
      if (item && dailySales[day] !== undefined) dailySales[day] += item.quantity;
    }

    const series = Object.values(dailySales);
    const labels = Object.keys(dailySales);
    const smoothed = exponentialSmoothing(series);
    const ma7 = movingAverage(series, 7);
    const forecast7 = predictNextN(series, 7);

    const product = await Product.findById(req.params.id).select('name sku stock reorderLevel');
    const avgDaily = series.reduce((s, v) => s + v, 0) / series.length;
    const daysOfStock = product ? Math.floor(product.stock / Math.max(0.1, avgDaily)) : null;
    const reorderIn = product && product.reorderLevel
      ? Math.max(0, Math.floor((product.stock - product.reorderLevel) / Math.max(0.1, avgDaily)))
      : null;

    const result = {
      product, labels, series, smoothed, ma7, forecast7,
      avgDailySales: Math.round(avgDaily * 10) / 10,
      daysOfStock,
      reorderIn,
      totalSold90d: series.reduce((s, v) => s + v, 0),
      trend: forecast7[6] > forecast7[0] ? 'increasing' : forecast7[6] < forecast7[0] ? 'decreasing' : 'stable',
    };

    forecastCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/forecast/overview — top products forecast + reorder alerts
router.get('/overview', auth, async (req, res) => {
  try {
    const cacheKey = `overview-${req.user.storeId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const since = new Date(); since.setDate(since.getDate() - 30);
    const products = await Product.find({ storeId: req.user.storeId, isActive: true })
      .select('name sku stock reorderLevel category').limit(50);
    const orders = await Order.find({ storeId: req.user.storeId, createdAt: { $gte: since } });

    // Build sales map per product
    const salesMap = {};
    for (const o of orders) {
      for (const item of (o.items || [])) {
        const pid = String(item.productId);
        if (!salesMap[pid]) salesMap[pid] = 0;
        salesMap[pid] += item.quantity;
      }
    }

    const forecasted = products.map(p => {
      const sold30 = salesMap[String(p._id)] || 0;
      const avgDaily = sold30 / 30;
      const daysOfStock = avgDaily > 0 ? Math.floor(p.stock / avgDaily) : 999;
      const predicted7d = Math.round(avgDaily * 7);
      const status = daysOfStock <= 7 ? 'critical' : daysOfStock <= 14 ? 'warning' : 'ok';
      return { product: p, sold30d: sold30, avgDaily: Math.round(avgDaily * 10) / 10, daysOfStock, predicted7d, status };
    });

    forecasted.sort((a, b) => a.daysOfStock - b.daysOfStock);

    const result = {
      totalProducts: products.length,
      criticalItems: forecasted.filter(f => f.status === 'critical').length,
      warningItems: forecasted.filter(f => f.status === 'warning').length,
      items: forecasted,
    };

    forecastCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/forecast/trends — 30-day sales trend chart data
router.get('/trends', auth, async (req, res) => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const orders = await Order.find({ storeId: req.user.storeId, createdAt: { $gte: since } });

    const days = {};
    for (let d = 29; d >= 0; d--) {
      const day = new Date(); day.setDate(day.getDate() - d);
      const label = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      days[label] = { revenue: 0, orders: 0, units: 0 };
    }

    for (const o of orders) {
      const label = o.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (days[label]) {
        days[label].revenue += o.total || 0;
        days[label].orders++;
        days[label].units += (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
      }
    }

    const labels = Object.keys(days);
    const revenue = labels.map(l => days[l].revenue);
    const ordersCount = labels.map(l => days[l].orders);
    const forecast7 = predictNextN(revenue, 7);
    const forecastLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i + 1);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    });

    res.json({ success: true, data: { labels, revenue, orders: ordersCount, forecast7, forecastLabels } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
