/**
 * Email Tracking Admin API Routes
 * 
 * Provides endpoints for the admin panel to view email tracking metrics:
 * - GET /api/admin/tracking/metrics — Detailed metrics by category/language/email
 * - GET /api/admin/tracking/summary — Summary totals (opens, clicks, rates)
 * - GET /api/admin/tracking/events — Recent tracking events
 * - GET /api/admin/tracking/daily — Daily metrics for charts
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware');
const trackingService = require('../services/email-tracking');

// GET /api/admin/tracking/metrics — Detailed metrics by category/language/emailNum
router.get('/api/admin/tracking/metrics', authenticateToken, async (req, res) => {
  try {
    const { category, language, dateFrom, dateTo } = req.query;
    const metrics = await trackingService.getMetrics({ category, language, dateFrom, dateTo });
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error getting tracking metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/tracking/summary — Summary metrics (aggregated totals)
router.get('/api/admin/tracking/summary', authenticateToken, async (req, res) => {
  try {
    const rows = await trackingService.getSummaryMetrics();
    // Aggregate all rows into a single summary object
    const totals = rows.reduce((acc, row) => {
      acc.total_sent += row.total_sent || 0;
      acc.unique_opens += row.unique_opens || 0;
      acc.unique_clicks += row.unique_clicks || 0;
      acc.unique_contacts += row.unique_contacts || 0;
      acc.contacts_opened += row.contacts_opened || 0;
      acc.contacts_clicked += row.contacts_clicked || 0;
      return acc;
    }, { total_sent: 0, unique_opens: 0, unique_clicks: 0, unique_contacts: 0, contacts_opened: 0, contacts_clicked: 0 });
    
    totals.open_rate = totals.total_sent > 0 ? (totals.unique_opens / totals.total_sent * 100).toFixed(1) : '0.0';
    totals.click_rate = totals.total_sent > 0 ? (totals.unique_clicks / totals.total_sent * 100).toFixed(1) : '0.0';
    
    res.json({ success: true, data: totals, breakdown: rows });
  } catch (error) {
    console.error('Error getting tracking summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/tracking/events — Recent events
router.get('/api/admin/tracking/events', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const events = await trackingService.getRecentEvents(limit);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error getting tracking events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/tracking/daily — Daily metrics for charts
router.get('/api/admin/tracking/daily', authenticateToken, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const daily = await trackingService.getDailyMetrics(days);
    res.json({ success: true, data: daily });
  } catch (error) {
    console.error('Error getting daily metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
