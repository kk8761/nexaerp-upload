/**
 * Initialize Default Approval Workflows
 * Sets up default approval workflows for all business processes
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.2: Integrate approvals with business processes
 */

import purchaseOrderApprovalService from '../services/purchase-order-approval.service';
import leaveApprovalService from '../services/leave-approval.service';
import expenseApprovalService from '../services/expense-approval.service';

async function initializeApprovalWorkflows() {
  console.log('Initializing approval workflows...');

  try {
    // Initialize purchase order workflows
    console.log('\n1. Initializing purchase order approval workflows...');
    await purchaseOrderApprovalService.initializeDefaultWorkflows();
    console.log('✓ Purchase order workflows initialized');

    // Initialize leave request workflows
    console.log('\n2. Initializing leave request approval workflows...');
    await leaveApprovalService.initializeDefaultWorkflows();
    console.log('✓ Leave request workflows initialized');

    // Initialize expense report workflows
    console.log('\n3. Initializing expense report approval workflows...');
    await expenseApprovalService.initializeDefaultWorkflows();
    console.log('✓ Expense report workflows initialized');

    console.log('\n✅ All approval workflows initialized successfully!');
    console.log('\nWorkflows created:');
    console.log('  Purchase Orders:');
    console.log('    - po_approval_manager ($10K - $50K)');
    console.log('    - po_approval_director ($50K - $100K)');
    console.log('    - po_approval_cfo (> $100K)');
    console.log('  Leave Requests:');
    console.log('    - leave_approval_manager (standard leave)');
    console.log('    - leave_approval_hr (special leave types)');
    console.log('    - leave_approval_hr_director (extended leave)');
    console.log('  Expense Reports:');
    console.log('    - expense_approval_manager ($1K - $5K)');
    console.log('    - expense_approval_finance_manager ($5K - $10K)');
    console.log('    - expense_approval_finance_director (> $10K)');

  } catch (error) {
    console.error('❌ Error initializing approval workflows:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeApprovalWorkflows()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export default initializeApprovalWorkflows;
