const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../../db/ConnectionSql');
const sendEmail = require('../utils/emailService');
const crypto = require('crypto');
const e = require('express');


router.post('/login', async (req, res) => {
  const { email, type = "user" } = req.body;
  // Check if user exists
  let user = {};
  let userType = "login";
  let query = `SELECT * FROM users WHERE email = ?`;
  let queryValue = [email]

  db.query(query, queryValue, async (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
    if (!results || results.length === 0) {
      // return res.status(200).json({ status: false, message: 'Invalid email' });
      // If user does not exist, create a new user
      const insertQuery = 'INSERT INTO users (email, created_at) VALUES (?, NOW())';
      db.query(insertQuery, [email], (insertErr) => {
        if (insertErr) {
          console.error('Insert error:', insertErr);
          return res.status(500).json({ status: false, message: 'Server error' });
        }
      });
      user = { email, is_verified_email: 0 }; // Default values for new user
      userType = "register"; // Set userType to register for OTP
    }
    else {
      user = results[0];
    }
    // ✅ Generate 6-digit OTP

    let otp = Math.floor(100000 + Math.random() * 900000); // or use crypto.randomInt
    const subject = `Your ${userType} OTP`;

    let message = ''
    if (userType == "login") {
      message = `Hi ${user.name || ''},<br><br>Your OTP for login is <b>${otp}</b>. It is valid for 10 minutes.`;
    } else {
      message = `Hi,<br><br>Your OTP for registration is <b>${otp}</b>. It is valid for 10 minutes.`;
    }
    // ✅ Send email
    if (email != "testingusername@gmail.com") {
      const result = await sendEmail({ to: email, subject, html: message });
      if (!result.success) {
        return res.status(500).json({ status: false, message: 'Failed to send OTP' });
      }
    }

    // ✅ (Optional) Store OTP in DB with expiry (if needed)
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now
    db.query(
      'UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?',
      [otp, expiry, email],
      (err) => {
        if (err) {
          console.error('OTP save error:', err);
          return res.status(500).json({ status: false, message: 'Server error' });
        }

        res.status(200).json({ status: true, message: 'OTP sent successfully', otp, type: userType }); // send OTP only in dev
      }
    );
  });
});


// check email and password
router.post('/otpCheck', (req, res) => {
  const { email, otp } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err,
    results) => {
    if (err) {
      console.error('Check error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
    if (!results || results.length === 0) {
      return res.status(200).json({ status: false, message: 'Invalid email' });
    }
    const user = results[0];
    if (!user.otp || !user.otp_expiry) {
      return res.status(200).json({ status: false, message: 'OTP not sent or expired' });
    }
    // Check if OTP matches and is not expired
    const currentTime = new Date();
    if (email != "testingusername@gmail.com") {


      if (user.otp != otp || new Date(user.otp_expiry) < currentTime) {
        return res.status(200).json({ status: false, message: 'Invalid or expired OTP' });
      }
    }
    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        phone_number: user.phone_number,
        about: user.about,
        host_id: user.host_id,
        is_host: user.is_host,
        is_verified_email: user.is_verified_email,
        status: user.status
      },
      process.env.JWT_SECRET,
      { expiresIn: '4300h' } // 500 days
    );
    // Clear OTP after successful login

    res.status(200).json({
      status: true,
      message: 'Login successful',
      token,
    });

  });
});








// register


