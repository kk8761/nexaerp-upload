# Human Capital Management (HCM) Implementation

## Overview

This document describes the implementation of the Human Capital Management (HCM) module for NexaERP, covering recruitment, employee management, performance management, learning management, succession planning, and global payroll processing.

## Architecture

The HCM module follows the monolithic MVC architecture pattern:

- **Models**: TypeScript classes in `src/models/HCM.ts`
- **Service**: Business logic in `src/services/hcm.service.ts`
- **Controller**: HTTP handlers in `src/controllers/hcm.controller.ts`
- **Routes**: API endpoints in `src/routes/hcm.routes.ts`
- **Database**: Prisma schema models in `prisma/schema.prisma`

## Features Implemented

### 1. Recruitment Module (Task 24.1)

**Requirements**: 11.1, 11.2, 11.3

**Models**:
- `JobRequisition`: Job postings with approval workflow
- `Candidate`: Applicant tracking with scoring
- `Interview`: Interview scheduling and feedback

**Key Features**:
- Job requisition creation and approval
- Job posting to external portals (simulated)
- Candidate application tracking
- Automated candidate scoring (0-100 scale)
- Interview scheduling (phone, technical, final)
- Interview feedback and recommendations
- Candidate stage progression

**API Endpoints**:
```
POST   /api/hcm/requisitions                    - Create job requisition
POST   /api/hcm/requisitions/:id/post           - Post job to portals
POST   /api/hcm/candidates                      - Create candidate application
GET    /api/hcm/candidates/:id                  - Get candidate details
GET    /api/hcm/requisitions/:id/candidates     - List candidates for requisition
POST   /api/hcm/interviews                      - Schedule interview
PUT    /api/hcm/interviews/:id/feedback         - Record interview feedback
POST   /api/hcm/candidates/:id/hire             - Hire candidate
```

### 2. Employee Management (Task 24.2)

**Requirements**: 11.4

**Models**:
- `Employee`: Enhanced with HCM fields (employment type, skills, etc.)
- `EmployeeDocument`: Document tracking
- `EmployeeCertification`: Certification management

**Key Features**:
- Candidate-to-employee conversion
- Employee onboarding workflow creation
- Document upload and tracking
- Certification management with expiry tracking
- Employee self-service portal support

**API Endpoints**:
```
GET    /api/hcm/employees/:id                   - Get employee details
POST   /api/hcm/employees/:id/onboarding        - Create onboarding workflow
POST   /api/hcm/employees/documents             - Upload employee document
POST   /api/hcm/employees/certifications        - Add certification
```

### 3. Performance Management (Task 24.3)

**Requirements**: 11.5

**Models**:
- `PerformanceReview`: Performance review with goals and competencies
- Goal tracking with weights and achievements
- Competency ratings

**Key Features**:
- Performance review creation
- Goal setting with weighted scoring
- Competency assessments
- 360-degree feedback (self, manager, peers)
- Automated performance rating calculation
- Development plan tracking

**Rating Calculation**:
- Goals: 70% weight (weighted by individual goal weights)
- Competencies: 30% weight (average of all competencies)
- Scale: 0-5

**API Endpoints**:
```
POST   /api/hcm/performance-reviews             - Create performance review
PUT    /api/hcm/performance-reviews/:id/feedback - Add 360-degree feedback
PUT    /api/hcm/performance-reviews/:id/complete - Complete review
PUT    /api/hcm/performance-reviews/:id/acknowledge - Acknowledge review
```

### 4. Learning Management (Task 24.4)

**Requirements**: 11.6

**Models**:
- `LearningCourse`: Course catalog with modules
- `CourseEnrollment`: Enrollment tracking with progress

**Key Features**:
- Course creation with modules
- Course catalog with categories and levels
- Prerequisite checking
- Enrollment management
- Progress tracking (0-100%)
- Course completion with scoring
- Certificate generation (70% passing score)

**API Endpoints**:
```
POST   /api/hcm/courses                         - Create learning course
GET    /api/hcm/courses                         - Get course catalog
POST   /api/hcm/enrollments                     - Enroll in course
PUT    /api/hcm/enrollments/:id/progress        - Update progress
PUT    /api/hcm/enrollments/:id/complete        - Complete course
```

