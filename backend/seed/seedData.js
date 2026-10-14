import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { Counter } from '../models/Counter.js';

dotenv.config();

export const seedDatabase = async () => {
  console.log('[Seed] Clearing existing collections...');
  await Employee.deleteMany({});
  await Task.deleteMany({});
  await Counter.deleteMany({});

  // Initialize Counter
  await Counter.create({ id: 'taskId', seq: 0 });

  console.log('[Seed] Inserting 12 Employees (8 Active, 2 Inactive, 2 On Leave)...');
  
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);
  
  const leaveStart1 = new Date();
  leaveStart1.setDate(today.getDate() - 5);
  const leaveEnd1 = new Date();
  leaveEnd1.setDate(today.getDate() + 10);

  const leaveStart2 = new Date();
  leaveStart2.setDate(today.getDate() + 15);
  const leaveEnd2 = new Date();
  leaveEnd2.setDate(today.getDate() + 25);

  const employeesData = [
    {
      employeeId: 'EMP-001',
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@rootsmedia.com',
      phone: '+91 98765 43210',
      department: 'Development',
      role: 'Senior Full Stack Engineer',
      joiningDate: new Date('2023-01-15'),
      status: 'Active',
      skills: ['React', 'Node.js', 'MongoDB', 'AWS'],
      activeTaskCount: 3,
    },
    {
      employeeId: 'EMP-002',
      fullName: 'Priya Patil',
      email: 'priya.patil@rootsmedia.com',
      phone: '+91 98765 43211',
      department: 'Design',
      role: 'Lead UI/UX Designer',
      joiningDate: new Date('2023-03-01'),
      status: 'Active',
      skills: ['Figma', 'UI Design', 'Design Systems', 'CSS'],
      activeTaskCount: 2,
    },
    {
      employeeId: 'EMP-003',
      fullName: 'Amit Joshi',
      email: 'amit.joshi@rootsmedia.com',
      phone: '+91 98765 43212',
      department: 'QA',
      role: 'Senior QA Automation Engineer',
      joiningDate: new Date('2023-05-10'),
      status: 'Active',
      skills: ['Jest', 'Cypress', 'API Testing', 'Performance'],
      activeTaskCount: 1,
    },
    {
      employeeId: 'EMP-004',
      fullName: 'Sneha Verma',
      email: 'sneha.verma@rootsmedia.com',
      phone: '+91 98765 43213',
      department: 'HR',
      role: 'HR Specialist',
      joiningDate: new Date('2023-06-20'),
      status: 'Active',
      skills: ['Recruitment', 'People Ops', 'Employee Relations'],
      activeTaskCount: 3,
    },
    {
      employeeId: 'EMP-005',
      fullName: 'Vikram Singh',
      email: 'vikram.singh@rootsmedia.com',
      phone: '+91 98765 43214',
      department: 'Sales',
      role: 'Enterprise Sales Lead',
      joiningDate: new Date('2023-08-01'),
      status: 'Active',
      skills: ['B2B Sales', 'Client Acquisition', 'Negotiation'],
      activeTaskCount: 3,
    },
    {
      employeeId: 'EMP-006',
      fullName: 'Ananya Roy',
      email: 'ananya.roy@rootsmedia.com',
      phone: '+91 98765 43215',
      department: 'Development',
      role: 'Backend Architect',
      joiningDate: new Date('2023-09-15'),
      status: 'Active',
      skills: ['Node.js', 'PostgreSQL', 'Microservices', 'Docker'],
      activeTaskCount: 3,
    },
    {
      employeeId: 'EMP-007',
      fullName: 'Rohan Mehta',
      email: 'rohan.mehta@rootsmedia.com',
      phone: '+91 98765 43216',
      department: 'Design',
      role: 'Visual Designer',
      joiningDate: new Date('2023-11-01'),
      status: 'Active',
      skills: ['Branding', 'Typography', 'Illustrations'],
      activeTaskCount: 3,
    },
    {
      employeeId: 'EMP-008',
      fullName: 'Deepa Nair',
      email: 'deepa.nair@rootsmedia.com',
      phone: '+91 98765 43217',
      department: 'QA',
      role: 'QA Engineer',
      joiningDate: new Date('2024-01-10'),
      status: 'Active',
      skills: ['Manual Testing', 'Bug Tracking', 'Jira'],
      activeTaskCount: 3,
    },
    // Inactive (2)
    {
      employeeId: 'EMP-009',
      fullName: 'Rajesh Kumar',
      email: 'rajesh.kumar@rootsmedia.com',
      phone: '+91 98765 43218',
      department: 'Development',
      role: 'Junior Web Developer',
      joiningDate: new Date('2023-02-15'),
      status: 'Inactive',
      skills: ['HTML', 'CSS', 'JavaScript'],
      activeTaskCount: 0,
    },
    {
      employeeId: 'EMP-010',
      fullName: 'Pooja Gupta',
      email: 'pooja.gupta@rootsmedia.com',
      phone: '+91 98765 43219',
      department: 'Sales',
      role: 'Sales Representative',
      joiningDate: new Date('2023-07-01'),
      status: 'Inactive',
      skills: ['Outreach', 'CRM', 'Cold Calling'],
      activeTaskCount: 0,
    },
    // On Leave (2)
    {
      employeeId: 'EMP-011',
      fullName: 'Karan Patel',
      email: 'karan.patel@rootsmedia.com',
      phone: '+91 98765 43220',
      department: 'HR',
      role: 'Talent Acquisition Manager',
      joiningDate: new Date('2023-04-12'),
      status: 'On Leave',
      skills: ['Technical Hiring', 'Onboarding', 'Campus Recruitment'],
      leaveStartDate: leaveStart1,
      leaveEndDate: leaveEnd1,
      activeTaskCount: 0,
    },
    {
      employeeId: 'EMP-012',
      fullName: 'Neha Sharma',
      email: 'neha.sharma@rootsmedia.com',
      phone: '+91 98765 43221',
      department: 'Development',
      role: 'Frontend Developer',
      joiningDate: new Date('2023-10-05'),
      status: 'On Leave',
      skills: ['Vue.js', 'React', 'Tailwind'],
      leaveStartDate: leaveStart2,
      leaveEndDate: leaveEnd2,
      activeTaskCount: 0,
    },
  ];

  const createdEmployees = await Employee.insertMany(employeesData);
  const empMap = {};
  createdEmployees.forEach((emp) => {
    empMap[emp.employeeId] = emp;
  });

  console.log('[Seed] Seeding 40 Tasks matching assignment dashboard metrics...');

  // Helper to construct date relative to today
  const relDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  // 40 tasks distribution:
  // Total: 40
  // Todo: 14
  // In Progress: 9
  // Completed: 14
  // Cancelled: 3
  // Overdue: 5 (active tasks with dueDate in the past)
  //
  // Workload:
  // Rahul Sharma: 3 active (2 In Progress + 1 Todo)
  // Priya Patil: 2 active (1 In Progress + 1 Todo)
  // Amit Joshi: 1 active (1 In Progress)
  // Sneha Verma: 3 active (3 Todo)
  // Vikram Singh: 3 active (3 Todo)
  // Ananya Roy: 3 active (2 In Progress + 1 Todo)
  // Rohan Mehta: 3 active (2 In Progress + 1 Todo)
  // Deepa Nair: 3 active (1 In Progress + 2 Todo)
  // Active total: 3 + 2 + 1 + 3 + 3 + 3 + 3 + 3 = 21 (12 Todo + 9 In Progress... wait, let's make 14 Todo and 9 In Progress)

  const tasksList = [
    // --- Rahul Sharma (3 active: 2 In Progress, 1 Todo; 1 overdue) ---
    {
      title: 'Fix payment API bug',
      description: 'Resolve edge-case timeout during stripe webhook checkout processing.',
      empId: 'EMP-001',
      dept: 'Development',
      priority: 'High',
      status: 'In Progress',
      startDays: -10,
      dueDays: -3, // Overdue 1
    },
    {
      title: 'Setup CI pipeline',
      description: 'Configure GitHub Actions workflow for automated backend testing and linting.',
      empId: 'EMP-001',
      dept: 'Development',
      priority: 'High',
      status: 'Todo',
      startDays: -1,
      dueDays: 10,
    },
    {
      title: 'Database indexing optimization',
      description: 'Analyze slow MongoDB queries and add compound indexes for search and filter performance.',
      empId: 'EMP-001',
      dept: 'Development',
      priority: 'Critical',
      status: 'In Progress',
      startDays: -4,
      dueDays: 5,
    },

    // --- Priya Patil (2 active: 1 In Progress, 1 Todo; 1 overdue) ---
    {
      title: 'Design mobile navigation flow',
      description: 'Create responsive drawer and bottom bar navigation components in Figma.',
      empId: 'EMP-002',
      dept: 'Design',
      priority: 'High',
      status: 'In Progress',
      startDays: -8,
      dueDays: -2, // Overdue 2
    },
    {
      title: 'Design system typography tokens',
      description: 'Audit and consolidate heading hierarchy and rem scaling tokens across the design library.',
      empId: 'EMP-002',
      dept: 'Design',
      priority: 'Medium',
      status: 'Todo',
      startDays: 1,
      dueDays: 7,
    },

    // --- Amit Joshi (1 active: 1 In Progress; 1 overdue) ---
    {
      title: 'API regression test suite',
      description: 'Automate comprehensive endpoint coverage and load testing for task filtering.',
      empId: 'EMP-003',
      dept: 'QA',
      priority: 'Critical',
      status: 'In Progress',
      startDays: -12,
      dueDays: -4, // Overdue 3
    },

    // --- Ananya Roy (3 active: 2 In Progress, 1 Todo; 1 overdue) ---
    {
      title: 'Implement Redis caching layer',
      description: 'Cache high-frequency dashboard aggregates and query results.',
      empId: 'EMP-006',
      dept: 'Development',
      priority: 'High',
      status: 'In Progress',
      startDays: -6,
      dueDays: -1, // Overdue 4
    },
    {
      title: 'Refactor CSV streaming pipeline',
      description: 'Stream large datasets directly to client with memory throttling.',
      empId: 'EMP-006',
      dept: 'Development',
      priority: 'Medium',
      status: 'In Progress',
      startDays: -2,
      dueDays: 6,
    },
    {
      title: 'API rate limiter setup',
      description: 'Introduce sliding window rate limiting for public endpoints.',
      empId: 'EMP-006',
      dept: 'Development',
      priority: 'Medium',
      status: 'Todo',
      startDays: 2,
      dueDays: 14,
    },

    // --- Rohan Mehta (3 active: 1 In Progress, 2 Todo; 1 overdue) ---
    {
      title: 'Create illustration pack for empty states',
      description: 'Design SVG empty state illustrations for task list and employee directory.',
      empId: 'EMP-007',
      dept: 'Design',
      priority: 'Low',
      status: 'In Progress',
      startDays: -9,
      dueDays: -5, // Overdue 5 (Total overdue = 5!)
    },
    {
      title: 'Social media banner guidelines',
      description: 'Standardize brand assets and template specifications.',
      empId: 'EMP-007',
      dept: 'Design',
      priority: 'Medium',
      status: 'Todo',
      startDays: 1,
      dueDays: 8,
    },
    {
      title: 'Dark mode contrast verification',
      description: 'Ensure WCAG AA compliance across all components in dark mode.',
      empId: 'EMP-007',
      dept: 'Design',
      priority: 'Low',
      status: 'Todo',
      startDays: 3,
      dueDays: 12,
    },

    // --- Sneha Verma (3 active: 1 In Progress, 2 Todo) ---
    {
      title: 'Q4 Performance Review schedule',
      description: 'Finalize dates and manager guidelines for upcoming quarter appraisal cycle.',
      empId: 'EMP-004',
      dept: 'HR',
      priority: 'Medium',
      status: 'In Progress',
      startDays: -3,
      dueDays: 10,
    },
    {
      title: 'Update onboarding employee checklist',
      description: 'Add security compliance and 2FA setup to initial welcome email.',
      empId: 'EMP-004',
      dept: 'HR',
      priority: 'Low',
      status: 'Todo',
      startDays: 1,
      dueDays: 15,
    },
    {
      title: 'Internal wellness workshop planning',
      description: 'Coordinate with mental health speakers for November session.',
      empId: 'EMP-004',
      dept: 'HR',
      priority: 'Low',
      status: 'Todo',
      startDays: 4,
      dueDays: 20,
    },

    // --- Vikram Singh (3 active: 1 In Progress, 2 Todo) ---
    {
      title: 'Enterprise Q4 Sales pitch deck',
      description: 'Update client success metrics and ROI case studies in the master deck.',
      empId: 'EMP-005',
      dept: 'Sales',
      priority: 'High',
      status: 'In Progress',
      startDays: -2,
      dueDays: 8,
    },
    {
      title: 'Client renewal follow-ups',
      description: 'Reach out to 15 tier-1 accounts with renewal terms.',
      empId: 'EMP-005',
      dept: 'Sales',
      priority: 'Critical',
      status: 'Todo',
      startDays: 1,
      dueDays: 5,
    },
    {
      title: 'CRM data cleanup',
      description: 'Deduplicate pipeline leads and update deal stages.',
      empId: 'EMP-005',
      dept: 'Sales',
      priority: 'Low',
      status: 'Todo',
      startDays: 5,
      dueDays: 18,
    },

    // --- Deepa Nair (2 active: 2 Todo) ---
    {
      title: 'Cross-browser compatibility testing',
      description: 'Validate layout rendering across Safari, Firefox, and Chrome on iOS and Android.',
      empId: 'EMP-008',
      dept: 'QA',
      priority: 'Medium',
      status: 'Todo',
      startDays: 1,
      dueDays: 10,
    },
    {
      title: 'Accessibility audit report',
      description: 'Audit screen reader landmarks and tab navigation on task forms.',
      empId: 'EMP-008',
      dept: 'QA',
      priority: 'Low',
      status: 'Todo',
      startDays: 2,
      dueDays: 12,
    },

    // Additional 3 Todo tasks distributed to reach exactly 14 Todo tasks
    // (Currently: 1 + 1 + 0 + 1 + 2 + 2 + 2 + 2 = 11 Todo tasks. Need 3 more Todo tasks!)
    // Let's give 1 Todo to Deepa Nair (making her 3 active), and 2 Todo to Sneha/Vikram or others
    {
      title: 'Load test export API',
      description: 'Verify server stability when exporting 10k task records simultaneously.',
      empId: 'EMP-008',
      dept: 'QA',
      priority: 'High',
      status: 'Todo',
      startDays: 4,
      dueDays: 14,
    },
    {
      title: 'Draft internship assessment criteria',
      description: 'Prepare rubrics for evaluating junior technical candidates.',
      empId: 'EMP-002',
      dept: 'Design',
      priority: 'Medium',
      status: 'Todo',
      startDays: 6,
      dueDays: 22,
    },
    {
      title: 'Prepare sales territory analysis',
      description: 'Map out regional targets for APAC expansion in 2027.',
      empId: 'EMP-003',
      dept: 'QA',
      priority: 'Medium',
      status: 'Todo',
      startDays: 7,
      dueDays: 25,
    },

    // --- COMPLETED TASKS (14 tasks) ---
    {
      title: 'Design login screen',
      description: 'Finalize OAuth and credentials auth screen layouts.',
      empId: 'EMP-002',
      dept: 'Design',
      priority: 'Medium',
      status: 'Completed',
      startDays: -20,
      dueDays: -5,
      completedDays: -6,
    },
    {
      title: 'Write test cases',
      description: 'Unit tests for date formatters and currency utilities.',
      empId: 'EMP-003',
      dept: 'QA',
      priority: 'Low',
      status: 'Completed',
      startDays: -25,
      dueDays: -10,
      completedDays: -12,
    },
    {
      title: 'Initial database schema design',
      description: 'Design Mongoose schemas and relationships.',
      empId: 'EMP-001',
      dept: 'Development',
      priority: 'High',
      status: 'Completed',
      startDays: -30,
      dueDays: -15,
      completedDays: -16,
    },
    {
      title: 'Configure CORS and Helmet',
      description: 'Secure API headers and origin allowlists.',
      empId: 'EMP-006',
      dept: 'Development',
      priority: 'Medium',
      status: 'Completed',
      startDays: -22,
      dueDays: -12,
      completedDays: -14,
    },
    {
      title: 'HR policy handbook update',
      description: 'Incorporate remote work guidelines for 2026.',
      empId: 'EMP-004',
      dept: 'HR',
      priority: 'Low',
      status: 'Completed',
      startDays: -40,
      dueDays: -20,
      completedDays: -22,
    },
    {
      title: 'Q3 Sales quota review',
      description: 'Compile revenue summaries by product line.',
      empId: 'EMP-005',
      dept: 'Sales',
      priority: 'Critical',
      status: 'Completed',
      startDays: -35,
      dueDays: -15,
      completedDays: -15,
    },
    {
      title: 'Create SVG icon set',
      description: 'Custom feather icon bundle for task statuses.',
      empId: 'EMP-007',
      dept: 'Design',
      priority: 'Low',
      status: 'Completed',
      startDays: -28,
      dueDays: -14,
      completedDays: -15,
    },
    {
      title: 'Smoke testing staging deployment',
      description: 'Perform end-to-end sanity verification on staging.',
      empId: 'EMP-008',
      dept: 'QA',
      priority: 'High',
      status: 'Completed',
      startDays: -18,
      dueDays: -8,
      completedDays: -9,
    },
    {
      title: 'Setup ESLint and Prettier configs',
      description: 'Enforce code quality standards across backend and frontend repos.',
      empId: 'EMP-001',
      dept: 'Development',
      priority: 'Medium',
      status: 'Completed',
      startDays: -45,
      dueDays: -35,
      completedDays: -36,
    },
    {
      title: 'Benchmark MongoDB aggregation pipeline',
      description: 'Evaluate index usage on $facet dashboard queries.',
      empId: 'EMP-006',
      dept: 'Development',
      priority: 'Critical',
      status: 'Completed',
      startDays: -24,
      dueDays: -10,
      completedDays: -11,
    },
    {
      title: 'Design error alert modals',
      description: 'Create responsive modals for server business rule error responses.',
      empId: 'EMP-002',
      dept: 'Design',
      priority: 'High',
      status: 'Completed',
      startDays: -16,
      dueDays: -4,
      completedDays: -5,
    },
    {
      title: 'Draft annual benefits package',
      description: 'Review healthcare provider quotes and coverage tiers.',
      empId: 'EMP-004',
      dept: 'HR',
      priority: 'Medium',
      status: 'Completed',
      startDays: -50,
      dueDays: -30,
      completedDays: -31,
    },
    {
      title: 'Lead qualification playbook',
      description: 'Standardize inbound SDR qualification scripts.',
      empId: 'EMP-005',
      dept: 'Sales',
      priority: 'Low',
      status: 'Completed',
      startDays: -40,
      dueDays: -25,
      completedDays: -26,
    },
    {
      title: 'Audit third-party dependencies',
      description: 'Run npm audit and update deprecated utility packages.',
      empId: 'EMP-003',
      dept: 'QA',
      priority: 'Medium',
      status: 'Completed',
      startDays: -32,
      dueDays: -18,
      completedDays: -19,
    },

    // --- CANCELLED TASKS (3 tasks) ---
    {
      title: 'Update landing page',
      description: 'Legacy marketing landing page overhaul (cancelled in favor of new redesign).',
      empId: 'EMP-002',
      dept: 'Design',
      priority: 'Critical',
      status: 'Cancelled',
      startDays: -30,
      dueDays: -10,
    },
    {
      title: 'Deprecated XML export API',
      description: 'XML export deprecated in favor of CSV standard.',
      empId: 'EMP-001',
      dept: 'Development',
      priority: 'Low',
      status: 'Cancelled',
      startDays: -40,
      dueDays: -20,
    },
    {
      title: 'Legacy Cold Call Campaign',
      description: 'Shifted focus to inbound content and webinars.',
      empId: 'EMP-005',
      dept: 'Sales',
      priority: 'Medium',
      status: 'Cancelled',
      startDays: -35,
      dueDays: -15,
    },
  ];

  console.log(`[Seed] Processing ${tasksList.length} total tasks...`);

  let count = 0;
  for (const t of tasksList) {
    count++;
    const emp = empMap[t.empId];
    if (!emp) {
      console.error(`Employee ${t.empId} not found`);
      continue;
    }

    const taskId = `TSK-${String(count).padStart(3, '0')}`;
    const startDate = relDate(t.startDays);
    const dueDate = relDate(t.dueDays);
    const createdDate = relDate(t.startDays - 1);
    const completedDate = t.completedDays ? relDate(t.completedDays) : null;

    const taskDoc = new Task({
      taskId,
      title: t.title,
      description: t.description,
      assignedEmployee: emp._id,
      assignedEmployeeSnapshot: {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department,
      },
      department: t.dept,
      priority: t.priority,
      status: t.status,
      startDate,
      dueDate,
      createdDate,
      completedDate,
    });

    await taskDoc.save();
  }

  // Update Counter sequence to current count
  await Counter.findOneAndUpdate({ id: 'taskId' }, { seq: count }, { upsert: true });

  // Update accurate active task counts on each employee
  for (const emp of createdEmployees) {
    const activeTasks = await Task.countDocuments({
      assignedEmployee: emp._id,
      status: { $in: ['Todo', 'In Progress'] },
    });
    emp.activeTaskCount = activeTasks;
    await emp.save();
  }

  console.log('[Seed] Seeding completed successfully!');
  const finalTaskCount = await Task.countDocuments();
  const todoCount = await Task.countDocuments({ status: 'Todo' });
  const inProgressCount = await Task.countDocuments({ status: 'In Progress' });
  const completedCount = await Task.countDocuments({ status: 'Completed' });
  const cancelledCount = await Task.countDocuments({ status: 'Cancelled' });
  
  // Overdue count:
  const overdueCount = await Task.countDocuments({
    status: { $in: ['Todo', 'In Progress'] },
    dueDate: { $lt: new Date() },
  });

  console.log(`[Seed Summary] Total Tasks: ${finalTaskCount} (Todo: ${todoCount}, In Progress: ${inProgressCount}, Completed: ${completedCount}, Cancelled: ${cancelledCount}, Overdue: ${overdueCount})`);
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seedData.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]', err);
      process.exit(1);
    }
  })();
}
