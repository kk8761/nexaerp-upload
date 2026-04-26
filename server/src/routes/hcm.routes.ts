/**
 * HCM Routes
 * API routes for Human Capital Management
 */

import { Router } from 'express';
import hcmController from '../controllers/hcm.controller';

const router = Router();

// ==================== Recruitment Routes ====================

// Job Requisitions
router.post('/requisitions', hcmController.createJobRequisition.bind(hcmController));
router.post('/requisitions/:requisitionId/post', hcmController.postJobToPortals.bind(hcmController));

// Candidates
router.post('/candidates', hcmController.createCandidate.bind(hcmController));
router.get('/candidates/:candidateId', hcmController.getCandidate.bind(hcmController));
router.get('/requisitions/:requisitionId/candidates', hcmController.listCandidates.bind(hcmController));

// Interviews
router.post('/interviews', hcmController.scheduleInterview.bind(hcmController));
router.put('/interviews/:interviewId/feedback', hcmController.recordInterviewFeedback.bind(hcmController));

// Hiring
router.post('/candidates/:candidateId/hire', hcmController.hireCandidate.bind(hcmController));

// ==================== Employee Management Routes ====================

router.get('/employees/:employeeId', hcmController.getEmployee.bind(hcmController));
router.post('/employees/:employeeId/onboarding', hcmController.createOnboardingWorkflow.bind(hcmController));
router.post('/employees/documents', hcmController.uploadEmployeeDocument.bind(hcmController));
router.post('/employees/certifications', hcmController.addEmployeeCertification.bind(hcmController));

// ==================== Performance Management Routes ====================

router.post('/performance-reviews', hcmController.createPerformanceReview.bind(hcmController));
router.put('/performance-reviews/:reviewId/feedback', hcmController.add360Feedback.bind(hcmController));
router.put('/performance-reviews/:reviewId/complete', hcmController.completePerformanceReview.bind(hcmController));
router.put('/performance-reviews/:reviewId/acknowledge', hcmController.acknowledgePerformanceReview.bind(hcmController));

// ==================== Learning Management Routes ====================

router.post('/courses', hcmController.createLearningCourse.bind(hcmController));
router.get('/courses', hcmController.getCourseCatalog.bind(hcmController));
router.post('/enrollments', hcmController.enrollInCourse.bind(hcmController));
router.put('/enrollments/:enrollmentId/progress', hcmController.updateCourseProgress.bind(hcmController));
router.put('/enrollments/:enrollmentId/complete', hcmController.completeCourse.bind(hcmController));

// ==================== Succession Planning Routes ====================

router.get('/succession/high-potential', hcmController.identifyHighPotentialEmployees.bind(hcmController));
router.post('/succession/plans', hcmController.createSuccessionPlan.bind(hcmController));
router.put('/succession/plans/:planId/readiness', hcmController.updateSuccessionReadiness.bind(hcmController));

// ==================== Payroll Processing Routes ====================

router.post('/payroll', hcmController.createPayroll.bind(hcmController));
router.get('/payroll/:payrollId', hcmController.getPayroll.bind(hcmController));
router.post('/payroll/:payrollId/calculate', hcmController.calculatePayroll.bind(hcmController));
router.post('/payroll/:payrollId/approve', hcmController.approvePayroll.bind(hcmController));
router.post('/payroll/:payrollId/process', hcmController.processPayroll.bind(hcmController));
router.post('/payroll/items/:payrollItemId/payslip', hcmController.generatePayslip.bind(hcmController));

export default router;
