import { asyncWrapper } from '../middlewares/asyncWrapper.js';
import * as taskService from '../services/taskService.js';
import * as taskStateService from '../services/taskStateService.js';
import * as csvExportService from '../services/csvExportService.js';

export const getTasks = asyncWrapper(async (req, res) => {
  const result = await taskService.listTasks(req.query);
  res.status(200).json({
    success: true,
    data: result.tasks,
    pagination: result.pagination,
  });
});

export const getTask = asyncWrapper(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  res.status(200).json({
    success: true,
    data: task,
  });
});

export const addTask = asyncWrapper(async (req, res) => {
  const task = await taskService.createTask(req.body);
  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task,
  });
});

export const editTask = asyncWrapper(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: task,
  });
});

export const removeTask = asyncWrapper(async (req, res) => {
  const result = await taskService.deleteTask(req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// Dedicated status transition endpoint (BR3 & BR4)
export const changeTaskStatus = asyncWrapper(async (req, res) => {
  const task = await taskStateService.updateTaskStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: `Task status updated to '${task.status}' successfully`,
    data: task,
  });
});

// Server-side CSV Export matching current filters (BR9)
export const exportTasksCsv = asyncWrapper(async (req, res) => {
  const csvData = await csvExportService.generateTasksCsv(req.query);

  const timestamp = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${timestamp}.csv"`);
  res.status(200).send(csvData);
});
