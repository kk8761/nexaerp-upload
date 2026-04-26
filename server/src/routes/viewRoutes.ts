/**
 * View Routes - Server-side rendering routes
 */

import { Router } from 'express';
import { ViewController } from '../controllers/ViewController';
import path from 'path';

const router = Router();

// ─── Authentication Pages ──────────────────────────────────
// Home/Login page
router.get('/', ViewController.renderHome);
router.get('/login', ViewController.renderHome);
router.get('/register', ViewController.renderHome);

// MFA Setup and Session Management
router.get('/mfa/setup', (_req, res) => {
  res.render('pages/mfa-setup');
});
router.get('/mfa/verify', (_req, res) => {
  res.render('pages/mfa-verify');
});
router.get('/mfa/manage', (_req, res) => {
  res.render('pages/mfa-manage');
});
router.get('/sessions', (_req, res) => {
  res.render('pages/sessions');
});

// ─── Dashboard & Main Pages ────────────────────────────────
// Dashboard page
router.get('/dashboard', ViewController.renderDashboard);

// ─── Static Pages ──────────────────────────────────────────
// Landing page (static HTML for now)
router.get('/landing', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../../landing.html'));
});

// ─── Module Pages (Placeholder routes for future implementation) ───
// CRM Module
router.get('/crm/leads', ViewController.renderPlaceholder('CRM - Leads'));
router.get('/crm/opportunities', ViewController.renderOpportunities);
router.get('/crm/opportunities/new', ViewController.renderOpportunityForm);
router.get('/crm/opportunities/:id', ViewController.renderOpportunityDetail);
router.get('/crm/opportunities/:id/edit', ViewController.renderOpportunityForm);
router.get('/crm/customers', ViewController.renderPlaceholder('CRM - Customers'));

// Inventory Module
router.get('/inventory/products', ViewController.renderPlaceholder('Inventory - Products'));
router.get('/inventory/warehouses', ViewController.renderPlaceholder('Inventory - Warehouses'));
router.get('/inventory/stock', ViewController.renderPlaceholder('Inventory - Stock'));

// Warehouse Management System
router.get('/warehouse/management', (_req, res) => {
  res.render('pages/warehouse-management');
});

// Product Management Module
router.get('/products', (_req, res) => {
  res.render('pages/products');
});
router.get('/products/categories', (_req, res) => {
  res.render('pages/product-categories');
});
router.get('/products/attributes', (_req, res) => {
  res.render('pages/product-attributes');
});
router.get('/products/new', (_req, res) => {
  res.render('pages/product-form', { mode: 'create', productId: null });
});
router.get('/products/:id', (req, res) => {
  res.render('pages/product-detail', { productId: req.params.id });
});
router.get('/products/:id/edit', (req, res) => {
  res.render('pages/product-form', { mode: 'edit', productId: req.params.id });
});

// Order Management Module
router.get('/orders', (_req, res) => {
  res.render('pages/orders');
});
router.get('/orders/:id', (req, res) => {
  res.render('pages/order-detail', { orderId: req.params.id });
});

// Manufacturing Module
router.get('/manufacturing/bom', ViewController.renderPlaceholder('Manufacturing - BOM'));
router.get('/manufacturing/production', ViewController.renderPlaceholder('Manufacturing - Production Orders'));

// Finance Module
router.get('/finance/accounts', ViewController.renderPlaceholder('Finance - Accounts'));
router.get('/finance/invoices', ViewController.renderPlaceholder('Finance - Invoices'));
router.get('/finance/reports', ViewController.renderPlaceholder('Finance - Reports'));
router.get('/finance/bank-reconciliations', ViewController.renderBankReconciliations);
router.get('/finance/bank-reconciliations/:statementId', ViewController.renderBankReconciliationDetail);

// Financial Statements
router.get('/finance/financial-statements', (_req, res) => {
  res.render('pages/financial-statements');
});

// Budget Management
router.get('/finance/budgets', (_req, res) => {
  res.render('pages/budgets');
});
router.get('/finance/budgets/new', (_req, res) => {
  res.render('pages/budget-form');
});
router.get('/finance/budgets/:id', (req, res) => {
  res.render('pages/budget-detail', { budgetId: req.params.id });
});

// Fixed Asset Management
router.get('/finance/fixed-assets', (_req, res) => {
  res.render('pages/fixed-assets');
});
router.get('/finance/fixed-assets/new', (_req, res) => {
  res.render('pages/fixed-asset-form', { mode: 'create', assetId: null });
});
router.get('/finance/fixed-assets/:id', (req, res) => {
  res.render('pages/fixed-asset-detail', { assetId: req.params.id });
});
router.get('/finance/fixed-assets/:id/edit', (req, res) => {
  res.render('pages/fixed-asset-form', { mode: 'edit', assetId: req.params.id });
});

// HR Module
router.get('/hr/employees', ViewController.renderPlaceholder('HR - Employees'));
router.get('/hr/attendance', ViewController.renderPlaceholder('HR - Attendance'));
router.get('/hr/payroll', ViewController.renderPlaceholder('HR - Payroll'));

// User Management Module
router.get('/users', (_req, res) => {
  res.render('pages/users');
});
router.get('/users/new', (_req, res) => {
  res.render('pages/user-form', { mode: 'create', userId: null });
});
router.get('/users/:id', (req, res) => {
  res.render('pages/user-detail', { userId: req.params.id });
});
router.get('/users/:id/edit', (req, res) => {
  res.render('pages/user-form', { mode: 'edit', userId: req.params.id });
});

// Workflow Builder Module
router.get('/workflows', (_req, res) => {
  res.render('workflow-designer');
});
router.get('/workflows/designer', (_req, res) => {
  res.render('workflow-designer');
});
router.get('/workflows/history', (_req, res) => {
  res.render('workflow-history');
});

// Project Systems Module
router.get('/projects', (_req, res) => {
  res.render('pages/projects');
});
router.get('/projects/new', (_req, res) => {
  res.render('pages/project-form', { mode: 'create', projectId: null });
});
router.get('/projects/:id', (req, res) => {
  res.render('pages/project-detail', { projectId: req.params.id });
});
router.get('/projects/:id/edit', (req, res) => {
  res.render('pages/project-form', { mode: 'edit', projectId: req.params.id });
});

export default router;
