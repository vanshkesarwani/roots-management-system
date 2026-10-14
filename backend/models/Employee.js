import mongoose from 'mongoose';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../config/constants.js';

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+]?[\d\s\-().]{3,25}$/, 'Please provide a valid phone number'],
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
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: EMPLOYEE_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Active',
      index: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    leaveStartDate: {
      type: Date,
      default: null,
    },
    leaveEndDate: {
      type: Date,
      default: null,
    },
    activeTaskCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for department & status queries
EmployeeSchema.index({ department: 1, status: 1 });

// Pre-validate hook for On Leave validation
EmployeeSchema.pre('validate', function (next) {
  if (this.status === 'On Leave') {
    if (!this.leaveStartDate) {
      this.invalidate('leaveStartDate', 'Leave Start Date is required when employee is On Leave');
    }
    if (!this.leaveEndDate) {
      this.invalidate('leaveEndDate', 'Leave End Date is required when employee is On Leave');
    }
    if (this.leaveStartDate && this.leaveEndDate && new Date(this.leaveEndDate) < new Date(this.leaveStartDate)) {
      this.invalidate('leaveEndDate', 'Leave End Date cannot be earlier than Leave Start Date');
    }
  } else {
    this.leaveStartDate = null;
    this.leaveEndDate = null;
  }
  next();
});

export const Employee = mongoose.model('Employee', EmployeeSchema);
