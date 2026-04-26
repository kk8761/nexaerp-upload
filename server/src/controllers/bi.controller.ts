import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class BIController {
  
  static async createReportTemplate(req: Request, res: Response) {
    try {
      const { name, module, sqlQuery, columns } = req.body;
      const user: any = req.user;

      const template = await prisma.reportTemplate.create({
        data: {
          name,
          module,
          sqlQuery,
          columns,
          createdById: user.id
        }
      });
      res.status(201).json({ success: true, template });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create report template' });
    }
  }

  static async generateReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const template = await prisma.reportTemplate.findUnique({ where: { id } });
      
      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      // Extremely dangerous in a real production environment unless strictly sanitized/parameterized
      // This is a naive implementation for the roadmap placeholder
      const rawData = await prisma.$queryRawUnsafe(template.sqlQuery);

      res.json({ success: true, data: rawData, columns: template.columns });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to execute report query' });
    }
  }
}
