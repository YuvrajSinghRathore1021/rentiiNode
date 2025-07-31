const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const homeRoutes = require('./homeRoutes');
const profile = require('./profile');
const loginRoutes = require('./login');
const upload = require('./upload-profile');
const DataGet = require('./dataget');
const notificationRoutes = require('./notificationRoutes');
const propertyRoutes = require('./property');

router.use('/home', homeRoutes);
router.use('/profile', authenticateToken, profile);
router.use('/upload', authenticateToken, upload);
router.use('/data', authenticateToken, DataGet);
router.use('/property', authenticateToken, propertyRoutes);

router.use("/user", loginRoutes);
module.exports = router;
