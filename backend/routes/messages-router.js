// backend/routes/messages-router.js
const express = require('express');
const router = express.Router();
const messagesMain = require('./messages/messages-main');
const messagesConversations = require('./messages/messages-conversations');
const messagesActions = require('./messages/messages-actions');
const messagesManagement = require('./messages/messages-management'); 
const messagesSearch = require('./messages/messages-search');
const messagesStatusUpdates = require('./messages/messages-status-updates'); 
const messagesData = require('./messages/messages-data');

router.use('/conversations', messagesManagement);     // Handles /conversations/:id/pin, /mute, etc. и DELETE /conversations/:id
router.use('/conversations', messagesSearch);         // Handles /conversations/:id/search
router.use('/conversations', messagesData);
router.use('/conversations', messagesConversations);  // Handles GET /conversations, GET /conversations/with/:id, GET /conversations/:id/messages

router.use('/', messagesStatusUpdates); // Handles POST /read, POST /unread
router.use('/', messagesActions);       // Handles POST /:messageId/react, POST /forward, DELETE /
router.use('/', messagesMain);          // Handles POST /, GET /:messageId, PUT /:messageId

module.exports = router;