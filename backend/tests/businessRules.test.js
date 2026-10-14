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

describe('Business Rules Validation Suite', () => {
  // Setup helper for active employee
  const createActiveEmployee = async (overrides = {}) => {
    return await Employee.create({
      employeeId: overrides.employeeId || 'EMP-TEST-01',
      fullName: overrides.fullName || 'Test Active Employee',
      email: overrides.email || 'active@test.com',
      phone: '+91 99999 88888',
      department: 'Development',
      role: 'Software Engineer',
      joiningDate: new Date('2023-01-01'),
      status: 'Active',
      skills: ['Node.js'],
      ...overrides,
    });
  };

  describe('BR1: Task Assignment Rules', () => {
    it('should successfully assign task to an Active employee', async () => {
      const emp = await createActiveEmployee();
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Deploy to staging',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'High',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Todo');
    });

    it('should reject task assignment to an Inactive employee with 400', async () => {
      const inactiveEmp = await createActiveEmployee({
        employeeId: 'EMP-INACTIVE',
        email: 'inactive@test.com',
        status: 'Inactive',
      });

      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Update documentation',
          assignedEmployee: inactiveEmp._id,
          department: 'Development',
          priority: 'Low',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Inactive/i);
    });

    it('should reject task assignment to an On Leave employee when task startDate falls within leave window', async () => {
      const onLeaveEmp = await createActiveEmployee({
        employeeId: 'EMP-ONLEAVE',
        email: 'onleave@test.com',
        status: 'On Leave',
        leaveStartDate: new Date('2026-10-10'),
        leaveEndDate: new Date('2026-10-25'),
      });

      // Task startDate 2026-10-15 is INSIDE [2026-10-10, 2026-10-25]
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Fix auth bug',
          assignedEmployee: onLeaveEmp._id,
          department: 'Development',
          priority: 'Medium',
          startDate: '2026-10-15',
          dueDate: '2026-10-30',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/On Leave/i);
    });

    it('should allow task assignment to an On Leave employee when task startDate is strictly outside leave window', async () => {
      const onLeaveEmp = await createActiveEmployee({
        employeeId: 'EMP-ONLEAVE-OUTSIDE',
        email: 'onleaveoutside@test.com',
        status: 'On Leave',
        leaveStartDate: new Date('2026-10-10'),
        leaveEndDate: new Date('2026-10-20'),
      });

      // Task startDate 2026-10-25 is strictly AFTER leaveEndDate
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Post-leave sprint planning',
          assignedEmployee: onLeaveEmp._id,
          department: 'Development',
          priority: 'Medium',
          startDate: '2026-10-25',
          dueDate: '2026-10-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('BR2: Date Ordering Rules', () => {
    it('should reject task when dueDate is earlier than startDate with 400', async () => {
      const emp = await createActiveEmployee();
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Invalid date task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Low',
          startDate: '2026-10-20',
          dueDate: '2026-10-15', // Earlier than startDate
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/earlier than Start Date/i);
    });
  });

  describe('BR3 & BR4: Status Transitions and Completed Date', () => {
    it('should follow strict valid status transitions: Todo -> In Progress -> Completed', async () => {
      const emp = await createActiveEmployee();
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Flow test task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'High',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = taskRes.body.data._id;
      expect(taskRes.body.data.status).toBe('Todo');

      // 1. Todo -> In Progress (Valid)
      const inProgRes = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({ status: 'In Progress' });
      expect(inProgRes.status).toBe(200);
      expect(inProgRes.body.data.status).toBe('In Progress');
      expect(inProgRes.body.data.completedDate).toBeNull();

      // 2. In Progress -> Completed (Valid & auto sets completedDate)
      const completedRes = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({ status: 'Completed' });
      expect(completedRes.status).toBe(200);
      expect(completedRes.body.data.status).toBe('Completed');
      expect(completedRes.body.data.completedDate).not.toBeNull();
      expect(new Date(completedRes.body.data.completedDate).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should allow valid transition from Todo or In Progress directly to Cancelled', async () => {
      const emp = await createActiveEmployee();
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Cancel test task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Low',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = taskRes.body.data._id;

      // Todo -> Cancelled
      const cancelRes = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({ status: 'Cancelled' });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('Cancelled');
    });

    it('should reject invalid status transitions with 400', async () => {
      const emp = await createActiveEmployee();
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Invalid transition task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Medium',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = taskRes.body.data._id;

      // Todo -> Completed directly is INVALID
      const invalidRes1 = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({ status: 'Completed' });
      expect(invalidRes1.status).toBe(400);
      expect(invalidRes1.body.message).toMatch(/Invalid status transition/i);

      // Cancelled -> In Progress is INVALID
      await request(app).put(`/api/tasks/${taskId}/status`).send({ status: 'Cancelled' });
      const invalidRes2 = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({ status: 'In Progress' });
      expect(invalidRes2.status).toBe(400);
      expect(invalidRes2.body.message).toMatch(/immutable/i);
    });

    it('should forbid changing status via standard PUT /api/tasks/:id', async () => {
      const emp = await createActiveEmployee();
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Status bypass attempt',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'High',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = taskRes.body.data._id;

      const editRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          title: 'Status bypass attempt',
          status: 'In Progress', // Trying to change status via edit
        });

      expect(editRes.status).toBe(400);
      expect(editRes.body.message).toMatch(/Use PUT \/api\/tasks\/:id\/status instead/i);
    });

    it('should forbid editing a Completed or Cancelled task via standard PUT /api/tasks/:id', async () => {
      const emp = await createActiveEmployee();
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Immutable task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'High',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = taskRes.body.data._id;

      // Advance to Completed
      await request(app).put(`/api/tasks/${taskId}/status`).send({ status: 'In Progress' });
      await request(app).put(`/api/tasks/${taskId}/status`).send({ status: 'Completed' });

      // Try editing completed task
      const editRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'New modified title' });

      expect(editRes.status).toBe(400);
      expect(editRes.body.message).toMatch(/Completed and Cancelled tasks are immutable/i);
    });

    it('should reject client-supplied initial status other than Todo with 400', async () => {
      const emp = await createActiveEmployee();
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Invalid initial status task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'High',
          status: 'In Progress', // Illegal initial status
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/must always start with 'Todo' status/i);
    });

    it('should reject client-supplied completedDate on task creation and update with 400', async () => {
      const emp = await createActiveEmployee();

      // On Creation
      const createRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Client completedDate attempt',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Medium',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
          completedDate: '2026-10-18', // Illegal
        });

      expect(createRes.status).toBe(400);
      expect(createRes.body.message).toMatch(/Completed Date is determined automatically by the server/i);

      // On Update
      const validTaskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Valid task for update test',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Medium',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = validTaskRes.body.data._id;
      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          completedDate: '2026-10-19', // Illegal
        });

      expect(updateRes.status).toBe(400);
      expect(updateRes.body.message).toMatch(/Completed Date is determined automatically by the server/i);
    });
  });

  describe('BR5: Capacity Limit (Max 3 Active Tasks) & Concurrency', () => {
    it('should reject assigning a 4th active task to an employee', async () => {
      const emp = await createActiveEmployee();

      // Create 3 active tasks
      for (let i = 1; i <= 3; i++) {
        const res = await request(app)
          .post('/api/tasks')
          .send({
            title: `Active Task ${i}`,
            assignedEmployee: emp._id,
            department: 'Development',
            priority: 'Medium',
            startDate: '2026-10-15',
            dueDate: '2026-10-20',
          });
        expect(res.status).toBe(201);
      }

      // Attempt 4th task
      const fourthRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Forbidden 4th Task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'High',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      expect(fourthRes.status).toBe(400);
      expect(fourthRes.body.message).toMatch(/Employee already has 3 active tasks/i);
    });

    it('should safely handle concurrent requests attempting to assign a 4th active task', async () => {
      const emp = await createActiveEmployee();

      // Initially assign 2 active tasks
      for (let i = 1; i <= 2; i++) {
        await request(app)
          .post('/api/tasks')
          .send({
            title: `Existing Task ${i}`,
            assignedEmployee: emp._id,
            department: 'Development',
            priority: 'Medium',
            startDate: '2026-10-15',
            dueDate: '2026-10-20',
          });
      }

      // Now send 5 concurrent requests simultaneously for the 3rd slot
      const concurrentRequests = Array.from({ length: 5 }).map((_, idx) =>
        request(app)
          .post('/api/tasks')
          .send({
            title: `Concurrent Attempt ${idx + 1}`,
            assignedEmployee: emp._id,
            department: 'Development',
            priority: 'High',
            startDate: '2026-10-15',
            dueDate: '2026-10-20',
          })
      );

      const responses = await Promise.all(concurrentRequests);
      const successful = responses.filter((r) => r.status === 201);
      const rejected = responses.filter((r) => r.status === 400);

      // Exactly 1 can be accepted (filling the 3rd slot), the other 4 must be rejected!
      expect(successful.length).toBe(1);
      expect(rejected.length).toBe(4);

      // Verify total active tasks in DB is strictly 3
      const finalCount = await Task.countDocuments({
        assignedEmployee: emp._id,
        status: { $in: ['Todo', 'In Progress'] },
      });
      expect(finalCount).toBe(3);
    });

    it('should protect capacity during concurrent reassignments to an employee with 1 remaining slot', async () => {
      const sourceEmp = await createActiveEmployee({ employeeId: 'EMP-SRC-1', email: 'src@test.com' });
      const targetEmp = await createActiveEmployee({ employeeId: 'EMP-TGT-1', email: 'tgt@test.com' });

      // Target already has 2 active tasks
      for (let i = 1; i <= 2; i++) {
        await request(app).post('/api/tasks').send({
          title: `Target Task ${i}`,
          assignedEmployee: targetEmp._id,
          department: 'Development',
          priority: 'Low',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });
      }

      // Source has 3 active tasks
      const sourceTaskIds = [];
      for (let i = 1; i <= 3; i++) {
        const res = await request(app).post('/api/tasks').send({
          title: `Source Task ${i}`,
          assignedEmployee: sourceEmp._id,
          department: 'Development',
          priority: 'Low',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });
        sourceTaskIds.push(res.body.data._id);
      }

      // Concurrently attempt to reassign 3 source tasks to targetEmp simultaneously
      const reassignRequests = sourceTaskIds.map((taskId) =>
        request(app)
          .put(`/api/tasks/${taskId}`)
          .send({ assignedEmployee: targetEmp._id })
      );

      const reassignResponses = await Promise.all(reassignRequests);
      const successfulReassigns = reassignResponses.filter((r) => r.status === 200);
      const rejectedReassigns = reassignResponses.filter((r) => r.status === 400);

      // Exactly 1 reassignment succeeds (filling targetEmp's 3rd slot), other 2 are rejected
      expect(successfulReassigns.length).toBe(1);
      expect(rejectedReassigns.length).toBe(2);

      const targetFinalCount = await Task.countDocuments({
        assignedEmployee: targetEmp._id,
        status: { $in: ['Todo', 'In Progress'] },
      });
      expect(targetFinalCount).toBe(3);
    });

    it('should correctly release employee capacity when an active task is deleted', async () => {
      const emp = await createActiveEmployee();

      const taskRes = await request(app).post('/api/tasks').send({
        title: 'Task to be deleted',
        assignedEmployee: emp._id,
        department: 'Development',
        priority: 'Low',
        startDate: '2026-10-15',
        dueDate: '2026-10-20',
      });
      const taskId = taskRes.body.data._id;

      let empDoc = await Employee.findById(emp._id);
      expect(empDoc.activeTaskCount).toBe(1);

      // Delete the active task
      const delRes = await request(app).delete(`/api/tasks/${taskId}`);
      expect(delRes.status).toBe(200);

      empDoc = await Employee.findById(emp._id);
      expect(empDoc.activeTaskCount).toBe(0);
    });
  });

  describe('BR6: Overdue Evaluation', () => {
    it('should correctly flag overdue tasks in active state and NOT in completed/cancelled states', async () => {
      const emp = await createActiveEmployee();
      const pastDueDate = new Date('2026-01-01');

      // Create an overdue Todo task directly in DB
      const overdueTask = await Task.create({
        taskId: 'TSK-OVERDUE-1',
        title: 'Past due task',
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
        startDate: new Date('2025-12-01'),
        dueDate: pastDueDate,
      });

      const getRes = await request(app).get(`/api/tasks/${overdueTask._id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.isOverdue).toBe(true);

      // Change status to Completed
      await request(app).put(`/api/tasks/${overdueTask._id}/status`).send({ status: 'In Progress' });
      await request(app).put(`/api/tasks/${overdueTask._id}/status`).send({ status: 'Completed' });

      const completedGet = await request(app).get(`/api/tasks/${overdueTask._id}`);
      expect(completedGet.body.data.isOverdue).toBe(false);
    });
  });

  describe('BR7: Protected Employee Deletion & Historical Integrity', () => {
    it('should block deletion of employee with active tasks (Todo / In Progress) with 400', async () => {
      const emp = await createActiveEmployee();
      await request(app)
        .post('/api/tasks')
        .send({
          title: 'Active task for deletion test',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Medium',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const delRes = await request(app).delete(`/api/employees/${emp._id}`);
      expect(delRes.status).toBe(400);
      expect(delRes.body.message).toMatch(/Cannot delete employee/i);
    });

    it('should allow deletion of employee with only completed tasks and preserve historical snapshot on tasks', async () => {
      const emp = await createActiveEmployee({ employeeId: 'EMP-DEL-OK', email: 'delok@test.com' });
      const taskRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Completed historical task',
          assignedEmployee: emp._id,
          department: 'Development',
          priority: 'Low',
          startDate: '2026-10-15',
          dueDate: '2026-10-20',
        });

      const taskId = taskRes.body.data._id;
      // Advance to Completed
      await request(app).put(`/api/tasks/${taskId}/status`).send({ status: 'In Progress' });
      await request(app).put(`/api/tasks/${taskId}/status`).send({ status: 'Completed' });

      // Deletion should now be allowed!
      const delRes = await request(app).delete(`/api/employees/${emp._id}`);
      expect(delRes.status).toBe(200);

      // Verify task still exists and retains assignedEmployeeSnapshot with employeeId, fullName, etc.
      const taskAfter = await Task.findById(taskId);
      expect(taskAfter).not.toBeNull();
      expect(taskAfter.assignedEmployeeSnapshot.fullName).toBe(emp.fullName);
      expect(taskAfter.assignedEmployeeSnapshot.employeeId).toBe('EMP-DEL-OK');
    });
  });
});
