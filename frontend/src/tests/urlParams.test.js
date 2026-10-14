import { describe, it, expect } from 'vitest';
import {
  parseTaskParams,
  parseEmployeeParams,
  buildCleanSearchParams,
  VALID_DEPARTMENTS,
  VALID_TASK_STATUSES,
  VALID_TASK_PRIORITIES,
} from '../utils/urlParams.js';

describe('Frontend URL Parameter Synchronization & Parsing', () => {
  describe('parseTaskParams', () => {
    it('should correctly parse valid task URL parameters', () => {
      const searchParams = new URLSearchParams('status=In%20Progress&priority=High&page=2&department=Development&search=API');
      const parsed = parseTaskParams(searchParams);

      expect(parsed).toEqual({
        search: 'API',
        department: 'Development',
        priority: 'High',
        status: 'In Progress',
        dueFrom: '',
        dueTo: '',
        sortBy: 'createdDate',
        sortOrder: 'desc',
        page: 2,
      });
    });

    it('should safely normalize invalid or malformed parameters to defaults', () => {
      const searchParams = new URLSearchParams('status=UnknownStatus&priority=InvalidPriority&page=-99&department=NonExistent&dueFrom=not-a-date');
      const parsed = parseTaskParams(searchParams);

      expect(parsed.status).toBe('All');
      expect(parsed.priority).toBe('All');
      expect(parsed.department).toBe('All');
      expect(parsed.page).toBe(1);
      expect(parsed.dueFrom).toBe('');
    });

    it('should parse valid date strings and trim search text', () => {
      const searchParams = new URLSearchParams('search=%20%20payment%20flow%20%20&dueFrom=2026-10-01&dueTo=2026-10-31');
      const parsed = parseTaskParams(searchParams);

      expect(parsed.search).toBe('payment flow');
      expect(parsed.dueFrom).toBe('2026-10-01');
      expect(parsed.dueTo).toBe('2026-10-31');
    });
  });

  describe('parseEmployeeParams', () => {
    it('should correctly parse employee URL parameters', () => {
      const searchParams = new URLSearchParams('search=Rahul&department=Development&status=Active&sortBy=fullName&sortOrder=asc&page=3');
      const parsed = parseEmployeeParams(searchParams);

      expect(parsed).toEqual({
        search: 'Rahul',
        department: 'Development',
        status: 'Active',
        sortBy: 'fullName',
        sortOrder: 'asc',
        page: 3,
      });
    });

    it('should fallback to safe defaults on empty or invalid params', () => {
      const searchParams = new URLSearchParams('page=abc&sortBy=maliciousCode');
      const parsed = parseEmployeeParams(searchParams);

      expect(parsed.page).toBe(1);
      expect(parsed.sortBy).toBe('createdAt');
      expect(parsed.sortOrder).toBe('desc');
      expect(parsed.department).toBe('All');
      expect(parsed.status).toBe('All');
    });
  });

  describe('buildCleanSearchParams', () => {
    it('should omit default values to maintain clean, canonical URLs', () => {
      const current = {
        department: 'Development',
        status: 'All',
        priority: 'All',
        search: '',
        page: 1,
      };

      const result = buildCleanSearchParams(current, {}, {
        department: 'All',
        status: 'All',
        priority: 'All',
        search: '',
      });

      expect(result.toString()).toBe('department=Development');
    });

    it('should automatically reset page to 1 when any filter or search changes', () => {
      const current = {
        department: 'Development',
        page: 5,
      };

      // Updating priority without specifying page must reset page
      const result = buildCleanSearchParams(current, { priority: 'Critical' }, {
        department: 'All',
        priority: 'All',
      });

      expect(result.get('priority')).toBe('Critical');
      expect(result.get('department')).toBe('Development');
      expect(result.has('page')).toBe(false); // page 1 is omitted as default
    });

    it('should preserve explicit page changes', () => {
      const current = {
        department: 'Development',
        priority: 'High',
      };

      const result = buildCleanSearchParams(current, { page: 3 }, {
        department: 'All',
        priority: 'All',
      });

      expect(result.get('page')).toBe('3');
      expect(result.get('department')).toBe('Development');
      expect(result.get('priority')).toBe('High');
    });
  });
});
