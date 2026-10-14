import { describe, it, expect } from 'vitest';
import {
  formatDateDisplay,
  formatDateInput,
  isTaskOverdue,
  getTodayDateInput,
} from '../utils/dateUtils.js';

describe('Frontend Date Utilities', () => {
  it('should format dates for UI display with or without year', () => {
    const date = new Date('2026-10-15T00:00:00.000Z');
    expect(formatDateDisplay(date, true)).toBe('15 Oct 2026');
    expect(formatDateDisplay(date, false)).toBe('15 Oct');
    expect(formatDateDisplay(null)).toBe('-');
    expect(formatDateDisplay('invalid-date')).toBe('-');
  });

  it('should format dates for HTML date inputs (YYYY-MM-DD)', () => {
    expect(formatDateInput('2026-10-15T12:00:00.000Z')).toBe('2026-10-15');
    expect(formatDateInput(null)).toBe('');
    expect(formatDateInput('invalid')).toBe('');
  });

  it('should calculate task overdue state according to authoritative business rules', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    // Active + Past Due -> Overdue
    expect(isTaskOverdue(yesterday, 'Todo')).toBe(true);
    expect(isTaskOverdue(yesterday, 'In Progress')).toBe(true);

    // Active + Future Due -> NOT Overdue
    expect(isTaskOverdue(tomorrow, 'Todo')).toBe(false);
    expect(isTaskOverdue(tomorrow, 'In Progress')).toBe(false);

    // Terminal Tasks + Past Due -> NEVER Overdue
    expect(isTaskOverdue(yesterday, 'Completed')).toBe(false);
    expect(isTaskOverdue(yesterday, 'Cancelled')).toBe(false);

    // Missing due date -> NOT Overdue
    expect(isTaskOverdue(null, 'Todo')).toBe(false);
  });

  it('should return today date input string', () => {
    const today = getTodayDateInput();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
