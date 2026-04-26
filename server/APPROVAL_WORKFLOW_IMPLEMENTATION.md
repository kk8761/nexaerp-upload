# Approval Workflow Implementation

## Overview

This document describes the comprehensive approval workflow framework implemented for NexaERP, covering multi-level approval hierarchies, delegation, notifications, and integration with business processes.

**Requirements**: 5.5 - Multi-level approval hierarchies  
**Tasks**: 17.1 (Framework), 17.2 (Business Process Integration)

## Architecture

### Core Components

1. **Approval Service** (`src/services/approval.service.ts`)
   - Core approval workflow engine
   - Handles workflow creation, submission, and processing
   - Manages approval delegation and notifications

2. **Approval Controller** (`src/controllers/approval.controller.ts`)
   - HTTP endpoints for approval operations
   - Request validation and response formatting

3. **Approval Dashboard Controller** (`src/controllers/approval-dashboard.controller.ts`)
   - Dashboard views and statistics
   - Pending approvals aggregation
   - User approval metrics

4. **Business Process Integration Services**
   - `purchase-order-approval.service.ts` - Purchase order approvals
   - `leave-approval.service.ts` - Leave request approvals
   - `expense-approval.service.ts` - Expense report approvals

## Database Schema

### Existing Models (Prisma)

```prisma
model WorkflowTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  module      String   // e.g., 'purchase_order', 'expense_report'
  steps       Json     // Array of approval steps
  isActive    Boolean  @default(true)
  requests    ApprovalRequest[]
}

model ApprovalRequest {
  id          String   @id @default(uuid())
  entityType  String   // e.g., 'purchase_order', 'leave_request'
  entityId    String   // ID of the entity being approved
  requesterId String
  status      String   @default("pending") // pending, approved, rejected, cancelled
  currentStep Int      @default(1)
  workflowId  String
  workflow    WorkflowTemplate @relation(...)
  history     ApprovalHistory[]
}

model ApprovalHistory {
  id          String   @id @default(uuid())
  requestId   String
  approverId  String
  action      String   // approved, rejected, delegated, cancelled
  comments    String?
  step        Int
  request     ApprovalRequest @relation(...)
  approver    User @relation(...)
}

model ExpenseReport {
  id            String   @id @default(uuid())
  reportNumber  String   @unique
  employeeId    String
  title         String
  totalAmount   Float
  status        String   @default("draft")
  items         ExpenseItem[]
}

model ExpenseItem {
  id              String   @id @default(uuid())
  expenseReportId String
  date            DateTime
  category        String
  description     String
  amount          Float
  receiptUrl      String?
}
```

## Features

### 1. Multi-Level Approval Hierarchies

Workflows support multiple approval levels with configurable approvers:

```typescript
{
  name: 'po_approval_cfo',
  steps: [
    {
      step: 1,
      name: 'Manager Approval',
      approverRoles: ['manager', 'procurement_manager'],
      requiredApprovals: 1,
      allowDelegation: true
    },
    {
      step: 2,
      name: 'Director Approval',
      approverRoles: ['director'],
      requiredApprovals: 1,
      allowDelegation: true
    },
    {
      step: 3,
      name: 'CFO Approval',
      approverRoles: ['cfo'],
      requiredApprovals: 1,
      allowDelegation: false
    }
  ]
}
```

### 2. Approval Delegation

Approvers can delegate their approval authority to other users:

```typescript
await approvalService.delegateApproval(
  approvalRequestId,
  fromUserId,
  toUserId,
  'Out of office - delegating to deputy'
);
```

### 3. Automatic Workflow Selection

Workflows are automatically selected based on business rules:

**Purchase Orders:**
- < $10,000: Auto-approved
- $10,000 - $50,000: Manager approval
- $50,000 - $100,000: Manager + Director approval
- > $100,000: Manager + Director + CFO approval

**Expense Reports:**
- < $1,000: Auto-approved
- $1,000 - $5,000: Manager approval
- $5,000 - $10,000: Manager + Finance Manager approval
- > $10,000: Manager + Finance Manager + Finance Director approval

**Leave Requests:**
- Standard leave (≤10 days): Manager approval
- Special leave types: Manager + HR approval
- Extended leave (>10 days): Manager + HR Manager + HR Director approval

### 4. Notifications

Automatic notifications are sent at key points:
- When approval is requested (to approvers)
- When approval is granted (to requester)
- When approval is rejected (to requester)
- When approval is delegated (to delegate)

### 5. Approval Dashboard

Comprehensive dashboard showing:
- Pending approvals by priority (high/medium/low)
- Pending approvals by type (PO/Expense/Leave)
- User approval statistics
- Recent approval history
- Average approval times

## API Endpoints

### Workflow Management

```
POST   /api/approvals/workflows
       Create a new approval workflow template
       Body: { name, description, module, entityType, steps }

GET    /api/approvals/dashboard/workflows
       Get all workflow templates
       Query: ?module=purchase_order
```

### Approval Operations

```
POST   /api/approvals/submit
       Submit an entity for approval
       Body: { entityType, entityId, workflowName? }

POST   /api/approvals/:id/process
       Process an approval decision
       Body: { action: 'approved'|'rejected'|'delegated', comments?, delegateToUserId? }

POST   /api/approvals/:id/delegate
       Delegate approval to another user
       Body: { toUserId, reason? }

POST   /api/approvals/:id/cancel
       Cancel an approval request
       Body: { reason? }
```

### Approval Queries

```
GET    /api/approvals/pending
       Get pending approvals for current user

GET    /api/approvals/:id
       Get approval request details with history

GET    /api/approvals/history/:entityType/:entityId
       Get approval history for an entity
```

### Dashboard

