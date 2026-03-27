const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const homeRoutes = require('./homeRoutes');
const profile = require('./profile');
const loginRoutes = require('./login');
const upload = require('./upload-profile');
const uploaddata = require('./uploadFunclity/upload');
const DataGet = require('./dataget');
const propertyRoutes = require('./property');
const dashboardRoutes = require('./dashboard/dashboard');
// // on-bording 
const propartybording = require('./bording/propartybording');
const host = require('./bording/host');

// // property user
const propartyuser = require('./bording/propartyuser');
const razorpay = require('./payment/razorpay');

// Profile
const Profile = require('./profile/Profile');

////Calendar Management
const Calendar = require('./calendarmanagement/Calendar');

/////// booking
const Booking = require('./booking/booking');
const Document = require('./document/document');

//  // broker
const Broker = require('./broker/broker');

//////---------url routes ---------//////
router.use('/home', homeRoutes);
router.use('/dashboard', authenticateToken, dashboardRoutes);
router.use('/profile', authenticateToken, profile);
router.use('/profile', authenticateToken, Profile);
router.use('/upload', authenticateToken, upload);
router.use('/uploadFile', uploaddata);
router.use('/data', authenticateToken, DataGet);
router.use('/property', authenticateToken, propertyRoutes);
router.use("/user", loginRoutes);
router.use('/onBoarding', authenticateToken, propartybording);
router.use('/host', authenticateToken, host);
router.use('/userProparty', optionalAuth, propartyuser);
router.use('/razorpay', authenticateToken, razorpay);
router.use('/calendarManagement', authenticateToken, Calendar);
router.use('/booking', authenticateToken, Booking);
router.use('/document', authenticateToken, Document);
// broker
router.use('/Broker', authenticateToken, Broker);
module.exports = router;
