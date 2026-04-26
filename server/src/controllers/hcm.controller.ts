/**
 * HCM Controller
 * Handles HTTP requests for Human Capital Management
 */

import { Request, Response } from 'express';
import hcmService from '../services/hcm.service';

export class HCMController {
  
  // ==================== Recruitment ====================
  
  /**
   * Create job requisition
   */
  async createJobRequisition(req: Request, res: Response) {
    try {
      const requisition = await hcmService.createJobRequisition(req.body);
      res.status(201).json(requisition);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create job requisition' });
    }
  }
  
  /**
   * Post job to portals
   */
  async postJobToPortals(req: Request, res: Response) {
    try {
      const { requisitionId } = req.params;
      const { portals } = req.body;
      const result = await hcmService.postJobToPortals(requisitionId, portals);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to post job' });
    }
  }
  
  /**
   * Create candidate application
   */
  async createCandidate(req: Request, res: Response) {
    try {
      const candidate = await hcmService.createCandidate(req.body);
      res.status(201).json(candidate);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create candidate' });
    }
  }
  
  /**
   * Schedule interview
   */
  async scheduleInterview(req: Request, res: Response) {
    try {
      const interview = await hcmService.scheduleInterview(req.body);
      res.status(201).json(interview);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule interview' });
    }
  }
  
  /**
   * Record interview feedback
   */
  async recordInterviewFeedback(req: Request, res: Response) {
    try {
      const { interviewId } = req.params;
      const interview = await hcmService.recordInterviewFeedback(interviewId, req.body);
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to record feedback' });
    }
  }
  
  /**
   * Get candidate details
   */
  async getCandidate(req: Request, res: Response): Promise<void> {
    try {
      const { candidateId } = req.params;
      const candidate = await hcmService.getCandidate(candidateId);
      if (!candidate) {
        res.status(404).json({ error: 'Candidate not found' });
        return;
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get candidate' });
    }
  }
  
  /**
   * List candidates
   */
  async listCandidates(req: Request, res: Response) {
    try {
      const { requisitionId } = req.params;
      const { stage } = req.query;
      const candidates = await hcmService.listCandidates(requisitionId, stage as string);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list candidates' });
    }
  }
  
  // ==================== Employee Management ====================
  
  /**
   * Hire candidate
   */
  async hireCandidate(req: Request, res: Response) {
    try {
      const { candidateId } = req.params;
      const employee = await hcmService.hireCandidate(candidateId, req.body);
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to hire candidate' });
    }
  }
  
  /**
   * Create onboarding workflow
   */
  async createOnboardingWorkflow(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const workflow = await hcmService.createOnboardingWorkflow(employeeId);
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create onboarding workflow' });
    }
  }
  
  /**
   * Upload employee document
   */
  async uploadEmployeeDocument(req: Request, res: Response) {
    try {
      const document = await hcmService.uploadEmployeeDocument(req.body);
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload document' });
    }
  }
  
  /**
   * Add employee certification
   */
  async addEmployeeCertification(req: Request, res: Response) {
    try {
      const certification = await hcmService.addEmployeeCertification(req.body);
      res.status(201).json(certification);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add certification' });
    }
  }
  
