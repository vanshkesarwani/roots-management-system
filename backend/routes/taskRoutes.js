import express from 'express';
import {
  getTasks,
  getTask,
  addTask,
  editTask,
  removeTask,
  changeTaskStatus,
  exportTasksCsv,
} from '../controllers/taskController.js';

const router = express.Router();

// Specific routes first
router.get('/export/csv', exportTasksCsv);

router.route('/')
  .get(getTasks)
  .post(addTask);

router.put('/:id/status', changeTaskStatus);

router.route('/:id')
  .get(getTask)
  .put(editTask)
  .delete(removeTask);

export default router;
