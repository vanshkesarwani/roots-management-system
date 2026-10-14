import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Employee } from '../models/Employee.js';
import { AppError } from '../utils/AppError.js';
import { MAX_ACTIVE_TASKS_PER_EMPLOYEE } from '../config/constants.js';

// Helper: Normalize date to midnight UTC for boundary-accurate comparisons
const toMidnightUTC = (dateInput) => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Validate assignment eligibility (BR1)
export const validateAssignmentEligibility = (employee, startDate) => {
  if (employee.status === 'Inactive') {
    throw new AppError(
      `Cannot assign task to Inactive employee '${employee.fullName}'. Tasks can only be given to Active employees.`,
      400
    );
  }

  if (employee.status === 'On Leave') {
    if (employee.leaveStartDate && employee.leaveEndDate) {
      const taskStart = toMidnightUTC(startDate).getTime();
      const leaveStart = toMidnightUTC(employee.leaveStartDate).getTime();
      const leaveEnd = toMidnightUTC(employee.leaveEndDate).getTime();

      // BR1: Rejected only if task's Start Date falls inside the leave period (both dates inclusive)
      if (taskStart >= leaveStart && taskStart <= leaveEnd) {
        const startStr = new Date(employee.leaveStartDate).toLocaleDateString('en-GB');
        const endStr = new Date(employee.leaveEndDate).toLocaleDateString('en-GB');
        throw new AppError(
          `Cannot assign task to '${employee.fullName}'. The employee is On Leave from ${startStr} to ${endStr}, which overlaps with the task start date.`,
          400
        );
      }
    }
  }
};

// Reusable task filtering logic shared with CSV export
export const buildTaskFilter = (queryParams = {}) => {
  const filter = {};

  // Search: task title, employee name, or taskId
  if (queryParams.search && queryParams.search.trim()) {
    const searchRegex = new RegExp(queryParams.search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { 'assignedEmployeeSnapshot.fullName': searchRegex },
      { taskId: searchRegex },
    ];
  }

  // Filters: department, priority, status
  const VALID_DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
  const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
  const VALID_STATUSES = ['Todo', 'In Progress', 'Completed', 'Cancelled'];

  if (queryParams.department && queryParams.department !== 'All' && VALID_DEPARTMENTS.includes(queryParams.department)) {
    filter.department = queryParams.department;
  }
  if (queryParams.priority && queryParams.priority !== 'All' && VALID_PRIORITIES.includes(queryParams.priority)) {
    filter.priority = queryParams.priority;
  }
  if (queryParams.status && queryParams.status !== 'All' && VALID_STATUSES.includes(queryParams.status)) {
    filter.status = queryParams.status;
  }

  // Due date range filtering with invalid date protection
  if (queryParams.dueFrom || queryParams.dueTo) {
    if (queryParams.dueFrom) {
      const fromDate = new Date(queryParams.dueFrom);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setUTCHours(0, 0, 0, 0);
        filter.dueDate = filter.dueDate || {};
        filter.dueDate.$gte = fromDate;
      }
    }
    if (queryParams.dueTo) {
      const toDate = new Date(queryParams.dueTo);
      if (!isNaN(toDate.getTime())) {
        toDate.setUTCHours(23, 59, 59, 999);
        filter.dueDate = filter.dueDate || {};
        filter.dueDate.$lte = toDate;
      }
    }
  }

  return filter;
};

