// backend/models/Submission.js --- НОВЫЙ ФАЙЛ ---

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
    // На что подана заявка: Artist, Album или Track
    entityType: { type: String, enum: ['Artist', 'Album', 'Track'], required: true }, 
    // ID сущности, если это редактирование
    entityId: { type: Schema.Types.ObjectId }, 
    // Что делаем: создаем или редактируем
    action: { type: String, enum: ['create', 'edit'], required: true },
    // Предложенные данные
    data: { type: Schema.Types.Mixed, required: true }, 
    
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);