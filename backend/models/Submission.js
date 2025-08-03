// backend/models/Submission.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
    // --- ИЗМЕНЕНИЕ: Добавляем новый тип 'BanAppeal' ---
    entityType: { type: String, enum: ['Artist', 'Album', 'Track', 'BanAppeal'], required: true }, 
    entityId: { type: Schema.Types.ObjectId }, 
    action: { type: String, enum: ['create', 'edit', 'appeal'], required: true }, // Добавляем 'appeal'
    data: { type: Schema.Types.Mixed, required: true }, 
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);