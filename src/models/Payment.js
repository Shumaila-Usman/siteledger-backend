const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    paymentType: {
      type: String,
      enum: ['incoming_client_payment', 'outgoing_payment'],
      required: true,
    },
    category: { type: String, trim: true },
    categoryEntityId: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryEntity' },
    clientName: { type: String, trim: true },
    title: { type: String, trim: true },
    projectName: { type: String, trim: true },
    totalAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    lastPaymentAdvance: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Raast', 'Easypaisa', 'JazzCash', 'Cheque', 'Card', 'Other'],
    },
    paymentDate: { type: Date, default: Date.now },
    paidBy: { type: String, trim: true },
    paidTo: { type: String, trim: true },
    approvedBy: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Paid', 'Partial', 'Pending'],
      default: 'Pending',
    },
    receiptUrl: { type: String },
    receiptFileName: { type: String },
    receiptMimeType: { type: String },
    receiptPublicId: { type: String },
    notes: { type: String },
    createdByName: { type: String, trim: true },
    createdByEmail: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.pre('save', function (next) {
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);
  this.advanceAmount = Math.max(0, this.paidAmount - this.totalAmount);
  if (this.paidAmount <= 0) this.status = 'Pending';
  else if (this.paidAmount >= this.totalAmount) this.status = 'Paid';
  else this.status = 'Partial';
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
