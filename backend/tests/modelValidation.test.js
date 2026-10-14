import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { Counter } from '../models/Counter.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Ensure indexes are built in test database
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

describe('Mongoose Models & Schema Validation Suite', () => {
  describe('Employee Model Validation', () => {
    const validEmployeeData = {
      employeeId: 'EMP-001',
      fullName: 'Vansh Kesarwani',
      email: 'vansh@rootsmedia.com',
      phone: '+91 98765 43210',
      department: 'Development',
      role: 'Full Stack Engineer',
      joiningDate: new Date('2024-01-15'),
      status: 'Active',
      skills: ['Node.js', 'React', 'MongoDB'],
    };

    it('should successfully create and save an employee with valid data', async () => {
      const emp = new Employee(validEmployeeData);
      const saved = await emp.save();

      expect(saved._id).toBeDefined();
      expect(saved.employeeId).toBe('EMP-001');
      expect(saved.fullName).toBe('Vansh Kesarwani');
      expect(saved.email).toBe('vansh@rootsmedia.com');
      expect(saved.department).toBe('Development');
      expect(saved.status).toBe('Active');
      expect(saved.activeTaskCount).toBe(0);
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('should fail validation if required fields are missing', async () => {
      const emp = new Employee({});
      let err;
      try {
        await emp.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.errors.employeeId).toBeDefined();
      expect(err.errors.fullName).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.phone).toBeDefined();
      expect(err.errors.department).toBeDefined();
      expect(err.errors.role).toBeDefined();
      expect(err.errors.joiningDate).toBeDefined();
    });

    it('should normalize email to trimmed lowercase', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        email: '  VANSH.TEST@RootsMedia.COM  ',
      });
      await emp.validate();
      expect(emp.email).toBe('vansh.test@rootsmedia.com');
    });

    it('should normalize employeeId to trimmed uppercase', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        employeeId: '  emp-002  ',
      });
      await emp.validate();
      expect(emp.employeeId).toBe('EMP-002');
    });

    it('should reject invalid email formats', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        email: 'not-an-email',
      });
      let err;
      try {
        await emp.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.email.message).toContain('Please provide a valid email address');
    });

    it('should reject invalid departments outside the allowed enum', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        department: 'Finance', // Not allowed: only Development, Design, QA, HR, Sales
      });
      let err;
      try {
        await emp.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.department).toBeDefined();
      expect(err.errors.department.message).toContain('is not a valid department');
    });

    it('should reject invalid statuses outside the allowed enum', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        status: 'Terminated', // Not allowed: only Active, Inactive, On Leave
      });
      let err;
      try {
        await emp.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.status).toBeDefined();
      expect(err.errors.status.message).toContain('is not a valid status');
    });

    it('should require leaveStartDate and leaveEndDate when status is On Leave', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        status: 'On Leave',
        leaveStartDate: null,
        leaveEndDate: null,
      });
      let err;
      try {
        await emp.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.leaveStartDate).toBeDefined();
      expect(err.errors.leaveEndDate).toBeDefined();
    });

    it('should reject leaveEndDate earlier than leaveStartDate', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        status: 'On Leave',
        leaveStartDate: new Date('2026-11-10'),
        leaveEndDate: new Date('2026-11-05'), // earlier
      });
      let err;
      try {
        await emp.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.leaveEndDate).toBeDefined();
      expect(err.errors.leaveEndDate.message).toContain('Leave End Date cannot be earlier than Leave Start Date');
    });

    it('should reset leave dates to null when status is Active', async () => {
      const emp = new Employee({
        ...validEmployeeData,
        status: 'Active',
        leaveStartDate: new Date('2026-11-01'),
        leaveEndDate: new Date('2026-11-10'),
      });
      await emp.validate();
      expect(emp.leaveStartDate).toBeNull();
      expect(emp.leaveEndDate).toBeNull();
    });

    it('should enforce case-insensitive uniqueness on email at database level', async () => {
      await Employee.create(validEmployeeData);

      let err;
      try {
        await Employee.create({
          ...validEmployeeData,
          employeeId: 'EMP-999',
          email: 'VANSH@ROOTSMEDIA.COM', // Same email, different case
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.code === 11000 || err.errorResponse?.code === 11000).toBe(true);
    });

    it('should enforce unique employeeId at database level', async () => {
      await Employee.create(validEmployeeData);

      let err;
      try {
        await Employee.create({
          ...validEmployeeData,
          employeeId: 'EMP-001', // Duplicate ID
          email: 'different@rootsmedia.com',
        });
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.code === 11000 || err.errorResponse?.code === 11000).toBe(true);
    });
  });

  describe('Task Model Validation', () => {
    let testEmployee;

    beforeEach(async () => {
      testEmployee = await Employee.create({
        employeeId: 'EMP-100',
        fullName: 'Aarav Gupta',
        email: 'aarav@rootsmedia.com',
        phone: '+91 91234 56789',
        department: 'Development',
        role: 'Senior Backend Developer',
        joiningDate: new Date('2023-05-10'),
        status: 'Active',
      });
    });

    it('should auto-generate sequential taskId (e.g. TSK-001)', async () => {
      const task1 = await Task.create({
        title: 'Build Authentication',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        priority: 'High',
        startDate: new Date('2026-10-15'),
        dueDate: new Date('2026-10-25'),
      });

      const task2 = await Task.create({
        title: 'Setup Database Indexes',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        priority: 'Medium',
        startDate: new Date('2026-10-16'),
        dueDate: new Date('2026-10-26'),
      });

      expect(task1.taskId).toBe('TSK-001');
      expect(task2.taskId).toBe('TSK-002');
    });

    it('should reject missing required task fields', async () => {
      const task = new Task({});
      let err;
      try {
        await task.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.errors.title).toBeDefined();
      expect(err.errors.assignedEmployee).toBeDefined();
      expect(err.errors.assignedEmployeeSnapshot).toBeDefined();
      expect(err.errors.department).toBeDefined();
      expect(err.errors.startDate).toBeDefined();
      expect(err.errors.dueDate).toBeDefined();
    });

    it('should reject invalid priority and status values', async () => {
      const task = new Task({
        title: 'Invalid Enum Test',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        priority: 'Urgent', // invalid
        status: 'Blocked', // invalid
        startDate: new Date('2026-10-15'),
        dueDate: new Date('2026-10-20'),
      });

      let err;
      try {
        await task.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.errors.priority).toBeDefined();
      expect(err.errors.status).toBeDefined();
    });

    it('should reject dueDate earlier than startDate', async () => {
      const task = new Task({
        title: 'Date Order Test',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        priority: 'Medium',
        startDate: new Date('2026-10-25'),
        dueDate: new Date('2026-10-20'), // earlier than start date
      });

      let err;
      try {
        await task.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.errors.dueDate).toBeDefined();
      expect(err.errors.dueDate.message).toContain('Due Date cannot be earlier than Start Date');
    });

    it('should correctly calculate isOverdue virtual property', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 5); // 5 days ago
      const futureDate = new Date(Date.now() + 86400000 * 5); // 5 days ahead

      // Active task past due date -> isOverdue: true
      const overdueTask = new Task({
        title: 'Overdue Task',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        status: 'Todo',
        startDate: new Date(Date.now() - 86400000 * 10),
        dueDate: pastDate,
      });

      // Completed task past due date -> isOverdue: false
      const completedTask = new Task({
        title: 'Completed Task',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        status: 'Completed',
        startDate: new Date(Date.now() - 86400000 * 10),
        dueDate: pastDate,
      });

      // Active task with future due date -> isOverdue: false
      const futureTask = new Task({
        title: 'Future Task',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        status: 'In Progress',
        startDate: new Date(),
        dueDate: futureDate,
      });

      expect(overdueTask.isOverdue).toBe(true);
      expect(completedTask.isOverdue).toBe(false);
      expect(futureTask.isOverdue).toBe(false);
    });

    it('should retain historical assignedEmployeeSnapshot even after employee document is deleted', async () => {
      const task = await Task.create({
        title: 'Task for snapshot check',
        assignedEmployee: testEmployee._id,
        assignedEmployeeSnapshot: {
          employeeId: testEmployee.employeeId,
          fullName: testEmployee.fullName,
          email: testEmployee.email,
          department: testEmployee.department,
        },
        department: 'Development',
        priority: 'Low',
        status: 'Completed',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-10-05'),
        completedDate: new Date('2026-10-04'),
      });

      // Delete the employee
      await Employee.findByIdAndDelete(testEmployee._id);

      // Fetch task without populate
      const fetchedTask = await Task.findById(task._id);
      expect(fetchedTask.assignedEmployeeSnapshot.employeeId).toBe('EMP-100');
      expect(fetchedTask.assignedEmployeeSnapshot.fullName).toBe('Aarav Gupta');
      expect(fetchedTask.assignedEmployeeSnapshot.email).toBe('aarav@rootsmedia.com');

      // Fetch task with populate (reference is null, snapshot is preserved)
      const populatedTask = await Task.findById(task._id).populate('assignedEmployee');
      expect(populatedTask.assignedEmployee).toBeNull();
      expect(populatedTask.assignedEmployeeSnapshot.fullName).toBe('Aarav Gupta');
    });
  });
});
