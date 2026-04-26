/**
 * Bank Statement Parsers - CSV and OFX format support
 */

interface BankTransaction {
  transactionDate: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceNo?: string;
}

interface ParsedStatement {
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: BankTransaction[];
}

/**
 * Parse CSV bank statement
 * Expected format: Date,Description,Debit,Credit,Balance,Reference
 */
export function parseCSVStatement(csvContent: string): ParsedStatement {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('Invalid CSV format: insufficient data');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const transactions: BankTransaction[] = [];
  
  let openingBalance = 0;
  let closingBalance = 0;
  let statementDate = new Date();

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line);
    
    if (fields.length < 5) {
      console.warn(`Skipping invalid line ${i + 2}: insufficient fields`);
      continue;
    }

    const [dateStr, description, debitStr, creditStr, balanceStr, referenceNo] = fields;

    try {
      const transactionDate = parseDate(dateStr);
      const debit = parseFloat(debitStr) || 0;
      const credit = parseFloat(creditStr) || 0;
      const balance = parseFloat(balanceStr);

      // First transaction's balance minus its amount is opening balance
      if (i === 0) {
        openingBalance = balance - credit + debit;
      }

      // Last transaction's balance is closing balance
      if (i === dataLines.length - 1) {
        closingBalance = balance;
        statementDate = transactionDate;
      }

      transactions.push({
        transactionDate,
        description: description.trim(),
        debit,
        credit,
        balance,
        referenceNo: referenceNo?.trim() || undefined,
      });
    } catch (error) {
      console.warn(`Skipping invalid line ${i + 2}:`, error);
    }
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in CSV');
  }

  return {
    statementDate,
    openingBalance,
    closingBalance,
    transactions,
  };
}

/**
 * Parse OFX (Open Financial Exchange) bank statement
 * Supports OFX 1.x and 2.x formats
 */
export function parseOFXStatement(ofxContent: string): ParsedStatement {
  // Remove BOM if present
  ofxContent = ofxContent.replace(/^\uFEFF/, '');

  // Detect OFX version
  const isOFX2 = ofxContent.includes('<?xml');

  if (isOFX2) {
    return parseOFX2(ofxContent);
  } else {
    return parseOFX1(ofxContent);
  }
}

/**
 * Parse OFX 1.x (SGML-like format)
 */
function parseOFX1(content: string): ParsedStatement {
  const transactions: BankTransaction[] = [];
  
  // Extract statement date
  const dtEndMatch = content.match(/<DTEND>(\d+)/);
  const statementDate = dtEndMatch ? parseOFXDate(dtEndMatch[1]) : new Date();

  // Extract balances
  const balLedgerMatch = content.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([-\d.]+)/);
  const closingBalance = balLedgerMatch ? parseFloat(balLedgerMatch[1]) : 0;

  // Extract transactions
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const trnContent = match[1];
    
    // const trnTypeMatch = trnContent.match(/<TRNTYPE>([^<]+)/);
    const dtPostedMatch = trnContent.match(/<DTPOSTED>(\d+)/);
    const trnAmtMatch = trnContent.match(/<TRNAMT>([-\d.]+)/);
    const nameMatch = trnContent.match(/<NAME>([^<]+)/);
    const fitIdMatch = trnContent.match(/<FITID>([^<]+)/);

    if (!dtPostedMatch || !trnAmtMatch) continue;

    const amount = parseFloat(trnAmtMatch[1]);
    const transactionDate = parseOFXDate(dtPostedMatch[1]);
    
    transactions.push({
      transactionDate,
      description: nameMatch ? nameMatch[1].trim() : 'Unknown',
      debit: amount < 0 ? Math.abs(amount) : 0,
      credit: amount > 0 ? amount : 0,
      balance: 0, // Will be calculated
      referenceNo: fitIdMatch ? fitIdMatch[1] : undefined,
    });
  }

  // Calculate running balance
  let runningBalance = closingBalance;
  for (let i = transactions.length - 1; i >= 0; i--) {
    transactions[i].balance = runningBalance;
    runningBalance -= transactions[i].credit;
    runningBalance += transactions[i].debit;
  }

  const openingBalance = runningBalance;

  return {
    statementDate,
    openingBalance,
    closingBalance,
    transactions,
  };
}

/**
 * Parse OFX 2.x (XML format)
 */
function parseOFX2(content: string): ParsedStatement {
  const transactions: BankTransaction[] = [];
  
  // Extract statement date
  const dtEndMatch = content.match(/<DTEND>(\d+)/);
  const statementDate = dtEndMatch ? parseOFXDate(dtEndMatch[1]) : new Date();

  // Extract balances
  const balLedgerMatch = content.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([-\d.]+)/);
  const closingBalance = balLedgerMatch ? parseFloat(balLedgerMatch[1]) : 0;

  // Extract transactions
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const trnContent = match[1];
    
    const dtPostedMatch = trnContent.match(/<DTPOSTED>(\d+)/);
    const trnAmtMatch = trnContent.match(/<TRNAMT>([-\d.]+)/);
    const nameMatch = trnContent.match(/<NAME>([^<]+)/);
    const fitIdMatch = trnContent.match(/<FITID>([^<]+)/);

    if (!dtPostedMatch || !trnAmtMatch) continue;

    const amount = parseFloat(trnAmtMatch[1]);
    const transactionDate = parseOFXDate(dtPostedMatch[1]);
    
    transactions.push({
      transactionDate,
      description: nameMatch ? nameMatch[1].trim() : 'Unknown',
      debit: amount < 0 ? Math.abs(amount) : 0,
      credit: amount > 0 ? amount : 0,
      balance: 0, // Will be calculated
      referenceNo: fitIdMatch ? fitIdMatch[1] : undefined,
    });
  }

  // Calculate running balance
  let runningBalance = closingBalance;
  for (let i = transactions.length - 1; i >= 0; i--) {
    transactions[i].balance = runningBalance;
    runningBalance -= transactions[i].credit;
    runningBalance += transactions[i].debit;
  }

  const openingBalance = runningBalance;

  return {
    statementDate,
    openingBalance,
    closingBalance,
    transactions,
  };
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField);
  return fields;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date {
  // Try ISO format first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // Assume MM/DD/YYYY for US format
        date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      } else {
        date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
      
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  throw new Error(`Unable to parse date: ${dateStr}`);
}

/**
 * Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
 */
function parseOFXDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  
  return new Date(year, month, day);
}

/**
 * Detect file format from content
 */
export function detectStatementFormat(content: string): 'csv' | 'ofx' | 'unknown' {
  content = content.trim();
  
  if (content.startsWith('<?xml') || content.includes('<OFX>')) {
    return 'ofx';
  }
  
  // Check if it looks like CSV (has commas and multiple lines)
  const lines = content.split('\n');
  if (lines.length > 1 && lines[0].includes(',')) {
    return 'csv';
  }
  
  return 'unknown';
}
