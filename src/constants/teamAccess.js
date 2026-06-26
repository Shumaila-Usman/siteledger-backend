const TEAM_ACCESS_LEVELS = {
  client_view: {
    label: 'As a client (just view)',
    role: 'Viewer',
    canViewReports: true,
    canAddExpense: false,
    canAddPayment: false,
    canApprove: false,
  },
  add_expense: {
    label: 'Just add expense',
    role: 'Site Engineer',
    canViewReports: true,
    canAddExpense: true,
    canAddPayment: false,
    canApprove: false,
  },
  can_payment: {
    label: 'Can do payment',
    role: 'Accountant',
    canViewReports: true,
    canAddExpense: true,
    canAddPayment: true,
    canApprove: false,
  },
  full_access: {
    label: 'Full access',
    role: 'Manager',
    canViewReports: true,
    canAddExpense: true,
    canAddPayment: true,
    canApprove: true,
  },
};

const isValidAccessLevel = (level) => Boolean(level && TEAM_ACCESS_LEVELS[level]);

module.exports = { TEAM_ACCESS_LEVELS, isValidAccessLevel };
