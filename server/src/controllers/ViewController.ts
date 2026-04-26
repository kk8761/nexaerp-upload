/**
 * View Controller - Handles server-side rendering routes
 */

import { Request, Response } from 'express';
import { renderWithLayout } from '../utils/viewHelpers';

export class ViewController {
  /**
   * Render home/login page
   */
  static async renderHome(_req: Request, res: Response): Promise<void> {
    await renderWithLayout(res, 'pages/index.ejs', {
      title: 'NexaERP — Smart Business Management Platform',
      description: 'Enterprise-grade ERP platform for comprehensive business management',
      bodyClass: 'auth-page',
      showHeader: false,
      showFooter: false,
      user: null,
      pageStyles: '<link rel="stylesheet" href="/css/auth.css" />',
      pageScripts: `
        <script src="/js/auth.js"></script>
        <script src="/js/three-logo.js"></script>
      `
    });
  }

  /**
   * Render dashboard page
   */
  static async renderDashboard(_req: Request, res: Response): Promise<void> {
    // TODO: Get user from session/JWT
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    
    // TODO: Fetch real stats from database
    const stats = {
      revenue: 125000,
      orders: 342,
      customers: 156,
      products: 892
    };

    await renderWithLayout(res, 'pages/dashboard.ejs', {
      title: 'Dashboard — NexaERP',
      description: 'NexaERP Dashboard',
      bodyClass: 'dashboard-page',
      showHeader: true,
      showFooter: false,
      user,
      stats,
      pageStyles: `
        <link rel="stylesheet" href="/css/dashboard.css" />
        <link rel="stylesheet" href="/css/modules.css" />
      `,
      pageScripts: `
        <script>
          window.NEXAERP_API = '${process.env.API_URL || 'http://localhost:5000/api'}';
          window.NEXAERP_SOCKET = '${process.env.SOCKET_URL || 'http://localhost:5000'}';
        </script>
        <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" crossorigin="anonymous"></script>
        <script src="/js/demo-data.js"></script>
        <script src="/js/dashboard.js"></script>
        <script src="/js/inventory.js"></script>
        <script src="/js/pos.js"></script>
        <script src="/js/modules.js"></script>
        <script src="/js/sap_modules.js"></script>
        <script src="/js/enterprise_modules.js"></script>
        <script src="/js/enterprise_plus.js"></script>
      `
    });
  }