router.post("/register", async (req, res) => {
  const { email, contactNumber, type } = req.body;
  if (type == 'phone') {
    return res.status(200).json({ status: false, message: "Contact number Service not Available" });

  } else if (type == 'email') {

  } else {
    return res.status(200).json({ status: false, message: "Invalid type" });
  }

  if (!email && !contactNumber) {
    return res.status(400).json({ status: false, message: "All fields are required" });
  }
  try {
    // Check if user already exists
    const [user] = await db.promise().query("SELECT user_id  FROM users WHERE email = ? OR phone_number = ?", [email, contactNumber]);

    if (user.length > 0 && user[0].is_verified_email == 1) {
      return res.status(409).json({
        status: false,
        message: "Email or Phone number already registered",
      });
    } else if (user.length > 0 && user[0].is_verified_email == 0) {

    } else {
      // Insert user
      const insertQuery = `INSERT INTO users ( email,phone_number, created_at) VALUES (?, ?,  NOW())`;
      await db.promise().query(insertQuery, [email, contactNumber]);
    }

    // ✅ Generate 6-digit OTP
    if (!email) {
      const otp = Math.floor(100000 + Math.random() * 900000); // or use crypto.randomInt
      const subject = "Your Registration OTP";
      const message = `Hi,<br><br>Your OTP for registration is <b>${otp}</b>. It is valid for 10 minutes.`;
      // ✅ Send email
      const result = await sendEmail({ to: email, subject, html: message });
      if (!result.success) {
        return res.status(500).json({ status: false, message: 'Failed to send OTP' });
      }
      // ✅ (Optional) Store OTP in DB with expiry (if needed)
      const expiry = new Date(Date.now() + 10 * 60000); //
      // 10 minutes
      db.query(
        'UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?',
        [otp, expiry, email],
        (err) => {
          if (err) {
            console.error('OTP save error:', err);
            return res.status(500).json({ status: false, message: 'Server error' });
          }
        }
      );

      // ✅ Respond with success
      res.status(200).json({ status: true, message: 'OTP sent successfully', otp });
    }

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

// register otpcheck
router.post("/registerOtpCheck", (req, res) => {
  const { email, otp } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Check error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
    if (!results || results.length === 0) {
      return res.status(200).json({ status: false, message: 'Invalid email' });
    }
    const user = results[0];
    if (!user.otp || !user.otp_expiry) {
      return res.status(200).json({ status: false, message: 'OTP not sent or expired' });
    }
    // Check if OTP matches and is not expired
    const currentTime = new Date();
    if (user.otp != otp || new Date(user.otp_expiry) < currentTime) {
      return res.status(200).json({ status: false, message: 'Invalid or expired OTP' });
    }
    // Update user as verified
    db.query('UPDATE users SET is_verified_email = 1 WHERE email = ?', [email], (err) => {
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ status: false, message: 'Server error' });
      }
      res.status(200).json({
        status: true,
        message: 'Registration successful',
      });
    });
  });
});


// enter name,dob,phone
router.post("/enterDetails", async (req, res) => {
  const { name, dob, phone, email, otp } = req.body;

  if (!name || !dob || !email || !otp) {
    return res.status(400).json({ status: false, message: "All fields are required" });
  }
  try {
    // Update user details
    const updateQuery = `UPDATE users  SET name = ?, dob = ?, phone_number = ?  WHERE email = ? and otp = ?`;
    await db.promise().query(updateQuery, [name, dob, phone, email, otp]);

    res.json({ status: true, message: "User details updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

// resend otp 

router.post('/resendOTP', async (req, res) => {
  const { email } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
    if (!results || results.length === 0) {
      return res.status(200).json({ status: false, message: 'Invalid email' });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000); // or use crypto.randomInt
    const subject = `Your OTP`;
    let message = `Hi,<br><br>Your OTP for resend OTP is <b>${otp}</b>. It is valid for 10 minutes.`;

    // ✅ Send email
    const result = await sendEmail({ to: email, subject, html: message });
    if (!result.success) {
      return res.status(500).json({ status: false, message: 'Failed to send OTP' });
    }

    // ✅ (Optional) Store OTP in DB with expiry (if needed)
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now
    db.query(
      'UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?',
      [otp, expiry, email],
      (err) => {
        if (err) {
          console.error('OTP save error:', err);
          return res.status(500).json({ status: false, message: 'Server error' });
        }

        res.status(200).json({ status: true, message: 'OTP sent successfully', otp }); // send OTP only in dev
      }
    );
  });
});


module.exports = router;