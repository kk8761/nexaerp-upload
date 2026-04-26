import { Request, Response } from 'express';
import prisma from '../config/prisma';
import crypto from 'crypto';

export class IntegrationsController {
  
  static async createWebhook(req: Request, res: Response) {
    try {
      const { name, url, events, secret } = req.body;
      const webhook = await prisma.webhook.create({
        data: { name, url, events, secret }
      });
      res.status(201).json({ success: true, webhook });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create webhook' });
    }
  }

  static async createApiKey(req: Request, res: Response) {
    try {
      const { name } = req.body;
      const user: any = req.user;

      // Generate a secure random API key
      const key = `nexa_${crypto.randomBytes(32).toString('hex')}`;

      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key,
          userId: user.id
        }
      });
      res.status(201).json({ success: true, apiKey });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create API key' });
    }
  }
}