export const listTasks = async (queryParams) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = buildTaskFilter(queryParams);

  // Sorting with whitelist protection
  const ALLOWED_SORT_FIELDS = ['createdDate', 'dueDate', 'priority', 'title', 'startDate', 'status', 'taskId'];
  const sortBy = ALLOWED_SORT_FIELDS.includes(queryParams.sortBy) ? queryParams.sortBy : 'createdDate';
  const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;

  let tasks;
  let total;

  if (sortBy === 'priority') {
    // Sort priority by importance: Critical (4) > High (3) > Medium (2) > Low (1)
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'Critical'] }, then: 4 },
                { case: { $eq: ['$priority', 'High'] }, then: 3 },
                { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
                { case: { $eq: ['$priority', 'Low'] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      { $sort: { priorityWeight: sortOrder, dueDate: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    [tasks, total] = await Promise.all([
      Task.aggregate(pipeline),
      Task.countDocuments(filter),
    ]);

    // Populate virtual isOverdue for aggregated objects
    tasks = tasks.map((t) => {
      const isOverdue =
        t.status !== 'Completed' &&
        t.status !== 'Cancelled' &&
        t.dueDate &&
        new Date().getTime() > new Date(t.dueDate).getTime();
      return { ...t, isOverdue };
    });
  } else {
    const sort = {};
    sort[sortBy] = sortOrder;

    [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedEmployee', 'fullName employeeId email department status')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);
  }

  return {
    tasks,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  };
};

export const createTask = async (data) => {
  // BR3: New tasks must always start as Todo. Reject any other client-supplied status
  if (data.status && data.status !== 'Todo') {
    throw new AppError("New tasks must always start with 'Todo' status. Initial status cannot be set to other values.", 400);
  }

  // BR4: Reject client-supplied completedDate
  if (data.completedDate) {
    throw new AppError('Completed Date is determined automatically by the server upon completion.', 400);
  }

  // BR2: Due Date cannot be earlier than Start Date
  if (new Date(data.dueDate) < new Date(data.startDate)) {
    throw new AppError('Due Date cannot be earlier than Start Date.', 400);
  }

  // Find assigned employee
  let employee;
  if (mongoose.Types.ObjectId.isValid(data.assignedEmployee)) {
    employee = await Employee.findById(data.assignedEmployee);
  } else {
    employee = await Employee.findOne({ employeeId: data.assignedEmployee });
  }

  if (!employee) {
    throw new AppError('Assigned employee not found.', 404);
  }

  // BR1: Assignment validation (Active / Inactive / On Leave)
  validateAssignmentEligibility(employee, data.startDate);

  // BR5: Workload capacity (Max 3 active tasks) - Atomic concurrency-safe lease
  const updatedEmp = await Employee.findOneAndUpdate(
    { _id: employee._id, activeTaskCount: { $lt: MAX_ACTIVE_TASKS_PER_EMPLOYEE } },
    { $inc: { activeTaskCount: 1 } },
    { new: true }
  );

  if (!updatedEmp) {
    throw new AppError(
      'Employee already has 3 active tasks. Please choose another employee.',
      400
    );
  }

  try {
    const task = new Task({
      title: data.title?.trim(),
      description: data.description?.trim() || '',
      assignedEmployee: employee._id,
      assignedEmployeeSnapshot: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
      },
      department: data.department || employee.department,
      priority: data.priority || 'Medium',
      status: 'Todo', // BR3: New tasks start as Todo
      startDate: new Date(data.startDate),
      dueDate: new Date(data.dueDate),
    });

    await task.save();
    return task;
  } catch (err) {
    // Rollback atomic counter increment if save failed
    await Employee.findByIdAndUpdate(employee._id, { $inc: { activeTaskCount: -1 } });
    throw err;
  }
};

export const getTaskById = async (id) => {
  let task;
  if (mongoose.Types.ObjectId.isValid(id)) {
    task = await Task.findById(id).populate('assignedEmployee', 'fullName employeeId email department status');
  }
  if (!task) {
    task = await Task.findOne({ taskId: id.toUpperCase() }).populate('assignedEmployee', 'fullName employeeId email department status');
  }

  if (!task) {
    throw new AppError(`Task not found with identifier: ${id}`, 404);
  }

  return task;
};

export const updateTask = async (id, data) => {
  let task;
  if (mongoose.Types.ObjectId.isValid(id)) {
    task = await Task.findById(id);
  }
  if (!task) {
    task = await Task.findOne({ taskId: id.toUpperCase() });
  }

  if (!task) {
    throw new AppError(`Task not found with id: ${id}`, 404);
  }

  // BR3: Completed and Cancelled tasks cannot be edited
  if (task.status === 'Completed' || task.status === 'Cancelled') {
    throw new AppError(
      `Cannot edit a ${task.status} task. Completed and Cancelled tasks are immutable.`,
      400
    );
  }

  // BR3: Status cannot be changed through PUT /api/tasks/:id
  if (data.status && data.status !== task.status) {
    throw new AppError(
      'Task status cannot be modified via standard task update. Use PUT /api/tasks/:id/status instead.',
      400
    );
  }

  // BR4: Completed Date cannot be set from frontend
  if (data.completedDate !== undefined) {
    throw new AppError('Completed Date is determined automatically by the server upon completion.', 400);
  }

  // Validate dates if modified
  const newStart = data.startDate ? new Date(data.startDate) : task.startDate;
  const newDue = data.dueDate ? new Date(data.dueDate) : task.dueDate;
  if (newDue < newStart) {
    throw new AppError('Due Date cannot be earlier than Start Date.', 400);
  }

  // Handle employee reassignment if assignedEmployee changed
  if (data.assignedEmployee && data.assignedEmployee.toString() !== task.assignedEmployee.toString()) {
    let newEmployee;
    if (mongoose.Types.ObjectId.isValid(data.assignedEmployee)) {
      newEmployee = await Employee.findById(data.assignedEmployee);
    } else {
      newEmployee = await Employee.findOne({ employeeId: data.assignedEmployee });
    }

    if (!newEmployee) {
      throw new AppError('New assigned employee not found.', 404);
    }

    // Check assignment eligibility for new employee
    validateAssignmentEligibility(newEmployee, newStart);

    // Check capacity for new employee (if task is active)
    const isTaskActive = task.status === 'Todo' || task.status === 'In Progress';
    if (isTaskActive) {
      // Concurrency-safe atomic lease on target employee
      const targetEmp = await Employee.findOneAndUpdate(
        { _id: newEmployee._id, activeTaskCount: { $lt: MAX_ACTIVE_TASKS_PER_EMPLOYEE } },
        { $inc: { activeTaskCount: 1 } },
        { new: true }
      );

      if (!targetEmp) {
        throw new AppError(
          'Target employee already has 3 active tasks. Please choose another employee.',
          400
        );
      }

      // Atomically decrement old employee active count
      await Employee.findByIdAndUpdate(task.assignedEmployee, { $inc: { activeTaskCount: -1 } });
    }

    task.assignedEmployee = newEmployee._id;
    task.assignedEmployeeSnapshot = {
      employeeId: newEmployee.employeeId,
      fullName: newEmployee.fullName,
      email: newEmployee.email,
      department: newEmployee.department,
    };
  } else if (data.startDate) {
    // If employee didn't change but startDate changed, re-verify leave window if employee is On Leave
    const employee = await Employee.findById(task.assignedEmployee);
    if (employee) {
      validateAssignmentEligibility(employee, newStart);
    }
  }

  if (data.title) task.title = data.title.trim();
  if (data.description !== undefined) task.description = data.description.trim();
  if (data.department) task.department = data.department;
  if (data.priority) task.priority = data.priority;
  task.startDate = newStart;
  task.dueDate = newDue;

  await task.save();
  return task;
};

export const deleteTask = async (id) => {
  let task;
  if (mongoose.Types.ObjectId.isValid(id)) {
    task = await Task.findById(id);
  }
  if (!task) {
    task = await Task.findOne({ taskId: id.toUpperCase() });
  }

  if (!task) {
    throw new AppError(`Task not found with id: ${id}`, 404);
  }

  const wasActive = task.status === 'Todo' || task.status === 'In Progress';
  const assignedEmpId = task.assignedEmployee;

  await Task.findByIdAndDelete(task._id);

  if (wasActive && assignedEmpId) {
    await Employee.findByIdAndUpdate(assignedEmpId, {
      $inc: { activeTaskCount: -1 },
    });
  }

  return { message: 'Task deleted successfully.' };
};
