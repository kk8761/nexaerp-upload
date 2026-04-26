/**
 * View Helper Utilities for EJS Templates
 */

import { Response } from 'express';
import ejs from 'ejs';
import path from 'path';

export interface ViewOptions {
  title?: string;
  description?: string;
  bodyClass?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  user?: any;
  pageStyles?: string;
  pageScripts?: string;
  [key: string]: any;
}

/**
 * Render a page with layout
 */
export async function renderWithLayout(
  res: Response,
  viewPath: string,
  options: ViewOptions = {}
): Promise<void> {
  try {
    const viewsDir = path.join(__dirname, '../views');
    
    // Add helper functions to options
    const enhancedOptions = {
      ...options,
      formatCurrency,
      formatDate,
      formatDateTime,
      truncate,
      getInitials,
      pluralize,
      getStatusBadge,
      getProgressBar
    };
    
    // Render the page content
    const pageContent = await ejs.renderFile(
      path.join(viewsDir, viewPath),
      enhancedOptions
    );
    
    // Render with layout
    const html = await ejs.renderFile(
      path.join(viewsDir, 'layouts/main.ejs'),
      {
        ...enhancedOptions,
        body: pageContent
      }
    );
    
    res.send(html);
  } catch (error) {
    console.error('View rendering error:', error);
    res.status(500).send('Error rendering page');
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Generate status badge HTML
 */
export function getStatusBadge(status: string): string {
  const statusMap: Record<string, { color: string; label: string }> = {
    active: { color: 'green', label: 'Active' },
    inactive: { color: 'gray', label: 'Inactive' },
    pending: { color: 'yellow', label: 'Pending' },
    approved: { color: 'green', label: 'Approved' },
    rejected: { color: 'red', label: 'Rejected' },
    draft: { color: 'gray', label: 'Draft' },
    completed: { color: 'green', label: 'Completed' },
    cancelled: { color: 'red', label: 'Cancelled' },
    inProgress: { color: 'blue', label: 'In Progress' }
  };

  const statusInfo = statusMap[status] || { color: 'gray', label: status };
  return `<span class="badge badge-${statusInfo.color}">${statusInfo.label}</span>`;
}

/**
 * Generate progress bar HTML
 */
export function getProgressBar(percentage: number, color: string = 'blue'): string {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  return `
    <div class="progress-bar">
      <div class="progress-fill progress-${color}" style="width: ${clampedPercentage}%"></div>
      <span class="progress-text">${clampedPercentage}%</span>
    </div>
  `;
}
