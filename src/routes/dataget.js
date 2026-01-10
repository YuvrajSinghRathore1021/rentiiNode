const express = require('express');
const router = express.Router();
const db = require('../../db/ConnectionSql');

router.get("/get", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = "SELECT user_id, name, email, phone_number, profile_picture_url, about,status FROM users WHERE 1=1 ";
        const queryParams = [];

        if (status) {
            query += " AND status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY user_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [user] = await db.promise().query(query, queryParams);
        if (user.length === 0) {
            return res.status(200).json({ status: false, message: "User not found" });
        }
        let queryCount = "SELECT COUNT(user_id) as total FROM users WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const [userCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: user, total: userCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


router.post("/toggle-status", async (req, res) => {
    const userId = req.user.user_id;
    const { status, id } = req.body;

    try {
        let Query = '';
        let data = [];
        if (status) {
            Query = "UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?";
            data = [status, id];
        } else {
            return res.status(400).json({ status: false, message: "Invalid status" });
        }
        await db.promise().query(Query, data);

        res.json({ status: true, message: "Status updated successfully" });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// dashboard 

router.get("/metrics", async (req, res) => {
  try {
    // example queries (change table names as per your DB)
   
    const [bookings] = await db.promise().query( `SELECT COUNT(*) AS total_bookings FROM bookings`);
    const [users] = await db.promise().query(`SELECT COUNT(*) AS total_users FROM users`);


    res.json({
      status: true,
      data: {
        users: users[0]?.total_users || 0,
        bookings: bookings[0]?.total_bookings || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Something went wrong",
    });
  }
});


// Export the router
module.exports = router;