import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class HRMSController {
  
  static async createEmployee(req: Request, res: Response) {
    try {
      const { userId, employeeCode, firstName, lastName, position, departmentId, salary, hireDate } = req.body;
      const employee = await prisma.employee.create({
        data: {
          userId,
          employeeCode,
          firstName,
          lastName,
          position,
          departmentId,
          salary: Number(salary) || 0,
          hireDate: new Date(hireDate)
        }
      });
      res.status(201).json({ success: true, employee });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create employee' });
    }
  }

  static async recordAttendance(req: Request, res: Response) {
    try {
      const { employeeId, date, clockIn, clockOut, status } = req.body;
      
      const attendance = await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date: new Date(date) } },
        update: {
          clockIn: clockIn ? new Date(clockIn) : undefined,
          clockOut: clockOut ? new Date(clockOut) : undefined,
          status
        },
        create: {
          employeeId,
          date: new Date(date),
          clockIn: clockIn ? new Date(clockIn) : null,
          clockOut: clockOut ? new Date(clockOut) : null,
          status: status || 'present'
        }
      });
      
      res.json({ success: true, attendance });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to record attendance' });
    }
  }

  static async processPayroll(req: Request, res: Response) {
    try {
      const { employeeId, periodStart, periodEnd, basicSalary, allowances, deductions } = req.body;
      
      const netPay = Number(basicSalary) + Number(allowances || 0) - Number(deductions || 0);

      const payroll = await prisma.payrollSlip.create({
        data: {
          employeeId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          basicSalary: Number(basicSalary),
          allowances: Number(allowances || 0),
          deductions: Number(deductions || 0),
          netPay,
          status: 'processed'
        }
      });
      res.status(201).json({ success: true, payroll });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to process payroll' });
    }
  }
}
