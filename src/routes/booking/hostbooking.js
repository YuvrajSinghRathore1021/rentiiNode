const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');


// Get all bookings for a host with property details
router.get('/host-bookings', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT b.booking_id, b.property_id, b.check_in_date, b.check_out_date, 
                   b.total_price, b.status, b.guests_count, b.created_at, 
                   p.title AS property_title, p.description AS property_description,
                   pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            JOIN property_addresses pa ON p.address_id = pa.address_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (status) {
            query += " AND b.status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [bookings] = await db.promise().query(query, queryParams);

        if (bookings.length === 0) {
            return res.status(200).json({ status: false, message: "No bookings found" });
        }

        let countQuery = `
            SELECT COUNT(b.booking_id) as total
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (status) {
            countQuery += " AND b.status = ?";
            countParams.push(status);
        }
        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: bookings,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host bookings error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



// not tested 
router.get("/host/view", async (req, res) => {
    const { propertyId, startDate, endDate } = req.query;

    if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ status: false, message: "propertyId, startDate, and endDate are required" });
    }

    try {
        const [properties] = await db.promise().query(
            `SELECT price_per_night FROM properties WHERE property_id = ?`,
            [propertyId]
        );

        if (properties.length === 0) {
            return res.status(404).json({ status: false, message: "Property not found" });
        }

        const basePrice = properties[0].price_per_night;

        // Fetch availability with time slots
        const [availability] = await db.promise().query(
            `SELECT date, start_time, end_time, is_available, price, discount FROM property_availability
             WHERE property_id = ? AND date BETWEEN ? AND ?`, [propertyId, startDate, endDate]
        );

        // Fetch confirmed bookings (to block those slots)
        const [bookings] = await db.promise().query(
            `SELECT check_in_date, check_out_date, check_in_time, check_out_time FROM bookings WHERE property_id = ? 
             AND status = 'confirmed' AND check_in_date <= ? AND check_out_date >= ?`,
            [propertyId, endDate, startDate]
        );

        const calendar = availability.map(slot => {
            let finalPrice = slot.price ?? basePrice;

            if (slot.discount) {
                finalPrice = finalPrice - (finalPrice * (slot.discount / 100));
            }

            // check if slot conflicts with a booking
            const isBooked = bookings.some(b => {
                const sameDay = b.check_in_date <= slot.date && b.check_out_date >= slot.date;
                if (!sameDay) return false;

                if (!b.check_in_time || !slot.start_time) {
                    return true; // whole day booking
                }
                return (
                    (slot.start_time >= b.check_in_time && slot.start_time < b.check_out_time) ||
                    (slot.end_time > b.check_in_time && slot.end_time <= b.check_out_time)
                );
            });

            return {
                date: slot.date,
                startTime: slot.start_time,
                endTime: slot.end_time,
                isAvailable: slot.is_available && !isBooked,
                finalPrice
            };
        });

        res.json({ status: true, propertyId, calendar });
    } catch (err) {
        console.error("Get calendar error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Export the router
module.exports = router;
