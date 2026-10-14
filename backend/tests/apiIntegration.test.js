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

describe('API Integration & Server-Side Features Suite', () => {
  it('should return 409 Conflict when attempting to register duplicate employee ID or email', async () => {
    await request(app)
      .post('/api/employees')
      .send({
        employeeId: 'EMP-DUP-1',
        fullName: 'Original User',
        email: 'duplicate@test.com',
        phone: '+91 99999 11111',
        department: 'Development',
        role: 'Engineer',
        joiningDate: '2023-01-01',
        status: 'Active',
      });

    // Attempt with duplicate ID
    const dupIdRes = await request(app)
      .post('/api/employees')
      .send({
        employeeId: 'EMP-DUP-1',
        fullName: 'Another User',
        email: 'another@test.com',
        phone: '+91 99999 22222',
        department: 'Design',
        role: 'Designer',
        joiningDate: '2023-01-01',
        status: 'Active',
      });
    expect(dupIdRes.status).toBe(409);
    expect(dupIdRes.body.message).toMatch(/already registered/i);

    // Attempt with duplicate Email
    const dupEmailRes = await request(app)
      .post('/api/employees')
      .send({
        employeeId: 'EMP-DUP-2',
        fullName: 'Yet Another User',
        email: 'duplicate@test.com',
        phone: '+91 99999 33333',
        department: 'QA',
        role: 'Tester',
        joiningDate: '2023-01-01',
        status: 'Active',
      });
    expect(dupEmailRes.status).toBe(409);
    expect(dupEmailRes.body.message).toMatch(/already registered/i);
  });

  it('should perform server-side pagination, search, and department filtering on tasks', async () => {
    const emp = await Employee.create({
      employeeId: 'EMP-SRV-1',
      fullName: 'Rahul Sharma',
      email: 'rahul@test.com',
      phone: '+91 98765 43210',
      department: 'Development',
      role: 'Lead',
      joiningDate: new Date(),
      status: 'Active',
    });

    // Create 15 tasks
    for (let i = 1; i <= 15; i++) {
      await Task.create({
        taskId: `TSK-${String(i).padStart(3, '0')}`,
        title: i % 2 === 0 ? `API Gateway Task ${i}` : `Frontend UI Task ${i}`,
        assignedEmployee: emp._id,
        assignedEmployeeSnapshot: {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
        },
        department: i % 3 === 0 ? 'Design' : 'Development',
        priority: i % 4 === 0 ? 'Critical' : 'Medium',
        status: 'Todo',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-10-20'),
      });
    }

    // Test pagination (page 1, limit 5)
    const page1Res = await request(app).get('/api/tasks?page=1&limit=5');
    expect(page1Res.status).toBe(200);
    expect(page1Res.body.data.length).toBe(5);
    expect(page1Res.body.pagination.total).toBe(15);
    expect(page1Res.body.pagination.pages).toBe(3);

    // Test server search
    const searchRes = await request(app).get('/api/tasks?search=Gateway');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.every((t) => t.title.includes('API Gateway'))).toBe(true);

    // Test department filter
    const deptRes = await request(app).get('/api/tasks?department=Design');
    expect(deptRes.status).toBe(200);
    expect(deptRes.body.data.every((t) => t.department === 'Design')).toBe(true);
  });

  it('should calculate server-side Dashboard metrics and employee workload accurately', async () => {
    const emp1 = await Employee.create({
      employeeId: 'EMP-DASH-1',
      fullName: 'Rahul Sharma',
      email: 'dash1@test.com',
      phone: '111',
      department: 'Development',
      role: 'Dev',
      joiningDate: new Date(),
      status: 'Active',
    });
    const emp2 = await Employee.create({
      employeeId: 'EMP-DASH-2',
      fullName: 'Priya Patil',
      email: 'dash2@test.com',
      phone: '222',
      department: 'Design',
      role: 'Designer',
      joiningDate: new Date(),
      status: 'Active',
    });

    // emp1 gets 2 active tasks, emp2 gets 1 active task
    await Task.create({
      taskId: 'TSK-D-1',
      title: 'T1',
      assignedEmployee: emp1._id,
      assignedEmployeeSnapshot: { employeeId: emp1.employeeId, fullName: emp1.fullName, email: emp1.email, department: emp1.department },
      department: 'Development',
      priority: 'High',
      status: 'In Progress',
      startDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    });
    await Task.create({
      taskId: 'TSK-D-2',
      title: 'T2',
      assignedEmployee: emp1._id,
      assignedEmployeeSnapshot: { employeeId: emp1.employeeId, fullName: emp1.fullName, email: emp1.email, department: emp1.department },
      department: 'Development',
      priority: 'Medium',
      status: 'Todo',
      startDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    });
    await Task.create({
      taskId: 'TSK-D-3',
      title: 'T3',
      assignedEmployee: emp2._id,
      assignedEmployeeSnapshot: { employeeId: emp2.employeeId, fullName: emp2.fullName, email: emp2.email, department: emp2.department },
      department: 'Design',
      priority: 'Low',
      status: 'In Progress',
      startDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    });

    const dashRes = await request(app).get('/api/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.employees.total).toBe(2);
    expect(dashRes.body.data.tasks.total).toBe(3);
    expect(dashRes.body.data.tasks.inProgress).toBe(2);
    expect(dashRes.body.data.tasks.todo).toBe(1);

    // Verify workload sorted descending
    const workload = dashRes.body.data.employeeWorkload;
    expect(workload.length).toBe(2);
    expect(workload[0].employee).toBe('Rahul Sharma');
    expect(workload[0].activeTasks).toBe(2);
    expect(workload[1].employee).toBe('Priya Patil');
    expect(workload[1].activeTasks).toBe(1);
  });

  it('should stream CSV export with matching records and proper headers', async () => {
    const emp = await Employee.create({
      employeeId: 'EMP-CSV-1',
      fullName: 'Rahul Sharma',
      email: 'csv@test.com',
      phone: '123',
      department: 'Development',
      role: 'Developer',
      joiningDate: new Date(),
      status: 'Active',
    });

    await Task.create({
      taskId: 'TSK-CSV-001',
      title: 'CSV Test Task',
      assignedEmployee: emp._id,
      assignedEmployeeSnapshot: { employeeId: emp.employeeId, fullName: emp.fullName, email: emp.email, department: emp.department },
      department: 'Development',
      priority: 'Critical',
      status: 'In Progress',
      startDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-15'),
    });

    const csvRes = await request(app).get('/api/tasks/export/csv?department=Development');
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toContain('Task ID,Title,Assigned Employee');
    expect(csvRes.text).toContain('TSK-CSV-001');
    expect(csvRes.text).toContain('CSV Test Task');
    expect(csvRes.text).toContain('Rahul Sharma');
  });
});
