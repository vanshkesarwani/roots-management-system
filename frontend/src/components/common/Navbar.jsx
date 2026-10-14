import React from 'react';
import { NavLink } from 'react-router-dom';

export const Navbar = () => {
  return (
    <header className="navbar">
      <div className="nav-brand-group">
        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/employees"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Employees
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Tasks
          </NavLink>
        </nav>
      </div>
      <div className="nav-subtitle">
        MERN stack developer practical task
      </div>
    </header>
  );
};
