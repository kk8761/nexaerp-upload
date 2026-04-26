/**
 * Human Capital Management (HCM) Models
 * Type definitions for HCM entities
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ==================== Recruitment Models ====================

export interface JobRequisitionData extends BaseEntityData {
  requisitionNo: string;
  title: string;
  department: string;
  positions: number;
  description: string;
  requirements: string[];
  status: 'draft' | 'open' | 'in_progress' | 'filled' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  postedDate?: Date;
  closedDate?: Date;
}

export class JobRequisition extends BaseEntity implements JobRequisitionData {
  requisitionNo: string;
  title: string;
  department: string;
  positions: number;
  description: string;
  requirements: string[];
  status: 'draft' | 'open' | 'in_progress' | 'filled' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  postedDate?: Date;
  closedDate?: Date;

  constructor(data: JobRequisitionData) {
    super(data);
    this.requisitionNo = data.requisitionNo;
    this.title = data.title;
    this.department = data.department;
    this.positions = data.positions;
    this.description = data.description;
    this.requirements = data.requirements;
    this.status = data.status;
    this.priority = data.priority;
    this.approvalStatus = data.approvalStatus;
    this.approvedBy = data.approvedBy;
    this.approvedDate = data.approvedDate;
    this.postedDate = data.postedDate;
    this.closedDate = data.closedDate;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requisitionNo: this.requisitionNo,
      title: this.title,
      department: this.department,
      positions: this.positions,
      description: this.description,
      requirements: this.requirements,
      status: this.status,
      priority: this.priority,
      approvalStatus: this.approvalStatus,
      approvedBy: this.approvedBy,
      approvedDate: this.approvedDate,
      postedDate: this.postedDate,
      closedDate: this.closedDate,
    };
  }
}

export interface CandidateData extends BaseEntityData {
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  appliedDate: Date;
  stage: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'final_interview' | 'offer_extended' | 'hired' | 'rejected';
  score: number;
  source?: string;
  hiredDate?: Date;
  employeeId?: string;
  notes?: string;
}

export class Candidate extends BaseEntity implements CandidateData {
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  appliedDate: Date;
  stage: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'final_interview' | 'offer_extended' | 'hired' | 'rejected';
  score: number;
  source?: string;
  hiredDate?: Date;
  employeeId?: string;
  notes?: string;

  constructor(data: CandidateData) {
    super(data);
    this.requisitionId = data.requisitionId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.phone = data.phone;
    this.resumeUrl = data.resumeUrl;
    this.coverLetter = data.coverLetter;
    this.appliedDate = data.appliedDate;
    this.stage = data.stage;
    this.score = data.score;
    this.source = data.source;
    this.hiredDate = data.hiredDate;
    this.employeeId = data.employeeId;
    this.notes = data.notes;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requisitionId: this.requisitionId,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      resumeUrl: this.resumeUrl,
      coverLetter: this.coverLetter,
      appliedDate: this.appliedDate,
      stage: this.stage,
      score: this.score,
      source: this.source,
      hiredDate: this.hiredDate,
      employeeId: this.employeeId,
      notes: this.notes,
    };
  }
}

// ==================== Performance Management Models ====================

export interface Goal {
  description: string;
  weight: number;
  achievement: number;
  rating: number;
}

export interface CompetencyRating {
  competency: string;
  rating: number;
  comments?: string;
}

export interface PeerFeedback {
  reviewerName: string;
  feedback: string;
  rating?: number;
}

export interface PerformanceReviewData extends BaseEntityData {
  employeeId: string;
  reviewPeriodStart: Date;
  reviewPeriodEnd: Date;
  reviewerId: string;
  reviewerName: string;
  goals: Goal[];
  competencies: CompetencyRating[];
  overallRating: number;
  selfAssessment?: string;
  managerFeedback?: string;
  peerFeedback?: PeerFeedback[];
  status: 'draft' | 'in_progress' | 'completed' | 'acknowledged';
  dueDate?: Date;
  completedDate?: Date;
  acknowledgedDate?: Date;
  comments?: string;
  developmentPlan?: string;
}

export class PerformanceReview extends BaseEntity implements PerformanceReviewData {
  employeeId: string;
  reviewPeriodStart: Date;
  reviewPeriodEnd: Date;
  reviewerId: string;
  reviewerName: string;
  goals: Goal[];
  competencies: CompetencyRating[];
  overallRating: number;
  selfAssessment?: string;
  managerFeedback?: string;
  peerFeedback?: PeerFeedback[];
  status: 'draft' | 'in_progress' | 'completed' | 'acknowledged';
  dueDate?: Date;
  completedDate?: Date;
  acknowledgedDate?: Date;
  comments?: string;
  developmentPlan?: string;

  constructor(data: PerformanceReviewData) {
    super(data);
    this.employeeId = data.employeeId;
    this.reviewPeriodStart = data.reviewPeriodStart;
    this.reviewPeriodEnd = data.reviewPeriodEnd;
    this.reviewerId = data.reviewerId;
    this.reviewerName = data.reviewerName;
    this.goals = data.goals;
    this.competencies = data.competencies;
    this.overallRating = data.overallRating;
    this.selfAssessment = data.selfAssessment;
    this.managerFeedback = data.managerFeedback;
    this.peerFeedback = data.peerFeedback;
    this.status = data.status;
    this.dueDate = data.dueDate;
    this.completedDate = data.completedDate;
    this.acknowledgedDate = data.acknowledgedDate;
    this.comments = data.comments;
    this.developmentPlan = data.developmentPlan;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      employeeId: this.employeeId,
      reviewPeriodStart: this.reviewPeriodStart,
      reviewPeriodEnd: this.reviewPeriodEnd,
      reviewerId: this.reviewerId,
      reviewerName: this.reviewerName,
      goals: this.goals,
      competencies: this.competencies,
      overallRating: this.overallRating,
      selfAssessment: this.selfAssessment,
      managerFeedback: this.managerFeedback,
      peerFeedback: this.peerFeedback,
      status: this.status,
      dueDate: this.dueDate,
      completedDate: this.completedDate,
      acknowledgedDate: this.acknowledgedDate,
      comments: this.comments,
      developmentPlan: this.developmentPlan,
    };
  }
}

// ==================== Learning Management Models ====================

export interface CourseModule {
  title: string;
  description: string;
  duration: number;
  content: string;
  order: number;
}

export interface LearningCourseData extends BaseEntityData {
  courseCode: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  instructor?: string;
  instructorBio?: string;
  content: CourseModule[];
  isActive: boolean;
  maxEnrollments?: number;
  prerequisites?: string[];
}

export class LearningCourse extends BaseEntity implements LearningCourseData {
  courseCode: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  instructor?: string;
  instructorBio?: string;
  content: CourseModule[];
  isActive: boolean;
  maxEnrollments?: number;
  prerequisites?: string[];

  constructor(data: LearningCourseData) {
    super(data);
    this.courseCode = data.courseCode;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.level = data.level;
    this.duration = data.duration;
    this.instructor = data.instructor;
    this.instructorBio = data.instructorBio;
    this.content = data.content;
    this.isActive = data.isActive;
    this.maxEnrollments = data.maxEnrollments;
    this.prerequisites = data.prerequisites;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      courseCode: this.courseCode,
      title: this.title,
      description: this.description,
      category: this.category,
      level: this.level,
      duration: this.duration,
      instructor: this.instructor,
      instructorBio: this.instructorBio,
      content: this.content,
      isActive: this.isActive,
      maxEnrollments: this.maxEnrollments,
      prerequisites: this.prerequisites,
    };
  }
}

// ==================== Payroll Models ====================

export interface Allowance {
  type: string;
  amount: number;
}

export interface Deduction {
  type: string;
  amount: number;
}

export interface PayrollData extends BaseEntityData {
  payrollNo: string;
  periodStart: Date;
  periodEnd: Date;
  paymentDate: Date;
  country: string;
  currency: string;
  status: 'draft' | 'calculated' | 'approved' | 'processed' | 'paid';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  processedBy?: string;
  processedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
}

export class Payroll extends BaseEntity implements PayrollData {
  payrollNo: string;
  periodStart: Date;
  periodEnd: Date;
  paymentDate: Date;
  country: string;
  currency: string;
  status: 'draft' | 'calculated' | 'approved' | 'processed' | 'paid';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  processedBy?: string;
  processedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;

  constructor(data: PayrollData) {
    super(data);
    this.payrollNo = data.payrollNo;
    this.periodStart = data.periodStart;
    this.periodEnd = data.periodEnd;
    this.paymentDate = data.paymentDate;
    this.country = data.country;
    this.currency = data.currency;
    this.status = data.status;
    this.totalGrossPay = data.totalGrossPay;
    this.totalDeductions = data.totalDeductions;
    this.totalNetPay = data.totalNetPay;
    this.processedBy = data.processedBy;
    this.processedDate = data.processedDate;
    this.approvedBy = data.approvedBy;
    this.approvedDate = data.approvedDate;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      payrollNo: this.payrollNo,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      paymentDate: this.paymentDate,
      country: this.country,
      currency: this.currency,
      status: this.status,
      totalGrossPay: this.totalGrossPay,
      totalDeductions: this.totalDeductions,
      totalNetPay: this.totalNetPay,
      processedBy: this.processedBy,
      processedDate: this.processedDate,
      approvedBy: this.approvedBy,
      approvedDate: this.approvedDate,
      notes: this.notes,
    };
  }
}