### 5. Succession Planning (Task 24.5)

**Requirements**: 11.7

**Models**:
- `SuccessionPlan`: Succession planning for key positions

**Key Features**:
- High-potential employee identification (based on performance ratings)
- Succession plan creation for critical positions
- Readiness level tracking
- Development needs assessment
- Risk assessment (criticality and risk levels)

**API Endpoints**:
```
GET    /api/hcm/succession/high-potential       - Identify high-potential employees
POST   /api/hcm/succession/plans                - Create succession plan
PUT    /api/hcm/succession/plans/:id/readiness  - Update readiness levels
```

### 6. Payroll Processing (Task 24.6)

**Requirements**: 11.8

**Models**:
- `Payroll`: Payroll run for a period
- `PayrollItem`: Individual employee payroll

**Key Features**:
- Payroll run creation
- Country-specific payroll calculation
- Earnings calculation (basic salary, overtime, bonus, allowances)
- Deductions calculation (tax, social security, insurance)
- Multi-country support (US, UK, India, and default)
- Payroll approval workflow
- Payslip generation
- Tax form generation support

**Country-Specific Rules**:

**United States**:
- Federal tax: 22%
- Social Security: 6.2%
- Medicare: 1.45%

**United Kingdom**:
- PAYE tax: 20%
- National Insurance: 12%

**India**:
- Income tax: 10%
- Provident Fund: 12%
- HRA: 40% of basic salary
- Transport allowance: ₹1,600

**API Endpoints**:
```
POST   /api/hcm/payroll                         - Create payroll run
GET    /api/hcm/payroll/:id                     - Get payroll details
POST   /api/hcm/payroll/:id/calculate           - Calculate payroll
POST   /api/hcm/payroll/:id/approve             - Approve payroll
POST   /api/hcm/payroll/:id/process             - Process payroll
POST   /api/hcm/payroll/items/:id/payslip       - Generate payslip
```

## Database Schema

### Core Tables

1. **JobRequisition**: Job postings with approval tracking
2. **Candidate**: Applicant information and stage tracking
3. **Interview**: Interview scheduling and feedback
4. **Employee**: Enhanced employee records (existing table extended)
5. **PerformanceReview**: Performance reviews with goals and competencies
6. **LearningCourse**: Course catalog
7. **CourseEnrollment**: Course enrollments with progress
8. **SuccessionPlan**: Succession planning for key positions
9. **Payroll**: Payroll runs
10. **PayrollItem**: Individual employee payroll items
11. **EmployeeCertification**: Employee certifications
12. **EmployeeDocument**: Employee documents

## Integration Points

### Workflow Engine
- Job requisition approval workflows
- Employee onboarding workflows
- Performance review workflows

### Document Management
- Resume storage
- Employee document storage
- Certificate storage
- Payslip generation

### Notification Service
- Interview reminders
- Performance review notifications
- Course enrollment confirmations
- Payroll notifications

### Authentication & RBAC
- HR manager permissions
- Employee self-service permissions
- Payroll processor permissions

## Testing

Unit tests are provided in `src/tests/hcm.test.ts` covering:
- Candidate scoring algorithm
- Performance rating calculation
- Country-specific payroll calculations

Run tests with:
```bash
npm test -- hcm.test.ts
```

## Usage Examples

### 1. Create Job Requisition and Hire Candidate

