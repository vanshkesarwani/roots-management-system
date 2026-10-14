import mongoose from 'mongoose';
import { DEPARTMENTS, TASK_PRIORITIES, TASK_STATUSES } from '../config/constants.js';
import { getNextSequence } from './Counter.js';
import { computeIsOverdue } from '../utils/overdueHelper.js';

const EmployeeSnapshotSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    department: { type: String, required: true },
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Assigned employee is required'],
      index: true,
    },
    assignedEmployeeSnapshot: {
      type: EmployeeSnapshotSchema,
      required: [true, 'Historical employee snapshot is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: '{VALUE} is not a valid department',
      },
      index: true,
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: TASK_PRIORITIES,
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: TASK_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Todo',
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for performant querying, capacity checking, and filtering
TaskSchema.index({ assignedEmployee: 1, status: 1 });
TaskSchema.index({ department: 1, status: 1 });
TaskSchema.index({ status: 1, dueDate: 1 });

// Virtual for overdue determination using authoritative calculation
TaskSchema.virtual('isOverdue').get(function () {
  return computeIsOverdue(this.dueDate, this.status);
});

// Auto-generate sequential taskId and validate date ordering
TaskSchema.pre('validate', async function (next) {
  if (this.isNew && !this.taskId) {
    try {
      const seq = await getNextSequence('taskId');
      this.taskId = `TSK-${String(seq).padStart(3, '0')}`;
    } catch (err) {
      return next(err);
    }
  }

  if (this.startDate && this.dueDate && new Date(this.dueDate) < new Date(this.startDate)) {
    this.invalidate('dueDate', 'Due Date cannot be earlier than Start Date');
  }

  next();
});

export const Task = mongoose.model('Task', TaskSchema);
