import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../app.js';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { Counter } from '../models/Counter.js';

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

describe('URL-Synchronized Filter & Listing Controls Test Suite', () => {
  let empDev, empDesign;

  beforeEach(async () => {
    empDev = await Employee.create({
      employeeId: 'EMP-DEV-01',
      fullName: 'Rahul Sharma',
      email: 'rahul@rootsmedia.com',
      phone: '+91 91111 22222',
      department: 'Development',
      role: 'Senior Developer',
      joiningDate: new Date('2023-01-01'),
      status: 'Active',
    });

    empDesign = await Employee.create({
      employeeId: 'EMP-DES-02',
      fullName: 'Priya Patil',
      email: 'priya@rootsmedia.com',
      phone: '+91 93333 44444',
      department: 'Design',
      role: 'UI Designer',
      joiningDate: new Date('2023-02-01'),
      status: 'Active',
    });

    // Create 10 varied tasks for pagination and filtering tests
    const taskConfigs = [
      { title: 'API Gateway Setup', emp: empDev, dept: 'Development', priority: 'High', status: 'In Progress', due: '2026-10-25' },
      { title: 'Database Indexing', emp: empDev, dept: 'Development', priority: 'High', status: 'In Progress', due: '2026-10-26' },
      { title: 'Auth Token Middleware', emp: empDev, dept: 'Development', priority: 'High', status: 'In Progress', due: '2026-10-27' },
      { title: 'Kafka Event Consumer', emp: empDev, dept: 'Development', priority: 'Critical', status: 'Todo', due: '2026-10-28' },
      { title: 'Design System Tokens', emp: empDesign, dept: 'Design', priority: 'High', status: 'In Progress', due: '2026-10-25' },
      { title: 'Component Figma Library', emp: empDesign, dept: 'Design', priority: 'Medium', status: 'Todo', due: '2026-10-29' },
      { title: 'Brand Guidelines Polish', emp: empDesign, dept: 'Design', priority: 'Low', status: 'Completed', due: '2026-10-10' },
      { title: 'Legacy Cleanup Task', emp: empDev, dept: 'Development', priority: 'Low', status: 'Cancelled', due: '2026-10-05' },
      { title: 'QA Test Automation', emp: empDev, dept: 'Development', priority: 'High', status: 'In Progress', due: '2026-10-30' },
      { title: 'CI/CD Pipeline Fix', emp: empDev, dept: 'Development', priority: 'Critical', status: 'Todo', due: '2026-10-31' },
    ];

    for (const cfg of taskConfigs) {
      await Task.create({
        title: cfg.title,
        assignedEmployee: cfg.emp._id,
        assignedEmployeeSnapshot: {
          employeeId: cfg.emp.employeeId,
          fullName: cfg.emp.fullName,
          email: cfg.emp.email,
          department: cfg.emp.department,
        },
        department: cfg.dept,
        priority: cfg.priority,
        status: cfg.status,
        startDate: new Date('2026-10-01'),
        dueDate: new Date(cfg.due),
      });
    }
  });

  describe('1. Direct URL Navigation & Combined Filter Matching', () => {
    it('should support combined URLs like /tasks?status=In%20Progress&priority=High&page=2', async () => {
      // There are 5 tasks matching status=In Progress and priority=High:
      // 1. API Gateway Setup, 2. Database Indexing, 3. Auth Token Middleware, 4. Design System Tokens, 5. QA Test Automation
      const res = await request(app).get('/api/tasks?status=In%20Progress&priority=High&page=2&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.pages).toBe(3);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.data.length).toBe(2);

      // Verify all returned records strictly match the combined filters
      for (const task of res.body.data) {
        expect(task.status).toBe('In Progress');
        expect(task.priority).toBe('High');
      }
    });

    it('should combine search, department, and priority filters simultaneously', async () => {
      const res = await request(app).get(
        '/api/tasks?search=Gateway&department=Development&priority=High'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('API Gateway Setup');
      expect(res.body.data[0].department).toBe('Development');
      expect(res.body.data[0].priority).toBe('High');
    });

    it('should filter by due date range (dueFrom and dueTo)', async () => {
      const res = await request(app).get(
        '/api/tasks?dueFrom=2026-10-26&dueTo=2026-10-28'
      );

      expect(res.status).toBe(200);
      // Expected: Database Indexing (Oct 26), Auth Token Middleware (Oct 27), Kafka Event Consumer (Oct 28)
      expect(res.body.data.length).toBe(3);
      for (const t of res.body.data) {
        const dueTime = new Date(t.dueDate).getTime();
        expect(dueTime).toBeGreaterThanOrEqual(new Date('2026-10-26T00:00:00.000Z').getTime());
        expect(dueTime).toBeLessThanOrEqual(new Date('2026-10-28T23:59:59.999Z').getTime());
      }
    });
  });

  describe('2. Safe Handling of Invalid, Malformed, and Default Parameters', () => {
    it('should safely normalize negative, non-numeric, or missing page numbers to page 1', async () => {
      const resNeg = await request(app).get('/api/tasks?page=-5');
      expect(resNeg.status).toBe(200);
      expect(resNeg.body.pagination.page).toBe(1);

      const resAlpha = await request(app).get('/api/tasks?page=invalidPage');
      expect(resAlpha.status).toBe(200);
      expect(resAlpha.body.pagination.page).toBe(1);

      const resZero = await request(app).get('/api/tasks?page=0');
      expect(resZero.status).toBe(200);
      expect(resZero.body.pagination.page).toBe(1);
    });

    it('should ignore invalid date strings without crashing or corrupting queries', async () => {
      const res = await request(app).get('/api/tasks?dueFrom=not-a-valid-date&dueTo=garbage');
      expect(res.status).toBe(200);
      // Should not throw and should return total tasks
      expect(res.body.pagination.total).toBe(10);
    });

    it('should safely ignore unauthorized/unknown sort fields and fallback to default', async () => {
      const res = await request(app).get('/api/tasks?sortBy=__proto__&sortOrder=asc');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should safely ignore non-whitelisted department or status filters', async () => {
      const res = await request(app).get('/api/tasks?department=HackingDept&status=FakeStatus');
      expect(res.status).toBe(200);
      // Invalid filters ignored, returning all 10 tasks
      expect(res.body.pagination.total).toBe(10);
    });
  });

  describe('3. Employee List URL Parameters & Sorting', () => {
    it('should support employee sorting and search via query parameters', async () => {
      const res = await request(app).get('/api/employees?search=Rahul&sortBy=fullName&sortOrder=asc');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].fullName).toBe('Rahul Sharma');
    });

    it('should filter employees by department and status safely', async () => {
      const res = await request(app).get('/api/employees?department=Design&status=Active');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].fullName).toBe('Priya Patil');
    });
  });

  describe('4. CSV Export from Filtered Views Across All Pages', () => {
    it('should export all matching tasks across all pages preserving active filters', async () => {
      // Export with status=In Progress and priority=High, with page=1&limit=2 in query
      // The export MUST NOT be limited to limit=2; it must export ALL 5 matching tasks!
      const res = await request(app).get(
        '/api/tasks/export/csv?status=In%20Progress&priority=High&page=1&limit=2'
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      const lines = res.text.replace('\uFEFF', '').split('\r\n').filter(Boolean);
      // 1 header + 5 matching data rows = 6 lines
      expect(lines.length).toBe(6);

      // Verify that non-matching tasks (e.g. Critical, Low, Completed, Cancelled) are NOT present
      expect(res.text).not.toContain('Brand Guidelines Polish');
      expect(res.text).not.toContain('Legacy Cleanup Task');
      expect(res.text).not.toContain('Kafka Event Consumer');
    });
  });
});
