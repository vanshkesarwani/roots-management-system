import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';

/**
 * Calculates live dashboard metrics directly from MongoDB via aggregation pipelines.
 * Never returns hardcoded statistics.
 */
export const getDashboardMetrics = async () => {
  const now = new Date();

  const [employeeAgg, [taskAgg]] = await Promise.all([
    // Employee counts grouped by status
    Employee.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Single aggregation pass using $facet for status counts, overdue counts, and employee workload
    Task.aggregate([
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          overdueCount: [
            {
              $match: {
                status: { $in: ['Todo', 'In Progress'] },
                dueDate: { $lt: now },
              },
            },
            {
              $count: 'count',
            },
          ],
          employeeWorkload: [
            {
              $match: {
                status: { $in: ['Todo', 'In Progress'] },
              },
            },
            {
              $group: {
                _id: '$assignedEmployee',
                activeTasks: { $sum: 1 },
                employeeSnapshot: { $first: '$assignedEmployeeSnapshot' },
              },
            },
            {
              $lookup: {
                from: 'employees',
                localField: '_id',
                foreignField: '_id',
                as: 'employeeDoc',
              },
            },
            {
              $unwind: {
                path: '$employeeDoc',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                employeeId: {
                  $ifNull: ['$employeeDoc.employeeId', '$employeeSnapshot.employeeId'],
                },
                employee: {
                  $ifNull: ['$employeeDoc.fullName', '$employeeSnapshot.fullName'],
                },
                department: {
                  $ifNull: ['$employeeDoc.department', '$employeeSnapshot.department'],
                },
                activeTasks: 1,
              },
            },
            {
              $sort: { activeTasks: -1, employee: 1 },
            },
          ],
        },
      },
    ]),
  ]);

  // Normalize employee metrics
  const employees = {
    total: 0,
    active: 0,
    inactive: 0,
    onLeave: 0,
  };

  (employeeAgg || []).forEach((item) => {
    employees.total += item.count;
    if (item._id === 'Active') employees.active = item.count;
    if (item._id === 'Inactive') employees.inactive = item.count;
    if (item._id === 'On Leave') employees.onLeave = item.count;
  });

  // Normalize task metrics
  const tasks = {
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: taskAgg?.overdueCount?.[0]?.count || 0,
  };

  (taskAgg?.statusCounts || []).forEach((item) => {
    tasks.total += item.count;
    if (item._id === 'Todo') tasks.todo = item.count;
    if (item._id === 'In Progress') tasks.inProgress = item.count;
    if (item._id === 'Completed') tasks.completed = item.count;
    if (item._id === 'Cancelled') tasks.cancelled = item.count;
  });

  return {
    employees,
    tasks,
    employeeWorkload: taskAgg?.employeeWorkload || [],
  };
};
