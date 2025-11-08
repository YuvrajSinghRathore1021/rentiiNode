const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const homeRoutes = require('./homeRoutes');
const profile = require('./profile');
const loginRoutes = require('./login');
const upload = require('./upload-profile');
const DataGet = require('./dataget');
const notification = require('../notification/notification');
const propertyRoutes = require('./property');
// // on-bording 
const propartybording = require('./bording/propartybording');
const host = require('./bording/host');

// // property user
const propartyuser = require('./bording/propartyuser');

// Profile
const Profile = require('./profile/Profile');

////Calendar Management
const Calendar = require('./calendarmanagement/Calendar');

/////// booking
const Booking = require('./booking/booking');

//////---------url routes ---------//////
router.use('/home', homeRoutes);
router.use('/profile', authenticateToken, profile);
router.use('/upload', authenticateToken, upload);
router.use('/data', authenticateToken, DataGet);
router.use('/property', authenticateToken, propertyRoutes);

// // notification.js
// // router.use('/property', authenticateToken, propertyRoutes);
router.use('/notification', authenticateToken, notification);
router.use("/user", loginRoutes);

router.use('/onBording', authenticateToken, propartybording);
router.use('/host', authenticateToken, host);
router.use('/userProparty', authenticateToken, propartyuser);

router.use('/profile', authenticateToken, Profile);
router.use('/calendarManagement', authenticateToken, Calendar);
router.use('/booking', authenticateToken, Booking);

module.exports = router;
