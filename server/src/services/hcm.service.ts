/**
 * Human Capital Management (HCM) Service
 * Handles recruitment, employee management, performance, learning, succession planning, and payroll
 */

import prisma from '../config/prisma';

export class HCMService {
  
  // ==================== Task 24.1: Recruitment Module ====================
  
  /**
   * Create job requisition
   */
  async createJobRequisition(data: {
    title: string;
    department: string;
    positions?: number;
    description: string;
    requirements: string[];
    priority?: string;
    createdBy?: string;
  }) {
    const requisitionNo = `JR-${Date.now()}`;
    
    return prisma.jobRequisition.create({
      data: {
        requisitionNo,
        title: data.title,
        department: data.department,
        positions: data.positions || 1,
        description: data.description,
        requirements: data.requirements,
        priority: data.priority || 'medium',
        status: 'draft',
        approvalStatus: 'pending'
      }
    });
  }
  
  /**
   * Post job to job portals (simulated)
   */
  async postJobToPortals(requisitionId: string, portals: string[]) {
    // Update requisition status to open
    const requisition = await prisma.jobRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'open',
        postedDate: new Date()
      }
    });
    
    // In a real implementation, this would integrate with job board APIs
    // For now, we'll just log the action
    console.log(`Posted job ${requisition.title} to portals:`, portals);
    
    return { success: true, portals };
  }
  
  /**
   * Create candidate application
   */
  async createCandidate(data: {
    requisitionId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    coverLetter?: string;
    source?: string;
  }) {
    // Calculate initial candidate score
    const score = await this.calculateCandidateScore(data);
    
    return prisma.candidate.create({
      data: {
        requisitionId: data.requisitionId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        resumeUrl: data.resumeUrl,
        coverLetter: data.coverLetter,
        source: data.source,
        stage: 'applied',
        score,
        appliedDate: new Date()
      },
      include: {
        requisition: true
      }
    });
  }
  
  /**
   * Calculate candidate score (0-100)
   * Based on resume completeness, experience, and other factors
   */
  async calculateCandidateScore(data: {
    resumeUrl?: string;
    coverLetter?: string;
    phone?: string;
  }): Promise<number> {
    let score = 50; // Base score
    
    // Resume provided
    if (data.resumeUrl) {
      score += 20;
    }
    
    // Cover letter provided
    if (data.coverLetter && data.coverLetter.length > 100) {
      score += 15;
    }
    
    // Phone number provided
    if (data.phone) {
      score += 10;
    }
    
    // Additional scoring logic could include:
    // - Keyword matching from job requirements
    // - Years of experience
    // - Education level
    // - Skills match
    
    return Math.min(score, 100);
  }
  
  /**
   * Update candidate stage
   */
  async updateCandidateStage(candidateId: string, stage: string, score?: number) {
    const updateData: any = {
      stage,
      updatedAt: new Date()
    };
    
    if (score !== undefined) {
      updateData.score = score;
    }
    
    return prisma.candidate.update({
      where: { id: candidateId },
      data: updateData
    });
  }
  
  /**
   * Schedule interview
   */
  async scheduleInterview(data: {
    candidateId: string;
    interviewType: string;
    scheduledDate: Date;
    duration?: number;
    interviewerId?: string;
    interviewerName?: string;
    location?: string;
    meetingLink?: string;
  }) {
    const interview = await prisma.interview.create({
      data: {
        candidateId: data.candidateId,
        interviewType: data.interviewType,
        scheduledDate: data.scheduledDate,
        duration: data.duration || 60,
        interviewerId: data.interviewerId,
        interviewerName: data.interviewerName,
        location: data.location,
        meetingLink: data.meetingLink,
        status: 'scheduled'
      }
    });
    
    // Update candidate stage if needed
    if (data.interviewType === 'phone') {
      await this.updateCandidateStage(data.candidateId, 'phone_interview');
    } else if (data.interviewType === 'technical') {
      await this.updateCandidateStage(data.candidateId, 'technical_interview');
    } else if (data.interviewType === 'final') {
      await this.updateCandidateStage(data.candidateId, 'final_interview');
    }
    
    return interview;
  }
  
  /**
   * Record interview feedback
   */
  async recordInterviewFeedback(interviewId: string, data: {
    rating?: number;
    feedback?: string;
    recommendation?: string;
  }) {
    return prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'completed',
        rating: data.rating,
        feedback: data.feedback,
        recommendation: data.recommendation,
        completedDate: new Date()
      }
    });
  }
  
  /**
   * Get candidate details with interviews
   */
  async getCandidate(candidateId: string) {
    return prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        requisition: true,
        interviews: {
          orderBy: {
            scheduledDate: 'asc'
          }
        }
      }
    });
  }
  
  /**
   * List candidates for a requisition
   */
  async listCandidates(requisitionId: string, stage?: string) {
    const where: any = {
      requisitionId
    };
    
    if (stage) {
      where.stage = stage;
    }
    
    return prisma.candidate.findMany({
      where,
      include: {
        interviews: true
      },
      orderBy: {
        score: 'desc'
      }
    });
  }
  
  // ==================== Task 24.2: Employee Management ====================
  
  /**
   * Hire candidate and create employee record
   */
  async hireCandidate(candidateId: string, employmentData: {
    employeeCode: string;
    position: string;
    department?: string;
    salary: number;
    hireDate: Date;
    employmentType?: string;
    managerId?: string;
  }) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!candidate) {
      throw new Error('Candidate not found');
    }
    
    // Create employee record
    const employee = await prisma.employee.create({
      data: {
        employeeCode: employmentData.employeeCode,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone || undefined,
        position: employmentData.position,
        salary: employmentData.salary,
        hireDate: employmentData.hireDate,
        employmentType: employmentData.employmentType || 'full_time',
        status: 'active'
      }
    });
    
    // Update candidate record
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        stage: 'hired',
        hiredDate: new Date(),
        employeeId: employee.id
      }
    });
    
    // Update requisition if all positions filled
    const requisition = await prisma.jobRequisition.findUnique({
      where: { id: candidate.requisitionId },
      include: {
        candidates: {
          where: { stage: 'hired' }
        }
      }
    });
    
    if (requisition && requisition.candidates.length >= requisition.positions) {
      await prisma.jobRequisition.update({
        where: { id: requisition.id },
        data: {
          status: 'filled',
          closedDate: new Date()
        }
      });
    }
    
    return employee;
  }
  
  /**
   * Create employee onboarding workflow
   * This would integrate with the workflow engine
   */
  async createOnboardingWorkflow(employeeId: string) {
    // In a real implementation, this would create a workflow instance
    // For now, we'll return a placeholder
    return {
      employeeId,
      tasks: [
        { task: 'Complete paperwork', status: 'pending' },
        { task: 'IT setup', status: 'pending' },
        { task: 'Orientation session', status: 'pending' },
        { task: 'Department introduction', status: 'pending' }
      ]
    };
  }
  
  /**
   * Upload employee document
   */
  async uploadEmployeeDocument(data: {
    employeeId: string;
    documentType: string;
    documentName: string;
    documentUrl: string;
    uploadedBy?: string;
    expiryDate?: Date;
    notes?: string;
  }) {
    return prisma.employeeDocument.create({
      data: {
        employeeId: data.employeeId,
        documentType: data.documentType,
        documentName: data.documentName,
        documentUrl: data.documentUrl,
        uploadedBy: data.uploadedBy,
        expiryDate: data.expiryDate,
        notes: data.notes
      }
    });
  }
  
  /**
   * Add employee certification
   */
  async addEmployeeCertification(data: {
    employeeId: string;
    certificationName: string;
    issuingOrg: string;
    issueDate: Date;
    expiryDate?: Date;
    certificateUrl?: string;
  }) {
    return prisma.employeeCertification.create({
      data: {
        employeeId: data.employeeId,
        certificationName: data.certificationName,
        issuingOrg: data.issuingOrg,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        certificateUrl: data.certificateUrl,
        status: 'active'
      }
    });
  }
  
  /**
   * Get employee with all details
   */
  async getEmployee(employeeId: string) {
    return prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        performanceReviews: {
          orderBy: { reviewPeriodEnd: 'desc' }
        },
        courseEnrollments: {
          include: { course: true }
        },
        certifications: true,
        documents: true
      }
    });
  }
  
  // ==================== Task 24.3: Performance Management ====================
  
  /**
   * Create performance review
   */
  async createPerformanceReview(data: {
    employeeId: string;
    reviewPeriodStart: Date;
    reviewPeriodEnd: Date;
    reviewerId: string;
    reviewerName: string;
    goals: Array<{
      description: string;
      weight: number;
      achievement: number;
      rating: number;
    }>;
    competencies: Array<{
      competency: string;
      rating: number;
      comments?: string;
    }>;
    dueDate?: Date;
  }) {
    // Calculate overall rating
    const overallRating = this.calculatePerformanceRating(data.goals, data.competencies);
    
    return prisma.performanceReview.create({
      data: {
        employeeId: data.employeeId,
        reviewPeriodStart: data.reviewPeriodStart,
        reviewPeriodEnd: data.reviewPeriodEnd,
        reviewerId: data.reviewerId,
        reviewerName: data.reviewerName,
        goals: data.goals as any,
        competencies: data.competencies as any,
        overallRating,
        status: 'draft',
        dueDate: data.dueDate
      }
    });
  }
  
  /**
   * Calculate performance rating
   * Weighted average of goals and competencies
   */
  calculatePerformanceRating(
    goals: Array<{ weight: number; rating: number }>,
    competencies: Array<{ rating: number }>
  ): number {
    // Calculate weighted goal rating (70% weight)
    const totalGoalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
    const goalRating = goals.reduce((sum, g) => sum + (g.rating * g.weight), 0) / totalGoalWeight;
    
    // Calculate average competency rating (30% weight)
    const competencyRating = competencies.reduce((sum, c) => sum + c.rating, 0) / competencies.length;
    
    // Overall rating (0-5 scale)
    const overallRating = (goalRating * 0.7) + (competencyRating * 0.3);
    
    return Math.round(overallRating * 10) / 10; // Round to 1 decimal
  }
  
  /**
   * Add 360-degree feedback
   */
  async add360Feedback(reviewId: string, data: {
    selfAssessment?: string;
    managerFeedback?: string;
    peerFeedback?: Array<{
      reviewerName: string;
      feedback: string;
      rating?: number;
    }>;
  }) {
    return prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        selfAssessment: data.selfAssessment,
        managerFeedback: data.managerFeedback,
        peerFeedback: data.peerFeedback as any
      }
    });
  }
  
  /**
   * Complete performance review
   */
  async completePerformanceReview(reviewId: string, data: {
    comments?: string;
    developmentPlan?: string;
  }) {
    return prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: 'completed',
        completedDate: new Date(),
        comments: data.comments,
        developmentPlan: data.developmentPlan
      }
    });
  }
  
  /**
   * Acknowledge performance review (by employee)
   */
  async acknowledgePerformanceReview(reviewId: string) {
    return prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: 'acknowledged',
        acknowledgedDate: new Date()
      }
    });
  }
  
  // ==================== Task 24.4: Learning Management ====================
  
  /**
   * Create learning course
   */
  async createLearningCourse(data: {
    title: string;
    description: string;
    category: string;
    level?: string;
    duration: number;
    instructor?: string;
    instructorBio?: string;
    content: Array<{
      title: string;
      description: string;
      duration: number;
      content: string;
      order: number;
    }>;
    maxEnrollments?: number;
    prerequisites?: string[];
  }) {
    const courseCode = `COURSE-${Date.now()}`;
    
    return prisma.learningCourse.create({
      data: {
        courseCode,
        title: data.title,
        description: data.description,
        category: data.category,
        level: data.level || 'beginner',
        duration: data.duration,
        instructor: data.instructor,
        instructorBio: data.instructorBio,
        content: data.content as any,
        maxEnrollments: data.maxEnrollments,
        prerequisites: data.prerequisites as any,
        isActive: true
      }
    });
  }
  
  /**
   * Enroll employee in course
   */
  async enrollInCourse(employeeId: string, courseId: string) {
    // Check if already enrolled
    const existing = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_employeeId: {
          courseId,
          employeeId
        }
      }
    });
    
    if (existing) {
      throw new Error('Employee already enrolled in this course');
    }
    
    // Check prerequisites
    const course = await prisma.learningCourse.findUnique({
      where: { id: courseId }
    });
    
    if (course?.prerequisites && Array.isArray(course.prerequisites) && course.prerequisites.length > 0) {
      // Check if employee has completed prerequisites
      const completedCourses = await prisma.courseEnrollment.findMany({
        where: {
          employeeId,
          courseId: { in: course.prerequisites as string[] },
          status: 'completed'
        }
      });
      
      if (completedCourses.length < course.prerequisites.length) {
        throw new Error('Prerequisites not met');
      }
    }
    
    return prisma.courseEnrollment.create({
      data: {
        courseId,
        employeeId,
        status: 'enrolled',
        progress: 0
      }
    });
  }
  
  /**
   * Update course progress
   */
  async updateCourseProgress(enrollmentId: string, progress: number) {
    const updateData: any = {
      progress,
      updatedAt: new Date()
    };
    
    if (progress > 0 && progress < 100) {
      updateData.status = 'in_progress';
      updateData.startDate = new Date();
    }
    
    return prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: updateData
    });
  }
  
  /**
   * Complete course and generate certificate
   */
  async completeCourse(enrollmentId: string, score: number) {
    const passed = score >= 70; // 70% passing score
    
    // Generate certificate URL (in real implementation, this would generate actual certificate)
    const certificateUrl = passed ? `/certificates/${enrollmentId}.pdf` : undefined;
    
    return prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'completed',
        completionDate: new Date(),
        progress: 100,
        score,
        passed,
        certificateUrl,
        certificateIssued: passed ? new Date() : undefined
      }
    });
  }
  
  /**
   * Get course catalog
   */
  async getCourseCatalog(filters?: {
    category?: string;
    level?: string;
    isActive?: boolean;
  }) {
    const where: any = {};
    
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.level) {
      where.level = filters.level;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    
    return prisma.learningCourse.findMany({
      where,
      include: {
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });
  }
  
  // ==================== Task 24.5: Succession Planning ====================
  
  /**
   * Identify high-potential employees
   * Based on performance ratings and competencies
   */
  async identifyHighPotentialEmployees(minRating: number = 4.0) {
    // Get employees with recent high performance ratings
    const employees = await prisma.employee.findMany({
      where: {
        status: 'active',
        performanceReviews: {
          some: {
            overallRating: { gte: minRating },
            status: 'completed'
          }
        }
      },
      include: {
        performanceReviews: {
          where: { status: 'completed' },
          orderBy: { reviewPeriodEnd: 'desc' },
          take: 2
        }
      }
    });
    
    return employees.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      averageRating: emp.performanceReviews.reduce((sum, r) => sum + r.overallRating, 0) / emp.performanceReviews.length
    }));
  }
  
  /**
   * Create succession plan
   */
  async createSuccessionPlan(data: {
    positionTitle: string;
    department: string;
    currentEmployeeId?: string;
    criticality?: string;
    riskLevel?: string;
    candidates: Array<{
      employeeId: string;
      readiness: string;
      developmentNeeds: string[];
    }>;
    targetDate?: Date;
  }) {
    return prisma.successionPlan.create({
      data: {
        positionTitle: data.positionTitle,
        department: data.department,
        currentEmployeeId: data.currentEmployeeId,
        criticality: data.criticality || 'medium',
        riskLevel: data.riskLevel || 'medium',
        candidates: data.candidates as any,
        targetDate: data.targetDate,
        status: 'active'
      }
    });
  }
  
  /**
   * Update succession plan readiness
   */
  async updateSuccessionReadiness(planId: string, candidates: Array<{
    employeeId: string;
    readiness: string;
    developmentNeeds: string[];
  }>) {
    return prisma.successionPlan.update({
      where: { id: planId },
      data: {
        candidates: candidates as any,
        updatedAt: new Date()
      }
    });
  }
  
  // ==================== Task 24.6: Payroll Processing ====================
  
  /**
   * Create payroll run
   */
  async createPayroll(data: {
    periodStart: Date;
    periodEnd: Date;
    paymentDate: Date;
    country: string;
    currency?: string;
    employeeIds?: string[];
  }) {
    const payrollNo = `PAY-${Date.now()}`;
    
    return prisma.payroll.create({
      data: {
        payrollNo,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        paymentDate: data.paymentDate,
        country: data.country,
        currency: data.currency || 'USD',
        status: 'draft'
      }
    });
  }
  
  /**
   * Calculate payroll for employees
   */
  async calculatePayroll(payrollId: string, employeeIds: string[]) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId }
    });
    
    if (!payroll) {
      throw new Error('Payroll not found');
    }
    
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        status: 'active'
      }
    });
    
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    
    for (const employee of employees) {
      // Calculate earnings
      const basicSalary = employee.salary;
      const overtime = 0; // Would be calculated from attendance
      const bonus = 0; // Would be calculated from performance/policy
      
      // Country-specific allowances
      const allowances = this.calculateAllowances(employee, payroll.country);
      const allowancesTotal = allowances.reduce((sum, a) => sum + a.amount, 0);
      
      const grossPay = basicSalary + overtime + bonus + allowancesTotal;
      
      // Country-specific deductions
      const deductions = this.calculateDeductions(employee, grossPay, payroll.country);
      const deductionsTotal = deductions.reduce((sum, d) => sum + d.amount, 0);
      
      const netPay = grossPay - deductionsTotal;
      
      // Create payroll item
      await prisma.payrollItem.create({
        data: {
          payrollId,
          employeeId: employee.id,
          basicSalary,
          overtime,
          bonus,
          allowances: allowances as any,
          tax: deductions.find(d => d.type === 'tax')?.amount || 0,
          socialSecurity: deductions.find(d => d.type === 'social_security')?.amount || 0,
          insurance: deductions.find(d => d.type === 'insurance')?.amount || 0,
          otherDeductions: deductions.filter(d => !['tax', 'social_security', 'insurance'].includes(d.type)) as any,
          grossPay,
          totalDeductions: deductionsTotal,
          netPay
        }
      });
      
      totalGrossPay += grossPay;
      totalDeductions += deductionsTotal;
      totalNetPay += netPay;
    }
    
    // Update payroll totals
    return prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'calculated',
        totalGrossPay,
        totalDeductions,
        totalNetPay
      }
    });
  }
  
  /**
   * Calculate country-specific allowances
   */
  private calculateAllowances(employee: any, country: string): Array<{ type: string; amount: number }> {
    const allowances: Array<{ type: string; amount: number }> = [];
    
    // Country-specific rules
    switch (country) {
      case 'US':
        // US-specific allowances
        break;
      case 'UK':
        // UK-specific allowances
        break;
      case 'IN':
        // India-specific allowances
        allowances.push({ type: 'HRA', amount: employee.salary * 0.4 });
        allowances.push({ type: 'Transport', amount: 1600 });
        break;
      default:
        // Default allowances
        break;
    }
    
    return allowances;
  }
  
  /**
   * Calculate country-specific deductions
   */
  private calculateDeductions(_employee: any, grossPay: number, country: string): Array<{ type: string; amount: number }> {
    const deductions: Array<{ type: string; amount: number }> = [];
    
    // Country-specific tax rules
    switch (country) {
      case 'US':
        // US federal tax (simplified)
        deductions.push({ type: 'tax', amount: grossPay * 0.22 });
        deductions.push({ type: 'social_security', amount: grossPay * 0.062 });
        deductions.push({ type: 'medicare', amount: grossPay * 0.0145 });
        break;
      case 'UK':
        // UK PAYE (simplified)
        deductions.push({ type: 'tax', amount: grossPay * 0.20 });
        deductions.push({ type: 'national_insurance', amount: grossPay * 0.12 });
        break;
      case 'IN':
        // India tax (simplified)
        deductions.push({ type: 'tax', amount: grossPay * 0.10 });
        deductions.push({ type: 'provident_fund', amount: grossPay * 0.12 });
        break;
      default:
        // Default tax rate
        deductions.push({ type: 'tax', amount: grossPay * 0.15 });
        break;
    }
    
    return deductions;
  }
  
  /**
   * Approve payroll
   */
  async approvePayroll(payrollId: string, approvedBy: string) {
    return prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'approved',
        approvedBy,
        approvedDate: new Date()
      }
    });
  }
  
  /**
   * Process payroll (mark as processed)
   */
  async processPayroll(payrollId: string, processedBy: string) {
    return prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'processed',
        processedBy,
        processedDate: new Date()
      }
    });
  }
  
  /**
   * Generate payslip for employee
   */
  async generatePayslip(payrollItemId: string): Promise<string> {
    const payrollItem = await prisma.payrollItem.findUnique({
      where: { id: payrollItemId },
      include: {
        employee: true,
        payroll: true
      }
    });
    
    if (!payrollItem) {
      throw new Error('Payroll item not found');
    }
    
    // In real implementation, this would generate a PDF
    const payslipUrl = `/payslips/${payrollItemId}.pdf`;
    
    await prisma.payrollItem.update({
      where: { id: payrollItemId },
      data: {
        payslipUrl
      }
    });
    
    return payslipUrl;
  }
  
  /**
   * Get payroll details
   */
  async getPayroll(payrollId: string) {
    return prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        payrollItems: {
          include: {
            employee: true
          }
        }
      }
    });
  }
}

export default new HCMService();
