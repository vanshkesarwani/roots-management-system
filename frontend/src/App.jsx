import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { TaskListPage } from './pages/tasks/TaskListPage';
import { TaskAddPage } from './pages/tasks/TaskAddPage';
import { TaskEditPage } from './pages/tasks/TaskEditPage';
import { TaskDetailsPage } from './pages/tasks/TaskDetailsPage';
import { EmployeeListPage } from './pages/employees/EmployeeListPage';
import { EmployeeAddPage } from './pages/employees/EmployeeAddPage';
import { EmployeeEditPage } from './pages/employees/EmployeeEditPage';
import { EmployeeDetailsPage } from './pages/employees/EmployeeDetailsPage';

function App() {
  return (
    <div className="app-root">
      <Navbar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />

        {/* Tasks Routes */}
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskAddPage />} />
        <Route path="/tasks/:id" element={<TaskDetailsPage />} />
        <Route path="/tasks/:id/edit" element={<TaskEditPage />} />

        {/* Employees Routes */}
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/new" element={<EmployeeAddPage />} />
        <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
        <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
