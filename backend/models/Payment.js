// backend/models/Payment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: String, required: true },
    yookassaPaymentId: { type: String, unique: true, sparse: true, index: true }, // ID платежа от ЮKassa
    status: { type: String, enum: ['pending', 'succeeded', 'canceled'], default: 'pending', required: true },
    amount: { type: String, required: true },
    currency: { type: String, default: 'RUB' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);