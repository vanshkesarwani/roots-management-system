import express from 'express';
import {
  getEmployees,
  getEmployee,
  addEmployee,
  editEmployee,
  removeEmployee,
} from '../controllers/employeeController.js';

const router = express.Router();

router.route('/')
  .get(getEmployees)
  .post(addEmployee);

router.route('/:id')
  .get(getEmployee)
  .put(editEmployee)
  .delete(removeEmployee);

export default router;
