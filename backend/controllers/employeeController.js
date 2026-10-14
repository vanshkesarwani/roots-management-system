import { asyncWrapper } from '../middlewares/asyncWrapper.js';
import * as employeeService from '../services/employeeService.js';

export const getEmployees = asyncWrapper(async (req, res) => {
  const result = await employeeService.listEmployees(req.query);
  res.status(200).json({
    success: true,
    data: result.employees,
    pagination: result.pagination,
  });
});

export const getEmployee = asyncWrapper(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  res.status(200).json({
    success: true,
    data: employee,
  });
});

export const addEmployee = asyncWrapper(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: employee,
  });
});

export const editEmployee = asyncWrapper(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Employee updated successfully',
    data: employee,
  });
});

export const removeEmployee = asyncWrapper(async (req, res) => {
  const result = await employeeService.deleteEmployee(req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});