```
GET    /api/approvals/dashboard
       Get approval dashboard overview with statistics

GET    /api/approvals/dashboard/pending
       Get pending approvals with full details
       Query: ?type=purchase_order|expense_report|leave_request

GET    /api/approvals/dashboard/stats
       Get approval statistics
       Query: ?startDate=2024-01-01&endDate=2024-12-31
```

## Business Process Integration

### Purchase Orders

```typescript
// Submit PO for approval
const result = await purchaseOrderApprovalService.submitPurchaseOrderForApproval(
  purchaseOrderId,
  requesterId
);

// Process PO approval
const result = await purchaseOrderApprovalService.processPurchaseOrderApproval(
  approvalRequestId,
  approverId,
  'approved',
  'Approved - vendor is reliable'
);
```

### Leave Requests

```typescript
// Submit leave for approval
const result = await leaveApprovalService.submitLeaveForApproval(
  leaveId,
  requesterId
);

// Process leave approval
const result = await leaveApprovalService.processLeaveApproval(
  approvalRequestId,
  approverId,
  'approved'
);
```

### Expense Reports

```typescript
// Submit expense for approval
const result = await expenseApprovalService.submitExpenseForApproval(
  expenseReportId,
  requesterId
);

// Process expense approval
const result = await expenseApprovalService.processExpenseApproval(
  approvalRequestId,
  approverId,
  'approved',
  'All receipts verified'
);
```

## Initialization

To set up default approval workflows:

```bash
# Run initialization script
npm run init-approvals

# Or programmatically
import initializeApprovalWorkflows from './scripts/init-approval-workflows';
await initializeApprovalWorkflows();
```

This creates:
- 3 purchase order workflows
- 3 leave request workflows
- 3 expense report workflows

## Usage Examples

### Creating a Custom Workflow

```typescript
const workflow = await approvalService.createApprovalWorkflow({
  name: 'contract_approval_legal',
  description: 'Legal approval for contracts',
  module: 'contract',
  entityType: 'contract',
  steps: [
    {
      step: 1,
      name: 'Manager Review',
      approverRoles: ['manager'],
      requiredApprovals: 1,
      allowDelegation: true
    },
    {
      step: 2,
      name: 'Legal Review',
      approverRoles: ['legal_counsel'],
      requiredApprovals: 2, // Requires 2 legal approvals
      allowDelegation: false
    },
    {
      step: 3,
      name: 'Executive Approval',
      approverRoles: ['ceo', 'cfo'],
      requiredApprovals: 1,
      allowDelegation: false
    }
  ]
});
```

### Submitting for Approval

```typescript
const approvalRequest = await approvalService.submitForApproval(
  'contract',
  'CONTRACT-2024-001',
  userId,
  'contract_approval_legal'
);
```

### Processing Approval

```typescript
// Approve
const result = await approvalService.processApproval(
  approvalRequestId,
  approverId,
  'approved',
  'Contract terms are acceptable'
);

// Reject
const result = await approvalService.processApproval(
  approvalRequestId,
  approverId,
  'rejected',
  'Missing insurance clause'
);

// Delegate
const result = await approvalService.processApproval(
  approvalRequestId,
  approverId,
  'delegated',
  'On vacation',
  delegateUserId
);
```

### Getting Pending Approvals

```typescript
const pendingApprovals = await approvalService.getPendingApprovals(userId);

// Filter by type
const poApprovals = pendingApprovals.filter(
  a => a.entityType === 'purchase_order'
);
```

## Security Considerations

1. **Authorization**: All approval endpoints should be protected with authentication middleware
2. **Role Validation**: Verify user has appropriate role before allowing approval
3. **Audit Trail**: All approval actions are logged in ApprovalHistory
4. **Delegation Limits**: Some steps (e.g., CFO approval) cannot be delegated
5. **Cancellation Rights**: Only the requester can cancel their own approval request

## Performance Optimization

1. **Indexing**: Database indexes on:
   - `ApprovalRequest.status`
   - `ApprovalRequest.entityType + entityId`
   - `ApprovalHistory.requestId`
   - `ApprovalHistory.approverId`

2. **Caching**: Consider caching:
   - Workflow templates
   - User roles
   - Pending approval counts

3. **Batch Operations**: Use batch queries when loading dashboard data

## Testing

Key test scenarios:
1. Single-level approval workflow
2. Multi-level approval workflow
3. Parallel approvals (multiple approvers at same level)
4. Approval delegation
5. Approval rejection at different levels
6. Cancellation of pending approvals
7. Auto-approval for small amounts
8. Notification delivery
9. Dashboard statistics accuracy

## Future Enhancements

1. **Conditional Routing**: Route to different approvers based on conditions
2. **Escalation**: Auto-escalate if approval not processed within timeframe
3. **Parallel Branches**: Support parallel approval paths
4. **External Approvers**: Allow approval via email link
5. **Mobile App**: Native mobile app for approvals
6. **Approval Templates**: Pre-filled approval comments
7. **Bulk Approval**: Approve multiple requests at once
8. **Approval Analytics**: Advanced analytics and reporting

## Troubleshooting

### Approval Not Moving to Next Step

Check:
1. Required number of approvals received for current step
2. Workflow step configuration is correct
3. No errors in approval processing

### User Not Seeing Pending Approvals

Check:
1. User has correct role assigned
2. Workflow step specifies correct approver roles
3. User is not filtered out by business logic

### Notifications Not Sent

Check:
1. Notification service is running
2. User has valid email/notification preferences
3. Notification creation is not failing silently

## Support

For issues or questions:
- Check logs in `server/error.log`
- Review approval history in database
- Contact development team

## Conclusion

The approval workflow framework provides a flexible, scalable solution for managing multi-level approvals across all business processes in NexaERP. It supports complex approval hierarchies, delegation, automatic workflow selection, and comprehensive tracking and reporting.