  /**
   * Get employee details
   */
  async getEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const employee = await hcmService.getEmployee(employeeId);
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get employee' });
    }
  }
  
  // ==================== Performance Management ====================
  
  /**
   * Create performance review
   */
  async createPerformanceReview(req: Request, res: Response) {
    try {
      const review = await hcmService.createPerformanceReview(req.body);
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create performance review' });
    }
  }
  
  /**
   * Add 360-degree feedback
   */
  async add360Feedback(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const review = await hcmService.add360Feedback(reviewId, req.body);
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add feedback' });
    }
  }
  
  /**
   * Complete performance review
   */
  async completePerformanceReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const review = await hcmService.completePerformanceReview(reviewId, req.body);
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to complete review' });
    }
  }
  
  /**
   * Acknowledge performance review
   */
  async acknowledgePerformanceReview(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const review = await hcmService.acknowledgePerformanceReview(reviewId);
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to acknowledge review' });
    }
  }
  
  // ==================== Learning Management ====================
  
  /**
   * Create learning course
   */
  async createLearningCourse(req: Request, res: Response) {
    try {
      const course = await hcmService.createLearningCourse(req.body);
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create course' });
    }
  }
  
  /**
   * Enroll in course
   */
  async enrollInCourse(req: Request, res: Response) {
    try {
      const { employeeId, courseId } = req.body;
      const enrollment = await hcmService.enrollInCourse(employeeId, courseId);
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to enroll in course' });
    }
  }
  
  /**
   * Update course progress
   */
  async updateCourseProgress(req: Request, res: Response) {
    try {
      const { enrollmentId } = req.params;
      const { progress } = req.body;
      const enrollment = await hcmService.updateCourseProgress(enrollmentId, progress);
      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update progress' });
    }
  }
  
  /**
   * Complete course
   */
  async completeCourse(req: Request, res: Response) {
    try {
      const { enrollmentId } = req.params;
      const { score } = req.body;
      const enrollment = await hcmService.completeCourse(enrollmentId, score);
      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to complete course' });
    }
  }
  
  /**
   * Get course catalog
   */
  async getCourseCatalog(req: Request, res: Response) {
    try {
      const { category, level, isActive } = req.query;
      const courses = await hcmService.getCourseCatalog({
        category: category as string,
        level: level as string,
        isActive: isActive === 'true'
      });
      res.json(courses);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get course catalog' });
    }
  }
  
  // ==================== Succession Planning ====================
  
  /**
   * Identify high-potential employees
   */
  async identifyHighPotentialEmployees(req: Request, res: Response) {
    try {
      const { minRating } = req.query;
      const employees = await hcmService.identifyHighPotentialEmployees(
        minRating ? parseFloat(minRating as string) : undefined
      );
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to identify high-potential employees' });
    }
  }
  
  /**
   * Create succession plan
   */
  async createSuccessionPlan(req: Request, res: Response) {
    try {
      const plan = await hcmService.createSuccessionPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create succession plan' });
    }
  }
  
  /**
   * Update succession readiness
   */
  async updateSuccessionReadiness(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const { candidates } = req.body;
      const plan = await hcmService.updateSuccessionReadiness(planId, candidates);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update succession readiness' });
    }
  }
  
  // ==================== Payroll Processing ====================
  
  /**
   * Create payroll
   */
  async createPayroll(req: Request, res: Response) {
    try {
      const payroll = await hcmService.createPayroll(req.body);
      res.status(201).json(payroll);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create payroll' });
    }
  }
  
  /**
   * Calculate payroll
   */
  async calculatePayroll(req: Request, res: Response) {
    try {
      const { payrollId } = req.params;
      const { employeeIds } = req.body;
      const payroll = await hcmService.calculatePayroll(payrollId, employeeIds);
      res.json(payroll);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to calculate payroll' });
    }
  }
  
  /**
   * Approve payroll
   */
  async approvePayroll(req: Request, res: Response) {
    try {
      const { payrollId } = req.params;
      const { approvedBy } = req.body;
      const payroll = await hcmService.approvePayroll(payrollId, approvedBy);
      res.json(payroll);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve payroll' });
    }
  }
  
  /**
   * Process payroll
   */
  async processPayroll(req: Request, res: Response) {
    try {
      const { payrollId } = req.params;
      const { processedBy } = req.body;
      const payroll = await hcmService.processPayroll(payrollId, processedBy);
      res.json(payroll);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process payroll' });
    }
  }
  
  /**
   * Generate payslip
   */
  async generatePayslip(req: Request, res: Response) {
    try {
      const { payrollItemId } = req.params;
      const payslipUrl = await hcmService.generatePayslip(payrollItemId);
      res.json({ payslipUrl });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate payslip' });
    }
  }
  
  /**
   * Get payroll details
   */
  async getPayroll(req: Request, res: Response): Promise<void> {
    try {
      const { payrollId } = req.params;
      const payroll = await hcmService.getPayroll(payrollId);
      if (!payroll) {
        res.status(404).json({ error: 'Payroll not found' });
        return;
      }
      res.json(payroll);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get payroll' });
    }
  }
}

export default new HCMController();
