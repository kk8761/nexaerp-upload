/**
 * HCM Service Tests
 * Basic tests for Human Capital Management functionality
 */

import hcmService from '../services/hcm.service';

describe('HCM Service', () => {
  
  describe('Recruitment', () => {
    test('should calculate candidate score', async () => {
      const score = await hcmService.calculateCandidateScore({
        resumeUrl: 'https://example.com/resume.pdf',
        coverLetter: 'This is a detailed cover letter explaining my qualifications and interest in the position.',
        phone: '+1234567890'
      });
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
    
    test('should calculate lower score without complete information', async () => {
      const score = await hcmService.calculateCandidateScore({});
      
      expect(score).toBe(50); // Base score
    });
  });
  
  describe('Performance Management', () => {
    test('should calculate performance rating', () => {
      const goals = [
        { weight: 0.4, rating: 4.5 },
        { weight: 0.3, rating: 4.0 },
        { weight: 0.3, rating: 5.0 }
      ];
      
      const competencies = [
        { rating: 4.0 },
        { rating: 4.5 },
        { rating: 4.2 }
      ];
      
      const rating = hcmService.calculatePerformanceRating(goals, competencies);
      
      expect(rating).toBeGreaterThan(0);
      expect(rating).toBeLessThanOrEqual(5);
    });
  });
  
  describe('Payroll', () => {
    test('should calculate US deductions correctly', () => {
      const employee = { salary: 5000 };
      const grossPay = 5000;
      const country = 'US';
      
      // Access private method through any type casting for testing
      const service = hcmService as any;
      const deductions = service.calculateDeductions(employee, grossPay, country);
      
      expect(deductions).toBeInstanceOf(Array);
      expect(deductions.length).toBeGreaterThan(0);
      
      const totalDeductions = deductions.reduce((sum: number, d: any) => sum + d.amount, 0);
      expect(totalDeductions).toBeGreaterThan(0);
    });
    
    test('should calculate UK deductions correctly', () => {
      const employee = { salary: 5000 };
      const grossPay = 5000;
      const country = 'UK';
      
      const service = hcmService as any;
      const deductions = service.calculateDeductions(employee, grossPay, country);
      
      expect(deductions).toBeInstanceOf(Array);
      expect(deductions.length).toBeGreaterThan(0);
    });
    
    test('should calculate India deductions correctly', () => {
      const employee = { salary: 5000 };
      const grossPay = 5000;
      const country = 'IN';
      
      const service = hcmService as any;
      const deductions = service.calculateDeductions(employee, grossPay, country);
      
      expect(deductions).toBeInstanceOf(Array);
      expect(deductions.length).toBeGreaterThan(0);
    });
  });
});
