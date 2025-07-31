const express = require('express');
const router = express.Router();
const db = require('../../db/ConnectionSql');


router.get("/viewProperty", async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;

    try {
        let query = "SELECT property_id, host_id, title, description, property_type, room_type, max_guests, bedrooms, beds, bathrooms, price_per_night, cleaning_fee, address_id, latitude, longitude, is_active, created_at, updated_at  FROM properties WHERE 1=1";
        const queryParams = [];

        if (search) {

            query += " AND (title LIKE ? OR description LIKE ?)";
            const searchPattern = `%${search}%`;

            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY property_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [user] = await db.promise().query(query, queryParams);
        if (user.length === 0) {
            return res.status(200).json({ status: false, message: "Property not found" });
        }
        res.json({ status: true, data: user, page: parseInt(page), limit: parseInt(limit) });

    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }

});


// Export the router
module.exports = router;