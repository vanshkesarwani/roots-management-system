import mongoose from 'mongoose';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { AppError } from '../utils/AppError.js';

export const listEmployees = async (queryParams) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (queryParams.search && queryParams.search.trim()) {
    const searchRegex = new RegExp(queryParams.search.trim(), 'i');
    filter.$or = [
      { fullName: searchRegex },
      { role: searchRegex },
      { employeeId: searchRegex },
      { email: searchRegex },
    ];
  }

  const VALID_DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
  const VALID_STATUSES = ['Active', 'Inactive', 'On Leave'];

  if (queryParams.department && queryParams.department !== 'All' && VALID_DEPARTMENTS.includes(queryParams.department)) {
    filter.department = queryParams.department;
  }

  if (queryParams.status && queryParams.status !== 'All' && VALID_STATUSES.includes(queryParams.status)) {
    filter.status = queryParams.status;
  }

  const ALLOWED_SORT_FIELDS = ['createdAt', 'fullName', 'joiningDate', 'department', 'role', 'status', 'employeeId'];
  const sortBy = ALLOWED_SORT_FIELDS.includes(queryParams.sortBy) ? queryParams.sortBy : 'createdAt';
  const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;
  const sort = {};
  sort[sortBy] = sortOrder;

  const [employees, total] = await Promise.all([
    Employee.find(filter).sort(sort).skip(skip).limit(limit),
    Employee.countDocuments(filter),
  ]);

  return {
    employees,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  };
};

export const createEmployee = async (data) => {
  // Check duplicate email or employeeId early to provide crystal-clear 409 responses
  const existingId = await Employee.findOne({ employeeId: data.employeeId?.trim().toUpperCase() });
  if (existingId) {
    throw new AppError(`Employee ID '${data.employeeId}' is already registered.`, 409, [
      { field: 'employeeId', message: 'Employee ID must be unique' },
    ]);
  }

  const existingEmail = await Employee.findOne({ email: data.email?.trim().toLowerCase() });
  if (existingEmail) {
    throw new AppError(`Email '${data.email}' is already registered.`, 409, [
      { field: 'email', message: 'Email must be unique' },
    ]);
  }

  const employee = new Employee({
    ...data,
    employeeId: data.employeeId?.trim().toUpperCase(),
    email: data.email?.trim().toLowerCase(),
  });

  await employee.save();
  return employee;
};

export const getEmployeeById = async (id) => {
  let employee;
  if (mongoose.Types.ObjectId.isValid(id)) {
    employee = await Employee.findById(id);
  }
  if (!employee) {
    employee = await Employee.findOne({ employeeId: id.toUpperCase() });
  }

  if (!employee) {
    throw new AppError(`Employee not found with identifier: ${id}`, 404);
  }

  // Fetch active tasks and task history
  const [activeTasks, pastTasks] = await Promise.all([
    Task.find({
      assignedEmployee: employee._id,
      status: { $in: ['Todo', 'In Progress'] },
    }).sort({ dueDate: 1 }),
    Task.find({
      assignedEmployee: employee._id,
      status: { $in: ['Completed', 'Cancelled'] },
    }).sort({ completedDate: -1, updatedAt: -1 }),
  ]);

  return {
    ...employee.toObject(),
    activeTasks,
    pastTasks,
  };
};

export const updateEmployee = async (id, data) => {
  let employee;
  if (mongoose.Types.ObjectId.isValid(id)) {
    employee = await Employee.findById(id);
  }
  if (!employee) {
    employee = await Employee.findOne({ employeeId: id.toUpperCase() });
  }

  if (!employee) {
    throw new AppError(`Employee not found with id: ${id}`, 404);
  }

  // Prevent changing employeeId to maintain audit integrity
  if (data.employeeId && data.employeeId.toUpperCase() !== employee.employeeId) {
    throw new AppError('Employee ID cannot be modified once created.', 400);
  }

  // If email changed, check uniqueness
  if (data.email && data.email.toLowerCase() !== employee.email) {
    const existingEmail = await Employee.findOne({
      email: data.email.toLowerCase(),
      _id: { $ne: employee._id },
    });
    if (existingEmail) {
      throw new AppError(`Email '${data.email}' is already taken.`, 409);
    }
    employee.email = data.email.toLowerCase();
  }

  if (data.fullName) employee.fullName = data.fullName.trim();
  if (data.phone) employee.phone = data.phone.trim();
  if (data.department) employee.department = data.department;
  if (data.role) employee.role = data.role.trim();
  if (data.skills) employee.skills = data.skills;

  if (data.status) {
    employee.status = data.status;
    if (data.status === 'On Leave') {
      if (data.leaveStartDate !== undefined) employee.leaveStartDate = data.leaveStartDate;
      if (data.leaveEndDate !== undefined) employee.leaveEndDate = data.leaveEndDate;
    } else {
      employee.leaveStartDate = null;
      employee.leaveEndDate = null;
    }
  } else if (employee.status === 'On Leave') {
    if (data.leaveStartDate !== undefined) employee.leaveStartDate = data.leaveStartDate;
    if (data.leaveEndDate !== undefined) employee.leaveEndDate = data.leaveEndDate;
  }

  await employee.save();
  return employee;
};

export const deleteEmployee = async (id) => {
  let employee;
  if (mongoose.Types.ObjectId.isValid(id)) {
    employee = await Employee.findById(id);
  }
  if (!employee) {
    employee = await Employee.findOne({ employeeId: id.toUpperCase() });
  }

  if (!employee) {
    throw new AppError(`Employee not found with id: ${id}`, 404);
  }

  // BR7: Delete employee not allowed while the employee has Todo / In Progress tasks
  const activeTaskCount = await Task.countDocuments({
    assignedEmployee: employee._id,
    status: { $in: ['Todo', 'In Progress'] },
  });

  if (activeTaskCount > 0) {
    throw new AppError(
      `Cannot delete employee '${employee.fullName}'. They currently hold ${activeTaskCount} active task(s) (Todo / In Progress). Please reassign or complete these tasks first.`,
      400
    );
  }

  // Old tasks remain meaningful because they embed assignedEmployeeSnapshot
  await Employee.findByIdAndDelete(employee._id);
  return { message: 'Employee deleted successfully. Historical completed/cancelled tasks retain their employee details.' };
};
