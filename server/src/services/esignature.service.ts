/**
 * E-Signature Service (Task 15.4)
 * Handles e-signature requests and workflow
 */

import prisma from '../config/prisma';
import nodemailer from 'nodemailer';

export interface CreateSignatureRequestInput {
  documentId: string;
  signers: Array<{
    email: string;
    name: string;
    signingOrder: number;
  }>;
  message?: string;
  expiryDate?: Date;
  createdById: string;
}

export interface SignDocumentInput {
  requestId: string;
  signerId: string;
  signatureData: string; // Base64 encoded signature or hash
  ipAddress?: string;
}

export class ESignatureService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Create an e-signature request
   */
  async createSignatureRequest(input: CreateSignatureRequestInput) {
    // Validate document exists
    const document = await prisma.document.findUnique({
      where: { id: input.documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Create signature request
    const request = await prisma.eSignatureRequest.create({
      data: {
        documentId: input.documentId,
        message: input.message,
        expiryDate: input.expiryDate,
        createdById: input.createdById,
        signers: {
          create: input.signers.map(signer => ({
            email: signer.email,
            name: signer.name,
            signingOrder: signer.signingOrder,
          })),
        },
      },
      include: {
        signers: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email notifications to signers with order 1
    const firstSigners = request.signers.filter((s: any) => s.signingOrder === 1);
    for (const signer of firstSigners) {
      await this.sendSignatureRequestEmail(request, signer, document);
    }

    return request;
  }

  /**
   * Get signature request by ID
   */
  async getSignatureRequest(requestId: string) {
    const request = await prisma.eSignatureRequest.findUnique({
      where: { id: requestId },
      include: {
        signers: {
          orderBy: {
            signingOrder: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error('Signature request not found');
    }

    return request;
  }

  /**
   * Sign a document
   */
  async signDocument(input: SignDocumentInput) {
    const request = await this.getSignatureRequest(input.requestId);

    // Check if request is expired
    if (request.expiryDate && new Date() > request.expiryDate) {
      throw new Error('Signature request has expired');
    }

    // Check if request is already completed or cancelled
    if (request.status !== 'pending') {
      throw new Error(`Signature request is ${request.status}`);
    }

    // Find the signer
    const signer = await prisma.eSignatureSigner.findUnique({
      where: { id: input.signerId },
    });

    if (!signer || signer.requestId !== input.requestId) {
      throw new Error('Signer not found');
    }

    // Check if signer already signed
    if (signer.status === 'signed') {
      throw new Error('Document already signed by this signer');
    }

    // Check signing order
    const previousSigners = request.signers.filter(
      (s: any) => s.signingOrder < signer.signingOrder
    );
    const allPreviousSigned = previousSigners.every((s: any) => s.status === 'signed');

    if (!allPreviousSigned) {
      throw new Error('Previous signers must sign first');
    }

    // Update signer status
    const updatedSigner = await prisma.eSignatureSigner.update({
      where: { id: input.signerId },
      data: {
        status: 'signed',
        signedAt: new Date(),
        ipAddress: input.ipAddress,
        signatureData: input.signatureData,
      },
    });

    // Check if all signers have signed
    const allSigners = await prisma.eSignatureSigner.findMany({
      where: { requestId: input.requestId },
    });

    const allSigned = allSigners.every((s: any) => s.status === 'signed');

    if (allSigned) {
      // Mark request as completed
      await prisma.eSignatureRequest.update({
        where: { id: input.requestId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    } else {
      // Notify next signers
      const nextOrder = signer.signingOrder + 1;
      const nextSigners = allSigners.filter(
        (s: any) => s.signingOrder === nextOrder && s.status === 'pending'
      );

      const document = await prisma.document.findUnique({
        where: { id: request.documentId },
      });

      for (const nextSigner of nextSigners) {
        await this.sendSignatureRequestEmail(request, nextSigner, document!);
      }
    }

    return updatedSigner;
  }

  /**
   * Decline to sign a document
   */
  async declineSignature(requestId: string, signerId: string, _reason?: string) {
    const signer = await prisma.eSignatureSigner.findUnique({
      where: { id: signerId },
    });

    if (!signer || signer.requestId !== requestId) {
      throw new Error('Signer not found');
    }

    // Update signer status
    await prisma.eSignatureSigner.update({
      where: { id: signerId },
      data: {
        status: 'declined',
      },
    });

    // Mark request as cancelled
    await prisma.eSignatureRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
      },
    });

    return { success: true, message: 'Signature declined' };
  }

  /**
   * Get signature requests for a document
   */
  async getDocumentSignatureRequests(documentId: string) {
    const requests = await prisma.eSignatureRequest.findMany({
      where: { documentId },
      include: {
        signers: {
          orderBy: {
            signingOrder: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * Send signature request email
   */
  private async sendSignatureRequestEmail(
    request: any,
    signer: any,
    document: any
  ) {
    const signUrl = `${process.env.APP_URL}/documents/sign/${request.id}/${signer.id}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@nexaerp.com',
      to: signer.email,
      subject: `Signature Request: ${document.title}`,
      html: `
        <h2>Signature Request</h2>
        <p>Hello ${signer.name},</p>
        <p>You have been requested to sign the document: <strong>${document.title}</strong></p>
        ${request.message ? `<p>Message: ${request.message}</p>` : ''}
        <p>Please click the link below to review and sign the document:</p>
        <p><a href="${signUrl}">Sign Document</a></p>
        ${request.expiryDate ? `<p>This request expires on: ${new Date(request.expiryDate).toLocaleDateString()}</p>` : ''}
        <p>Thank you,<br/>NexaERP Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send signature request email:', error);
      // Don't throw error, just log it
    }
  }
}

export default new ESignatureService();
