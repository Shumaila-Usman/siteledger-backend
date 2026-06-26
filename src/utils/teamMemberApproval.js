const isAdminApprovalRequested = (approvedBy) =>
  typeof approvedBy === 'string' && approvedBy.trim().toLowerCase().includes('admin');

const resolveApprovalStatus = (approvedBy) => {
  const value = approvedBy?.trim() || '';
  if (!value) return 'none';
  if (isAdminApprovalRequested(value)) return 'pending_admin';
  return 'approved';
};

module.exports = { isAdminApprovalRequested, resolveApprovalStatus };
