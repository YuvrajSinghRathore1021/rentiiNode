const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

//// user book property 

/**
 * User books a property
 * Method: POST
 * Body Params:
 *  propertyId (required)
 *  userId (required → in real apps from auth token)
 *  checkInDate (required, YYYY-MM-DD)
 *  checkOutDate (required, YYYY-MM-DD)
 *  checkInTime (optional, HH:mm:ss)
 *  checkOutTime (optional, HH:mm:ss)
 *  guestsCount (optional, default 1)
 */

router.post("/book", async (req, res) => {
    const userId = req.user.user_id;
    const { propertyId, checkInDate, checkOutDate, checkInTime, checkOutTime, guestsCount } = req.body;

    if (!propertyId || !userId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ status: false, message: "propertyId, userId, checkInDate, and checkOutDate are required" });
    }

    try {
        // 1. Check property exists
        const [propertyRows] = await db.promise().query(
            `SELECT price_per_night FROM properties WHERE property_id = ? AND is_active = 1`, [propertyId]
        );

        if (propertyRows.length === 0) {
            return res.status(404).json({ status: false, message: "Property not found or inactive" });
        }

        const basePrice = propertyRows[0].price_per_night;

        // 2. Check for conflicting bookings
        const [bookings] = await db.promise().query(
            `SELECT booking_id FROM bookings WHERE property_id = ? AND status = 'confirmed' AND 
            ((check_in_date <= ? AND check_out_date >= ?) OR (check_in_date < ? AND check_out_date >= ?))`,
            [propertyId, checkOutDate, checkInDate, checkOutDate, checkOutDate]
        );

        if (bookings.length > 0) {
            return res.status(409).json({ status: false, message: "Property not available for selected dates" });
        }
        // 3. Calculate price from availability overrides
        const [availability] = await db.promise().query(
            `SELECT date, price, discount FROM property_availability WHERE property_id = ? AND date 
            BETWEEN ? AND ?`, [propertyId, checkInDate, checkOutDate]
        );

        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);
        let totalPrice = 0;

        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split("T")[0];
            const override = availability.find(a => a.date.toISOString().split("T")[0] === dateStr);

            let price = basePrice;
            if (override && override.price !== null) {
                price = override.price;
            }
            if (override && override.discount) {
                price = price - (price * (override.discount / 100));
            }
            totalPrice += price;
        }



        // 4. Insert booking (pending confirmation until payment)
        const [result] = await db.promise().query(
            `INSERT INTO bookings 
             (property_id, guest_id, check_in_date, check_out_date, check_in_time, check_out_time, guests_count, total_price, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, '0')`,
            [propertyId, userId, checkInDate, checkOutDate, checkInTime ?? null, checkOutTime ?? null, guestsCount ?? 1, totalPrice]
        );

        res.json({
            status: true,
            message: "Booking created successfully",
            bookingId: result.insertId,
            totalPrice
        });
    } catch (err) {
        console.error("Book property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

/////// booking price calculation

router.post("/calculate", async (req, res) => {
    const { propertyId, checkInDate, checkInTime, checkOutDate, checkOutTime, guestsCount } = req.body;

    if (!propertyId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ status: false, message: "propertyId, checkInDate, and checkOutDate are required" });
    }

    try {
        // 1. Get base property info
        const [properties] = await db.promise().query(
            `SELECT price_per_night, weekend_price, weekday_price, cleaning_fee FROM properties 
             WHERE property_id = ? AND is_active = 1`, [propertyId]
        );
        // console.log("properties", properties);
        if (properties.length == 0) {
            return res.status(404).json({ status: false, message: "Property not found or inactive" });
        }

        const { price_per_night, weekend_price, weekday_price, cleaning_fee } = properties[0];

        // 2. Get availability overrides in date range
        const [availability] = await db.promise().query(
            `SELECT date, price, discount, is_available FROM property_availability WHERE property_id = ? 
            AND date BETWEEN ? AND ?`, [propertyId, checkInDate, checkOutDate]
        );

        // 3. Loop over each night
        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);

        let nights = [];
        let totalPrice = 0;

        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split("T")[0];
            const dayOfWeek = d.getDay();
            let basePrice = Number(price_per_night);

            // Weekend pricing logic
            if (dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5) {
                basePrice = Number(weekend_price) || Number(price_per_night);
            } else {
                basePrice = Number(price_per_night) || Number(weekday_price);
            }

            // Check if override exists
            const override = availability.find(a => a.date.toISOString().split("T")[0] === dateStr);

            let finalPrice = basePrice;
            let appliedDiscount = 0;
            let available = true;

            if (override) {
                if (override.is_available === 0) {
                    available = false;
                }
                if (override.price !== null) {
                    finalPrice = override.price;
                }
                if (override.discount) {
                    appliedDiscount = override.discount;
                    finalPrice = finalPrice - (finalPrice * (override.discount / 100));
                }
            }

            nights.push({
                date: dateStr,
                basePrice,
                overridePrice: override?.price ?? null,
                discount: appliedDiscount,
                finalPrice,
                isAvailable: available
            });
            totalPrice += finalPrice;
        }

        // Add cleaning fee if exists
        if (cleaning_fee) {
            totalPrice += parseFloat(cleaning_fee);
        }

        res.json({
            status: true,
            propertyId,
            checkInDate,
            checkOutDate,
            guestsCount: guestsCount ?? 1,
            nights,
            cleaningFee: cleaning_fee || 0,
            totalPrice
        });

    } catch (err) {
        console.error("Price calculation error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


/////// Get booking details ///////
router.get('/bookingsDetails', async (req, res) => {

    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = `
            SELECT b.booking_id, b.property_id, b.check_in_date, b.check_out_date, 
                   b.total_price, b.status, b.guests_count, b.created_at, 
                   p.title AS property_title, p.description AS property_description,
                   pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country, u.name as user_name
            
               FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            JOIN users u on u.user_id = b.guest_id
            left JOIN property_addresses pa ON p.address_id = pa.address_id
            WHERE 1=1 `;

        const queryParams = [];

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

        console.log(query);
        console.log(queryParams);

        const [bookings] = await db.promise().query(query, queryParams);

        if (bookings.length === 0) {
            return res.status(200).json({ status: false, message: "No bookings found" });
        }

        let countQuery = `
            SELECT COUNT(b.booking_id) as total
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            WHERE 1=1 `;

        let countParams = [];

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



// Export the router
module.exports = router;
