```typescript
// Create job requisition
const requisition = await hcmService.createJobRequisition({
  title: 'Senior Software Engineer',
  department: 'Engineering',
  positions: 2,
  description: 'We are looking for experienced software engineers...',
  requirements: ['5+ years experience', 'Node.js', 'TypeScript', 'React'],
  priority: 'high'
});

// Post to job portals
await hcmService.postJobToPortals(requisition.id, ['LinkedIn', 'Indeed', 'Glassdoor']);

// Create candidate application
const candidate = await hcmService.createCandidate({
  requisitionId: requisition.id,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  resumeUrl: 'https://example.com/resume.pdf',
  source: 'LinkedIn'
});

// Schedule interview
const interview = await hcmService.scheduleInterview({
  candidateId: candidate.id,
  interviewType: 'technical',
  scheduledDate: new Date('2024-02-01T10:00:00'),
  interviewerName: 'Jane Smith',
  location: 'video_call',
  meetingLink: 'https://zoom.us/j/123456789'
});

// Record feedback
await hcmService.recordInterviewFeedback(interview.id, {
  rating: 8.5,
  feedback: 'Strong technical skills, good communication',
  recommendation: 'hire'
});

// Hire candidate
const employee = await hcmService.hireCandidate(candidate.id, {
  employeeCode: 'EMP001',
  position: 'Senior Software Engineer',
  salary: 120000,
  hireDate: new Date('2024-02-15'),
  employmentType: 'full_time'
});
```

### 2. Conduct Performance Review

```typescript
// Create performance review
const review = await hcmService.createPerformanceReview({
  employeeId: employee.id,
  reviewPeriodStart: new Date('2024-01-01'),
  reviewPeriodEnd: new Date('2024-12-31'),
  reviewerId: 'manager-id',
  reviewerName: 'Jane Smith',
  goals: [
    {
      description: 'Complete project X',
      weight: 0.4,
      achievement: 95,
      rating: 4.5
    },
    {
      description: 'Mentor junior developers',
      weight: 0.3,
      achievement: 85,
      rating: 4.0
    },
    {
      description: 'Improve code quality',
      weight: 0.3,
      achievement: 90,
      rating: 4.2
    }
  ],
  competencies: [
    { competency: 'Technical Skills', rating: 4.5 },
    { competency: 'Communication', rating: 4.0 },
    { competency: 'Leadership', rating: 4.2 }
  ]
});

// Add 360-degree feedback
await hcmService.add360Feedback(review.id, {
  selfAssessment: 'I believe I have met all my goals...',
  managerFeedback: 'Excellent performance this year...',
  peerFeedback: [
    {
      reviewerName: 'Peer 1',
      feedback: 'Great team player',
      rating: 4.5
    }
  ]
});

// Complete review
await hcmService.completePerformanceReview(review.id, {
  comments: 'Outstanding performance',
  developmentPlan: 'Focus on leadership skills for next year'
});
```

### 3. Process Payroll

```typescript
// Create payroll run
const payroll = await hcmService.createPayroll({
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-31'),
  paymentDate: new Date('2024-02-05'),
  country: 'US',
  currency: 'USD'
});

// Calculate payroll for employees
await hcmService.calculatePayroll(payroll.id, [employee.id]);

// Approve payroll
await hcmService.approvePayroll(payroll.id, 'approver-id');

// Process payroll
await hcmService.processPayroll(payroll.id, 'processor-id');

// Generate payslips
const payrollItem = await prisma.payrollItem.findFirst({
  where: { payrollId: payroll.id, employeeId: employee.id }
});
const payslipUrl = await hcmService.generatePayslip(payrollItem.id);
```

## Future Enhancements

1. **Recruitment**:
   - AI-powered candidate matching
   - Video interview integration
   - Background check integration

2. **Performance**:
   - Continuous feedback system
   - OKR (Objectives and Key Results) support
   - Performance improvement plans

3. **Learning**:
   - External course integration (Coursera, Udemy)
   - Learning paths
   - Skills gap analysis

4. **Payroll**:
   - More country-specific rules
   - Tax engine integration
   - Direct deposit integration
   - Benefits administration

5. **Analytics**:
   - Turnover analysis
   - Recruitment funnel metrics
   - Training ROI
   - Compensation benchmarking

## Compliance

The HCM module is designed with compliance in mind:

- **GDPR**: Employee data protection and privacy
- **SOX**: Audit trails for payroll and compensation
- **Labor Laws**: Country-specific payroll calculations
- **Equal Opportunity**: Fair hiring practices tracking

## Support

For questions or issues with the HCM module, please contact the development team or refer to the main NexaERP documentation.
