/**
 * OCR Service (Task 15.2)
 * Handles OCR processing and data extraction from documents
 */

import Tesseract from 'tesseract.js';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface InvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  totalAmount?: number;
  currency?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }>;
}

export class OCRService {
  /**
   * Perform OCR on an image file
   */
  async performOCR(filePath: string): Promise<OCRResult> {
    try {
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: (m) => console.log(m),
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to perform OCR');
    }
  }

  /**
   * Extract text from PDF
   */
  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.promises.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Convert PDF to images for OCR (for scanned PDFs)
   */
  async convertPDFToImages(_filePath: string): Promise<string[]> {
    // This is a simplified implementation
    // In production, you'd use pdf2pic or similar library
    throw new Error('PDF to image conversion not implemented yet');
  }

  /**
   * Process document based on file type
   */
  async processDocument(filePath: string, mimeType: string): Promise<OCRResult> {
    if (mimeType === 'application/pdf') {
      // Try to extract text directly from PDF first
      try {
        const text = await this.extractTextFromPDF(filePath);
        if (text && text.trim().length > 0) {
          return {
            text,
            confidence: 100, // Direct PDF text extraction is 100% accurate
          };
        }
      } catch (error) {
        console.log('Direct PDF extraction failed, falling back to OCR');
      }
    }

    // For images or scanned PDFs, use OCR
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      return await this.performOCR(filePath);
    }

    throw new Error(`Unsupported file type for OCR: ${mimeType}`);
  }

  /**
   * Extract invoice data from text using pattern matching
   */
  extractInvoiceData(text: string): InvoiceData {
    const invoiceData: InvoiceData = {};

    // Extract invoice number
    const invoiceNumberMatch = text.match(/invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i);
    if (invoiceNumberMatch) {
      invoiceData.invoiceNumber = invoiceNumberMatch[1];
    }

    // Extract dates (various formats)
    const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g;
    const dates = text.match(datePattern);
    
    // Try to identify invoice date
    const invoiceDateMatch = text.match(/invoice\s*date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
    if (invoiceDateMatch) {
      invoiceData.invoiceDate = invoiceDateMatch[1];
    } else if (dates && dates.length > 0) {
      invoiceData.invoiceDate = dates[0];
    }

    // Try to identify due date
    const dueDateMatch = text.match(/due\s*date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
    if (dueDateMatch) {
      invoiceData.dueDate = dueDateMatch[1];
    } else if (dates && dates.length > 1) {
      invoiceData.dueDate = dates[1];
    }

    // Extract vendor name (usually at the top)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      // First non-empty line is often the vendor name
      invoiceData.vendorName = lines[0].trim();
    }

    // Extract total amount
    const totalPatterns = [
      /total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
      /amount\s*due\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
      /grand\s*total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        invoiceData.totalAmount = parseFloat(amountStr);
        break;
      }
    }

    // Extract currency
    const currencyMatch = text.match(/\b(USD|EUR|GBP|CAD|AUD|INR)\b/i);
    if (currencyMatch) {
      invoiceData.currency = currencyMatch[1].toUpperCase();
    } else if (text.includes('$')) {
      invoiceData.currency = 'USD';
    }

    return invoiceData;
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(inputPath: string, outputPath: string): Promise<void> {
    try {
      await sharp(inputPath)
        .greyscale()
        .normalize()
        .sharpen()
        .toFile(outputPath);
    } catch (error) {
      console.error('Image preprocessing error:', error);
      throw new Error('Failed to preprocess image');
    }
  }
}

export default new OCRService();
