import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Employee } from '../models/Employee.js';
import { AppError } from '../utils/AppError.js';
import { VALID_STATUS_TRANSITIONS } from '../config/constants.js';

export const updateTaskStatus = async (taskId, newStatus) => {
  if (!newStatus) {
    throw new AppError('New status is required.', 400);
  }

  let task;
  if (mongoose.Types.ObjectId.isValid(taskId)) {
    task = await Task.findById(taskId);
  }
  if (!task) {
    task = await Task.findOne({ taskId: taskId.toUpperCase() });
  }

  if (!task) {
    throw new AppError(`Task not found with id: ${taskId}`, 404);
  }

  const currentStatus = task.status;

  // Terminal state check: Completed and Cancelled tasks cannot be modified
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
    throw new AppError(`Cannot change status of a ${currentStatus} task. Terminal tasks are immutable.`, 400);
  }

  const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none'}.`,
      400
    );
  }

  const wasActive = currentStatus === 'Todo' || currentStatus === 'In Progress';
  const nowTerminal = newStatus === 'Completed' || newStatus === 'Cancelled';

  task.status = newStatus;

  // BR4: Completed Date is set by backend when task becomes Completed, never from frontend
  if (newStatus === 'Completed') {
    task.completedDate = new Date();
  }

  await task.save();

  // Update employee's active task count if task became terminal
  if (wasActive && nowTerminal && task.assignedEmployee) {
    await Employee.findByIdAndUpdate(task.assignedEmployee, {
      $inc: { activeTaskCount: -1 },
    });
  }

  return task;
};
