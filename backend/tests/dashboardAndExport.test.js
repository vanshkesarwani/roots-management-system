import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../app.js';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { Counter } from '../models/Counter.js';
import { escapeCsvValue } from '../services/csvExportService.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await Employee.init();
  await Task.init();
  await Counter.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Employee.deleteMany({});
  await Task.deleteMany({});
  await Counter.deleteMany({});
  await Counter.create({ id: 'taskId', seq: 0 });
});

describe('Dashboard & Task CSV Export API Suite', () => {
  describe('GET /api/dashboard - Metrics & Aggregations', () => {
    it('should calculate correct metrics on an empty dataset without crashing', async () => {
      const res = await request(app).get('/api/dashboard');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employees).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        onLeave: 0,
      });
      expect(res.body.data.tasks).toEqual({
        total: 0,
        todo: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
      });
      expect(res.body.data.employeeWorkload).toEqual([]);
    });

    it('should calculate live metrics grouped by employee status and task status', async () => {
      // Create employees with various statuses
      const emp1 = await Employee.create({
        employeeId: 'EMP-DASH-1',
        fullName: 'Dev Active 1',
        email: 'dev1@test.com',
        phone: '+91 90000 11111',
        department: 'Development',
        role: 'Engineer',
        joiningDate: new Date('2023-01-01'),
        status: 'Active',
      });

      const emp2 = await Employee.create({
        employeeId: 'EMP-DASH-2',
        fullName: 'Dev Active 2',
        email: 'dev2@test.com',
        phone: '+91 90000 22222',
        department: 'Design',
        role: 'Designer',
        joiningDate: new Date('2023-01-01'),
        status: 'Active',
      });

      await Employee.create({
        employeeId: 'EMP-DASH-3',
        fullName: 'QA Inactive',
        email: 'qa@test.com',
        phone: '+91 90000 33333',
        department: 'QA',
        role: 'QA Engineer',
        joiningDate: new Date('2023-01-01'),
        status: 'Inactive',
      });

      await Employee.create({
        employeeId: 'EMP-DASH-4',
        fullName: 'HR On Leave',
        email: 'hr@test.com',
        phone: '+91 90000 44444',
        department: 'HR',
        role: 'HR Manager',
        joiningDate: new Date('2023-01-01'),
        status: 'On Leave',
        leaveStartDate: new Date('2026-10-01'),
        leaveEndDate: new Date('2026-10-31'),
      });

      const pastDue = new Date(Date.now() - 86400000 * 5); // 5 days ago
      const futureDue = new Date(Date.now() + 86400000 * 5); // 5 days ahead

      // Create tasks
      // 1. Todo + Overdue (emp1)
      await Task.create({
        title: 'Overdue Todo Task',
        assignedEmployee: emp1._id,
        assignedEmployeeSnapshot: {
          employeeId: emp1.employeeId,
          fullName: emp1.fullName,
          email: emp1.email,
          department: emp1.department,
        },
        department: 'Development',
        priority: 'High',
        status: 'Todo',
        startDate: new Date(Date.now() - 86400000 * 10),
        dueDate: pastDue,
      });

      // 2. In Progress + Overdue (emp1)
      await Task.create({
        title: 'Overdue In Progress Task',
        assignedEmployee: emp1._id,
        assignedEmployeeSnapshot: {
          employeeId: emp1.employeeId,
          fullName: emp1.fullName,
          email: emp1.email,
          department: emp1.department,
        },
        department: 'Development',
        priority: 'Critical',
        status: 'In Progress',
        startDate: new Date(Date.now() - 86400000 * 10),
        dueDate: pastDue,
      });

      // 3. Todo + Not Overdue (emp2)
      await Task.create({
        title: 'Future Todo Task',
        assignedEmployee: emp2._id,
        assignedEmployeeSnapshot: {
          employeeId: emp2.employeeId,
          fullName: emp2.fullName,
          email: emp2.email,
          department: emp2.department,
        },
        department: 'Design',
        priority: 'Medium',
        status: 'Todo',
        startDate: new Date(),
        dueDate: futureDue,
      });

      // 4. Completed + Past Due (Should NOT be counted as overdue!)
      await Task.create({
        title: 'Completed Past Due Task',
        assignedEmployee: emp1._id,
        assignedEmployeeSnapshot: {
          employeeId: emp1.employeeId,
          fullName: emp1.fullName,
          email: emp1.email,
          department: emp1.department,
        },
        department: 'Development',
        priority: 'Low',
        status: 'Completed',
        startDate: new Date(Date.now() - 86400000 * 10),
        dueDate: pastDue,
        completedDate: new Date(),
      });

      // 5. Cancelled + Past Due (Should NOT be counted as overdue!)
      await Task.create({
        title: 'Cancelled Past Due Task',
        assignedEmployee: emp2._id,
        assignedEmployeeSnapshot: {
          employeeId: emp2.employeeId,
          fullName: emp2.fullName,
          email: emp2.email,
          department: emp2.department,
        },
        department: 'Design',
        priority: 'Low',
        status: 'Cancelled',
        startDate: new Date(Date.now() - 86400000 * 10),
        dueDate: pastDue,
      });

      const res = await request(app).get('/api/dashboard');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify employees counts
      expect(res.body.data.employees).toEqual({
        total: 4,
        active: 2,
        inactive: 1,
        onLeave: 1,
      });

      // Verify task counts
      expect(res.body.data.tasks).toEqual({
        total: 5,
        todo: 2,
        inProgress: 1,
        completed: 1,
        cancelled: 1,
        overdue: 2, // only tasks 1 and 2
      });

      // Verify workload ranking (sorted descending by activeTasks)
      expect(res.body.data.employeeWorkload.length).toBe(2);
      expect(res.body.data.employeeWorkload[0].employeeId).toBe('EMP-DASH-1');
      expect(res.body.data.employeeWorkload[0].activeTasks).toBe(2);
      expect(res.body.data.employeeWorkload[1].employeeId).toBe('EMP-DASH-2');
      expect(res.body.data.employeeWorkload[1].activeTasks).toBe(1);
    });
  });

  describe('GET /api/tasks/export/csv - Task CSV Export', () => {
    let testEmp;

    beforeEach(async () => {
      testEmp = await Employee.create({
        employeeId: 'EMP-CSV-1',
        fullName: 'Sunil Kumar',
        email: 'sunil@rootsmedia.com',
        phone: '+91 98888 77777',
        department: 'Development',
        role: 'Backend Lead',
        joiningDate: new Date('2023-01-01'),
        status: 'Active',
      });
    });

    it('should export all matching tasks across all pages and include UTF-8 BOM and correct headers', async () => {
      // Create 6 tasks
      for (let i = 1; i <= 6; i++) {
        await Task.create({
          title: `Pagination Task ${i}`,
          description: `Description for task ${i}`,
          assignedEmployee: testEmp._id,
          assignedEmployeeSnapshot: {
            employeeId: testEmp.employeeId,
            fullName: testEmp.fullName,
            email: testEmp.email,
            department: testEmp.department,
          },
          department: 'Development',
          priority: 'Medium',
          status: 'Todo',
          startDate: new Date('2026-10-01'),
          dueDate: new Date('2026-10-15'),
        });
      }

      // Request export with page=1&limit=2 (Export MUST return ALL 6, not just 2!)
      const res = await request(app).get('/api/tasks/export/csv?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="tasks-export-\d{4}-\d{2}-\d{2}\.csv"/);

      // Verify UTF-8 BOM
      expect(res.text.startsWith('\uFEFF')).toBe(true);

      const lines = res.text.replace('\uFEFF', '').split('\r\n').filter(Boolean);
      // 1 header row + 6 data rows = 7 lines
      expect(lines.length).toBe(7);

      // Verify header columns
      expect(lines[0]).toContain('Task ID');
      expect(lines[0]).toContain('Title');
      expect(lines[0]).toContain('Assigned Employee');
      expect(lines[0]).toContain('Employee ID');
      expect(lines[0]).toContain('Overdue');
    });

    it('should apply all supplied filters together in CSV export', async () => {
      // Matching task
      await Task.create({
        title: 'Backend Security Audit',
        assignedEmployee: testEmp._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmp.employeeId,
          fullName: testEmp.fullName,
          email: testEmp.email,
          department: testEmp.department,
        },
        department: 'Development',
        priority: 'Critical',
        status: 'Todo',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-10-15'),
      });

      // Non-matching department
      await Task.create({
        title: 'Design UI Mockups',
        assignedEmployee: testEmp._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmp.employeeId,
          fullName: testEmp.fullName,
          email: testEmp.email,
          department: testEmp.department,
        },
        department: 'Design',
        priority: 'Critical',
        status: 'Todo',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-10-15'),
      });

      // Filter by department=Development and priority=Critical
      const res = await request(app).get('/api/tasks/export/csv?department=Development&priority=Critical');

      expect(res.status).toBe(200);
      const lines = res.text.replace('\uFEFF', '').split('\r\n').filter(Boolean);
      // 1 header + 1 match = 2 lines
      expect(lines.length).toBe(2);
      expect(lines[1]).toContain('Backend Security Audit');
      expect(lines[1]).not.toContain('Design UI Mockups');
    });

    it('should correctly handle commas, quotes, newlines, and Unicode characters in CSV escaping', async () => {
      await Task.create({
        title: 'Task for राजेश शर्मा (Rajesh) with "quotes" and, commas',
        description: 'Multi-line description:\nLine 1\nLine 2',
        assignedEmployee: testEmp._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmp.employeeId,
          fullName: 'Rajesh',
          email: testEmp.email,
          department: testEmp.department,
        },
        department: 'Development',
        priority: 'High',
        status: 'Todo',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-10-20'),
      });

      const res = await request(app).get('/api/tasks/export/csv');

      expect(res.status).toBe(200);
      // Contains escaped quotes ""quotes""
      expect(res.text).toContain('""quotes""');
      // Contains Unicode text
      expect(res.text).toContain('राजेश शर्मा (Rajesh)');
    });

    it('should mitigate spreadsheet formula injection (CSV Injection / CWE-1236)', () => {
      // Test formula triggers: =, +, -, @, \t
      expect(escapeCsvValue('=cmd|"/C calc"!A0')).toBe(`"'=cmd|""/C calc""!A0"`);
      expect(escapeCsvValue('+SUM(1+1)')).toBe(`"'+SUM(1+1)"`);
      expect(escapeCsvValue('-10+20')).toBe(`"'-10+20"`);
      expect(escapeCsvValue('@hyperlink("http://malicious.site")')).toBe(`"'@hyperlink(""http://malicious.site"")"`);
      expect(escapeCsvValue('\tTabInjection')).toBe(`"'\tTabInjection"`);
      expect(escapeCsvValue('Safe Normal String')).toBe(`"Safe Normal String"`);
    });

    it('should accurately reflect overdue consistency with dashboard and task API rules', async () => {
      const pastDueDate = new Date('2026-01-01');

      // 1. Todo + past due -> Overdue = Yes
      await Task.create({
        title: 'Past Due Active',
        assignedEmployee: testEmp._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmp.employeeId,
          fullName: testEmp.fullName,
          email: testEmp.email,
          department: testEmp.department,
        },
        department: 'Development',
        priority: 'Medium',
        status: 'Todo',
        startDate: new Date('2025-12-01'),
        dueDate: pastDueDate,
      });

      // 2. Completed + past due -> Overdue = No
      await Task.create({
        title: 'Past Due Completed',
        assignedEmployee: testEmp._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmp.employeeId,
          fullName: testEmp.fullName,
          email: testEmp.email,
          department: testEmp.department,
        },
        department: 'Development',
        priority: 'Medium',
        status: 'Completed',
        startDate: new Date('2025-12-01'),
        dueDate: pastDueDate,
        completedDate: new Date('2025-12-20'),
      });

      const res = await request(app).get('/api/tasks/export/csv');

      expect(res.status).toBe(200);
      const lines = res.text.replace('\uFEFF', '').split('\r\n').filter(Boolean);

      const activeLine = lines.find((l) => l.includes('Past Due Active'));
      const completedLine = lines.find((l) => l.includes('Past Due Completed'));

      expect(activeLine).toContain('"Yes"');
      expect(completedLine).toContain('"No"');
    });
  });
});
