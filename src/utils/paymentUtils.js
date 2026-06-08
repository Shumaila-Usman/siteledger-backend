const computePaymentFields = (totalAmount, paidAmount) => {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  if (paid > total) {
    const err = new Error('Paid amount cannot exceed total amount');
    err.statusCode = 400;
    throw err;
  }
  const remainingAmount = Math.max(0, total - paid);
  let status = 'Pending';
  if (paid <= 0) status = 'Pending';
  else if (paid >= total) status = 'Paid';
  else status = 'Partial';
  return { totalAmount: total, paidAmount: paid, remainingAmount, status };
};

module.exports = { computePaymentFields };
