const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

const multer = require("multer");
const path = require("path");

router.get("/personalInformation", async (req, res) => {
    const userId = req.user.user_id;

    try {
        let query = `SELECT legal_name as legalName,name as preferredFirstName,email,phone_number as phoneNumber,email,emergency_contact as emergencyContact,alternate_address as mailingAddress,primary_address as residentialAddress  FROM users WHERE user_id =?`;
        const queryParams = [userId];

        const [user] = await db.promise().query(query, queryParams);
        if (user.length === 0) {
            return res.status(200).json({ status: false, message: "Property not found" });
        }
        res.json({ status: true, data: user });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



router.post('/personalInformationEdit', async (req, res) => {
    const userId = req.user.user_id;
    const { legalName, preferredFirstName, phoneNumber, email, residentialAddress, mailingAddress, emergencyContact } = req.body;

    try {
        let updateQuery = "";
        let updateValue = [];

        updateQuery = `UPDATE users SET legal_name=?,name=?,phone_number=?,email=?,primary_address=?,alternate_address=?,emergency_contact=? WHERE user_id = ?`;
        updateValue = [legalName, preferredFirstName, phoneNumber, email, residentialAddress, mailingAddress, emergencyContact, userId];

        let result = "";
        if (updateQuery) {
            result = await db.promise().query(updateQuery, updateValue);
        }
        if (result.affectedRows === 0) {
            return res.status(200).json({ status: false, message: "Property not found" });
        }
        res.json({ status: true, message: "Property updated successfully" });
    } catch (err) {
        console.error("Edit property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// // // // // // // // Profile Uplode Image 

// configure upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/profile/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

router.post("/profileUpload", upload.single("profile"), async (req, res) => {
    const userId = req.user.user_id;
    const filePath = `/uploads/profile/${req.file.filename}`;
    try {
        await db.promise().query("UPDATE users SET profile_picture_url = ? WHERE user_id = ?", [filePath, userId]);
        res.json({ status: true, message: "Profile image uploaded", image: filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "Upload failed" });
    }

});



// //////user_additional_info

router.post('/userProfileEdit', async (req, res) => {
    const userId = req.user.user_id;
    const { info_key, info_value } = req.body;

    try {
        // Check if record exists
        const [rows] = await db.promise().query(
            "SELECT id FROM user_additional_info WHERE user_id = ? AND info_key = ?",
            [userId, info_key]
        );

        let query, values;
        if (rows.length > 0) {
            // Update existing
            query = `UPDATE user_additional_info SET info_value = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND info_key = ?`;
            values = [info_value, userId, info_key];
        } else {
            // Insert new
            query = `INSERT INTO user_additional_info (user_id, info_key, info_value) VALUES (?, ?, ?)`;
            values = [userId, info_key, info_value];
        }
        const [result] = await db.promise().query(query, values);
        res.json({ status: true, message: "Property saved successfully" });
    } catch (err) {
        console.error("Add/Edit property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


router.post('/userProfileView', async (req, res) => {
    const userId = req.user.user_id;
    const { info_key } = req.body;

    try {
        let query = `SELECT id, user_id, info_key, info_value, created_at, updated_at FROM user_additional_info WHERE user_id =? and info_key=?`;
        const queryParams = [userId, info_key];
        const [user] = await db.promise().query(query, queryParams);

        if (user.length === 0) {
            return res.status(200).json({ status: false, message: "Not found" });
        }

        let newdata = [{
            info_key: user[0]?.info_key || "",
            info_value: user[0]?.info_value || ""
        }]

        res.json({ status: true, data: newdata });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


router.get("/profileView", async (req, res) => {
    const userId = req.user.user_id;
    try {
        const [user] = await db.promise().query("SELECT user_id, name, email, phone_number, profile_picture_url, about FROM users WHERE user_id = ?", [userId]);
        if (user.length === 0) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        res.json({ status: true, data: user[0] });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



router.post("/removeProfile", async (req, res) => {
    const userId = req.user.user_id;

    try {
        await db.promise().query("UPDATE users SET profile_picture_url = ? WHERE user_id = ?", ["", userId]);
        res.json({ status: true, message: "Profile image uploaded" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "failed" });
    }

});
// Export the router
module.exports = router;