  /**
   * Render placeholder page for modules under development
   */
  static renderPlaceholder(moduleName: string) {
    return async (_req: Request, res: Response): Promise<void> => {
      // TODO: Get user from session/JWT
      const user = { name: 'Demo User', email: 'demo@nexaerp.com' };

      await renderWithLayout(res, 'pages/placeholder.ejs', {
        title: `${moduleName} — NexaERP`,
        description: `${moduleName} module`,
        bodyClass: 'module-page',
        showHeader: true,
        showFooter: false,
        user,
        moduleName,
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    };
  }

  /**
   * Render opportunities list page
   */
  static async renderOpportunities(req: Request, res: Response): Promise<void> {
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    
    try {
      const { stage, leadId, assignedToId } = req.query;
      const queryParams = new URLSearchParams();
      if (stage) queryParams.append('stage', stage as string);
      if (leadId) queryParams.append('leadId', leadId as string);
      if (assignedToId) queryParams.append('assignedToId', assignedToId as string);

      const apiUrl = `${process.env.API_URL || 'http://localhost:5000/api'}/crm/opportunities?${queryParams}`;
      const response = await fetch(apiUrl);
      const data: any = await response.json();

      await renderWithLayout(res, 'pages/opportunities.ejs', {
        title: 'Opportunities — NexaERP',
        description: 'Manage sales opportunities',
        bodyClass: 'opportunities-page',
        showHeader: true,
        showFooter: false,
        user,
        opportunities: data.opportunities || [],
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      await renderWithLayout(res, 'pages/opportunities.ejs', {
        title: 'Opportunities — NexaERP',
        description: 'Manage sales opportunities',
        bodyClass: 'opportunities-page',
        showHeader: true,
        showFooter: false,
        user,
        opportunities: [],
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    }
  }

  /**
   * Render opportunity detail page
   */
  static async renderOpportunityDetail(req: Request, res: Response): Promise<void> {
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    const { id } = req.params;

    try {
      const apiUrl = `${process.env.API_URL || 'http://localhost:5000/api'}/crm/opportunities/${id}`;
      const response = await fetch(apiUrl);
      const data: any = await response.json();

      if (!data.success) {
        res.status(404).send('Opportunity not found');
        return;
      }

      await renderWithLayout(res, 'pages/opportunity-detail.ejs', {
        title: `${data.opportunity.name} — NexaERP`,
        description: 'Opportunity details',
        bodyClass: 'opportunity-detail-page',
        showHeader: true,
        showFooter: false,
        user,
        opportunity: data.opportunity,
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      res.status(500).send('Error loading opportunity');
    }
  }

  /**
   * Render opportunity form page (create/edit)
   */
  static async renderOpportunityForm(req: Request, res: Response): Promise<void> {
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    const { id } = req.params;
    const isEdit = !!id;

    try {
      // Fetch leads for dropdown
      const leadsUrl = `${process.env.API_URL || 'http://localhost:5000/api'}/crm/leads`;
      const leadsResponse = await fetch(leadsUrl);
      const leadsData: any = await leadsResponse.json();

      // Fetch users for assignment dropdown (mock for now)
      const users = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
        { id: '3', name: 'Bob Johnson' }
      ];

      let opportunity = null;
      if (isEdit) {
        const oppUrl = `${process.env.API_URL || 'http://localhost:5000/api'}/crm/opportunities/${id}`;
        const oppResponse = await fetch(oppUrl);
        const oppData: any = await oppResponse.json();
        opportunity = oppData.opportunity;
      }

      await renderWithLayout(res, 'pages/opportunity-form.ejs', {
        title: isEdit ? 'Edit Opportunity — NexaERP' : 'New Opportunity — NexaERP',
        description: isEdit ? 'Edit opportunity' : 'Create new opportunity',
        bodyClass: 'opportunity-form-page',
        showHeader: true,
        showFooter: false,
        user,
        opportunity,
        isEdit,
        leads: leadsData.leads || [],
        users,
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    } catch (error) {
      console.error('Error loading opportunity form:', error);
      res.status(500).send('Error loading form');
    }
  }

  /**
   * Render bank reconciliation list page
   */
  static async renderBankReconciliations(_req: Request, res: Response): Promise<void> {
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    
    try {
      const apiUrl = `${process.env.API_URL || 'http://localhost:5000/api'}/accounting/bank-accounts`;
      const response = await fetch(apiUrl);
      const data: any = await response.json();

      await renderWithLayout(res, 'pages/bank-reconciliations.ejs', {
        title: 'Bank Reconciliations — NexaERP',
        description: 'Manage bank reconciliations',
        bodyClass: 'bank-reconciliations-page',
        showHeader: true,
        showFooter: false,
        user,
        bankAccounts: data.bankAccounts || [],
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      await renderWithLayout(res, 'pages/bank-reconciliations.ejs', {
        title: 'Bank Reconciliations — NexaERP',
        description: 'Manage bank reconciliations',
        bodyClass: 'bank-reconciliations-page',
        showHeader: true,
        showFooter: false,
        user,
        bankAccounts: [],
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    }
  }

  /**
   * Render bank reconciliation detail/matching page
   */
  static async renderBankReconciliationDetail(req: Request, res: Response): Promise<void> {
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    const { statementId } = req.params;

    try {
      const apiUrl = `${process.env.API_URL || 'http://localhost:5000/api'}/accounting/bank-statements/${statementId}/reconciliation-details`;
      const response = await fetch(apiUrl);
      const data: any = await response.json();

      if (!data.success) {
        res.status(404).send('Bank statement not found');
        return;
      }

      await renderWithLayout(res, 'pages/bank-reconciliation-detail.ejs', {
        title: `Bank Reconciliation — ${data.statement.statementNo} — NexaERP`,
        description: 'Bank reconciliation matching',
        bodyClass: 'bank-reconciliation-detail-page',
        showHeader: true,
        showFooter: false,
        user,
        statement: data.statement,
        matchedTransactions: data.matchedTransactions,
        unmatchedBankItems: data.unmatchedBankItems,
        unmatchedBookItems: data.unmatchedBookItems,
        reconciliation: data.reconciliation,
        pageStyles: '<link rel="stylesheet" href="/css/modules.css" />',
        pageScripts: ''
      });
    } catch (error) {
      console.error('Error fetching reconciliation details:', error);
      res.status(500).send('Error loading reconciliation');
    }
  }
}
