import { Task } from '../models/Task.js';
import { buildTaskFilter } from './taskService.js';
import { computeIsOverdue } from '../utils/overdueHelper.js';

/**
 * Escapes values for RFC 4180 CSV compliance and protects against
 * Spreadsheet Formula Injection (CSV Injection / CWE-1236).
 */
export const escapeCsvValue = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Mitigate Formula Injection:
  // If field starts with =, +, -, @, tab, or carriage return, prepend with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 standard: Escape internal double quotes by doubling them (" -> "")
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
  }

  return `"${str}"`;
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const generateTasksCsv = async (queryParams = {}) => {
  // 1. Reuses the identical task-list filter logic to ensure 100% query parity
  const filter = buildTaskFilter(queryParams);

  // 2. Export ALL matching tasks across the database (never limited to current pagination page)
  const tasks = await Task.find(filter)
    .populate('assignedEmployee', 'fullName employeeId department')
    .sort({ dueDate: 1, createdDate: -1 });

  const headers = [
    'Task ID',
    'Title',
    'Assigned Employee',
    'Employee ID',
    'Department',
    'Priority',
    'Status',
    'Start Date',
    'Due Date',
    'Overdue',
    'Completed Date',
    'Created Date',
  ];

  const rows = tasks.map((task) => {
    // Authoritative overdue determination
    const isOverdue = computeIsOverdue(task.dueDate, task.status);

    const empName =
      task.assignedEmployee?.fullName ||
      task.assignedEmployeeSnapshot?.fullName ||
      'Unassigned';
    const empId =
      task.assignedEmployee?.employeeId ||
      task.assignedEmployeeSnapshot?.employeeId ||
      'N/A';

    return [
      escapeCsvValue(task.taskId),
      escapeCsvValue(task.title),
      escapeCsvValue(empName),
      escapeCsvValue(empId),
      escapeCsvValue(task.department),
      escapeCsvValue(task.priority),
      escapeCsvValue(task.status),
      escapeCsvValue(formatDate(task.startDate)),
      escapeCsvValue(formatDate(task.dueDate)),
      escapeCsvValue(isOverdue ? 'Yes' : 'No'),
      escapeCsvValue(formatDate(task.completedDate)),
      escapeCsvValue(formatDate(task.createdDate)),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel and Google Sheets render Unicode/international text correctly
  const headerRow = headers.join(',');
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
};
