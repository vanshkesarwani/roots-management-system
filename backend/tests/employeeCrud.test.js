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

describe('Employee CRUD API Endpoints Suite', () => {
  const baseEmployeeData = {
    employeeId: 'EMP-001',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@rootsmedia.com',
    phone: '+91 98765 43210',
    department: 'Development',
    role: 'Senior Full Stack Engineer',
    joiningDate: '2023-01-15',
    status: 'Active',
    skills: ['React', 'Node.js', 'MongoDB'],
  };

  describe('POST /api/employees - Create Employee', () => {
    it('should create an employee successfully with 201 status and correct response schema', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send(baseEmployeeData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Employee created successfully');
      expect(res.body.data.employeeId).toBe('EMP-001');
      expect(res.body.data.email).toBe('rahul.sharma@rootsmedia.com');
      expect(res.body.data.activeTaskCount).toBe(0);
    });

    it('should normalize email to lowercase and trim whitespace before saving', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          employeeId: 'EMP-002',
          email: '   RAHUL.UPPER@RootsMedia.COM   ',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('rahul.upper@rootsmedia.com');
    });

    it('should return 409 Conflict if employeeId already exists', async () => {
      await Employee.create(baseEmployeeData);

      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          email: 'unique.email@rootsmedia.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should return 409 Conflict if email already exists (case-insensitively)', async () => {
      await Employee.create(baseEmployeeData);

      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          employeeId: 'EMP-999',
          email: 'RAHUL.SHARMA@ROOTSMEDIA.COM', // Same email, uppercase
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should return 400 Bad Request for missing required fields', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should return 400 Bad Request for invalid department outside allowed enum', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          department: 'CyberSecurity', // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('is not a valid department');
    });

    it('should return 400 Bad Request for invalid status outside allowed enum', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          status: 'Probation', // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('is not a valid status');
    });

    it('should return 400 Bad Request for invalid phone number format', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          phone: 'abc-xyz', // Invalid phone
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please provide a valid phone number');
    });

    it('should return 400 Bad Request if status is On Leave but leave dates are missing', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          status: 'On Leave',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Leave Start Date is required');
    });

    it('should return 400 Bad Request if leaveEndDate is earlier than leaveStartDate', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          status: 'On Leave',
          leaveStartDate: '2026-11-10',
          leaveEndDate: '2026-11-01', // earlier
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Leave End Date cannot be earlier than Leave Start Date');
    });

    it('should create employee with On Leave status when valid leave dates are provided', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          ...baseEmployeeData,
          status: 'On Leave',
          leaveStartDate: '2026-11-01',
          leaveEndDate: '2026-11-10',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('On Leave');
      expect(new Date(res.body.data.leaveStartDate)).toEqual(new Date('2026-11-01'));
    });
  });

  describe('GET /api/employees - List Employees with Filters & Pagination', () => {
    beforeEach(async () => {
      await Employee.create([
        { ...baseEmployeeData, employeeId: 'EMP-001', fullName: 'Alice Development', email: 'alice@test.com', department: 'Development', status: 'Active' },
        { ...baseEmployeeData, employeeId: 'EMP-002', fullName: 'Bob Design', email: 'bob@test.com', department: 'Design', status: 'Active' },
        { ...baseEmployeeData, employeeId: 'EMP-003', fullName: 'Charlie QA', email: 'charlie@test.com', department: 'QA', status: 'Inactive' },
        {
          ...baseEmployeeData,
          employeeId: 'EMP-004',
          fullName: 'Diana HR',
          email: 'diana@test.com',
          department: 'HR',
          status: 'On Leave',
          leaveStartDate: new Date('2026-10-01'),
          leaveEndDate: new Date('2026-10-15'),
        },
      ]);
    });

    it('should return all employees with consistent pagination metadata', async () => {
      const res = await request(app).get('/api/employees');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4);
      expect(res.body.pagination).toEqual({
        total: 4,
        page: 1,
        pages: 1,
        limit: 10,
      });
    });

    it('should paginate correctly using page and limit query params', async () => {
      const res = await request(app).get('/api/employees?page=2&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(4);
      expect(res.body.pagination.pages).toBe(2);
    });

    it('should filter employees by department', async () => {
      const res = await request(app).get('/api/employees?department=Development');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].department).toBe('Development');
    });

    it('should filter employees by status', async () => {
      const res = await request(app).get('/api/employees?status=On Leave');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('On Leave');
    });

    it('should search across fullName, email, role, and employeeId', async () => {
      const res = await request(app).get('/api/employees?search=bob');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].fullName).toBe('Bob Design');
    });

    it('should sort employees ascending and descending', async () => {
      const res = await request(app).get('/api/employees?sortBy=fullName&sortOrder=asc');

      expect(res.status).toBe(200);
      expect(res.body.data[0].fullName).toBe('Alice Development');
      expect(res.body.data[3].fullName).toBe('Diana HR');
    });
  });

  describe('GET /api/employees/:id - Retrieve Employee', () => {
    let createdEmp;

    beforeEach(async () => {
      createdEmp = await Employee.create(baseEmployeeData);
    });

    it('should retrieve employee by MongoDB _id including active and past tasks', async () => {
      const res = await request(app).get(`/api/employees/${createdEmp._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe('EMP-001');
      expect(res.body.data.activeTasks).toBeDefined();
      expect(res.body.data.pastTasks).toBeDefined();
    });

    it('should retrieve employee by business employeeId (e.g. EMP-001)', async () => {
      const res = await request(app).get('/api/employees/EMP-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Rahul Sharma');
    });

    it('should return 404 Not Found for nonexistent ID', async () => {
      const nonExistentObjectId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/employees/${nonExistentObjectId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('PUT /api/employees/:id - Update Employee', () => {
    let createdEmp;

    beforeEach(async () => {
      createdEmp = await Employee.create(baseEmployeeData);
    });

    it('should update employee details successfully', async () => {
      const res = await request(app)
        .put(`/api/employees/${createdEmp._id}`)
        .send({
          fullName: 'Rahul S. Sharma',
          role: 'Staff Engineer',
          skills: ['React', 'Node.js', 'Go', 'System Design'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Rahul S. Sharma');
      expect(res.body.data.role).toBe('Staff Engineer');
      expect(res.body.data.skills).toContain('Go');
    });

    it('should reject modification of employeeId with 400 Bad Request', async () => {
      const res = await request(app)
        .put(`/api/employees/${createdEmp._id}`)
        .send({
          employeeId: 'EMP-MODIFIED-ID',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Employee ID cannot be modified');
    });

    it('should reject email collision with another employee with 409 Conflict', async () => {
      await Employee.create({
        ...baseEmployeeData,
        employeeId: 'EMP-002',
        email: 'other.employee@rootsmedia.com',
      });

      const res = await request(app)
        .put(`/api/employees/${createdEmp._id}`)
        .send({
          email: 'other.employee@rootsmedia.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already taken');
    });

    it('should return 404 Not Found when updating nonexistent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/employees/${fakeId}`)
        .send({ fullName: 'Nobody' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/employees/:id - Deletion & Restrictions', () => {
    let emp;

    beforeEach(async () => {
      emp = await Employee.create(baseEmployeeData);
    });

    it('should block deletion with 400 Bad Request if employee has a Todo task', async () => {
      await Task.create({
        title: 'Pending Todo Task',
        assignedEmployee: emp._id,
        assignedEmployeeSnapshot: {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
        },
        department: 'Development',
        priority: 'High',
        status: 'Todo',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 86400000 * 5),
      });

      const res = await request(app).delete(`/api/employees/${emp._id}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot delete employee');
      expect(res.body.message).toContain('active task(s)');

      // Verify employee still exists
      const check = await Employee.findById(emp._id);
      expect(check).not.toBeNull();
    });

    it('should block deletion with 400 Bad Request if employee has an In Progress task', async () => {
      await Task.create({
        title: 'Active In Progress Task',
        assignedEmployee: emp._id,
        assignedEmployeeSnapshot: {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
        },
        department: 'Development',
        priority: 'Critical',
        status: 'In Progress',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 86400000 * 3),
      });

      const res = await request(app).delete(`/api/employees/${emp._id}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('active task(s)');
    });

    it('should permit deletion when employee has only Completed tasks and preserve employee snapshot on historical tasks', async () => {
      const completedTask = await Task.create({
        title: 'Archived Feature Task',
        assignedEmployee: emp._id,
        assignedEmployeeSnapshot: {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
        },
        department: 'Development',
        priority: 'Medium',
        status: 'Completed',
        startDate: new Date('2026-09-01'),
        dueDate: new Date('2026-09-10'),
        completedDate: new Date('2026-09-09'),
      });

      const res = await request(app).delete(`/api/employees/${emp._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Employee deleted successfully');

      // Verify employee was removed from DB
      const check = await Employee.findById(emp._id);
      expect(check).toBeNull();

      // Verify historical task retains snapshot
      const taskInDb = await Task.findById(completedTask._id);
      expect(taskInDb).not.toBeNull();
      expect(taskInDb.assignedEmployeeSnapshot.employeeId).toBe('EMP-001');
      expect(taskInDb.assignedEmployeeSnapshot.fullName).toBe('Rahul Sharma');
      expect(taskInDb.assignedEmployeeSnapshot.email).toBe('rahul.sharma@rootsmedia.com');
    });

    it('should return 404 Not Found when attempting to delete nonexistent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/employees/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
