const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

// // propartybording.js

router.get("/user", async (req, res) => {
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





// Export the router
module.exports = router;