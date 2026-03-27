const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

//// user book property 

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
// router.get('/bookingsDetails', async (req, res) => {

//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     try {
//         let query = `
//             SELECT b.booking_id, b.property_id, b.check_in_date, b.check_out_date, 
//                    b.total_price, b.status, b.guests_count, b.created_at, 
//                    p.title AS property_title, p.description AS property_description,
//                    pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country, u.name as user_name

//                FROM bookings b
//             JOIN properties p ON b.property_id = p.property_id
//             JOIN users u on u.user_id = b.guest_id
//             left JOIN property_addresses pa ON p.address_id = pa.address_id
//             WHERE 1=1 `;

//         const queryParams = [];

//         if (status) {
//             query += " AND b.status = ?";
//             queryParams.push(status);
//         }
//         if (search) {
//             query += " AND (p.title LIKE ? OR p.description LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern);
//         }

//         query += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?";
//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

//         console.log(query);
//         console.log(queryParams);

//         const [bookings] = await db.promise().query(query, queryParams);

//         if (bookings.length === 0) {
//             return res.status(200).json({ status: false, message: "No bookings found" });
//         }

//         let countQuery = `
//             SELECT COUNT(b.booking_id) as total
//             FROM bookings b
//             JOIN properties p ON b.property_id = p.property_id
//             WHERE 1=1 `;

//         let countParams = [];

//         if (status) {
//             countQuery += " AND b.status = ?";
//             countParams.push(status);
//         }
//         if (search) {
//             countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
//             const searchPattern = `%${search}%`;
//             countParams.push(searchPattern, searchPattern);
//         }

//         const [countResult] = await db.promise().query(countQuery, countParams);
//         res.json({
//             status: true,
//             data: bookings,
//             total: countResult[0].total,
//             page: parseInt(page),
//             limit: parseInt(limit)
//         });
//     } catch (err) {
//         console.error("Get host bookings error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


router.get('/bookingsDetails', async (req, res) => {
    
    const { page = 1, limit = 10, search = "", status = "", payment_status = "",
        start_date = "", end_date = "", propertyView = "" } = req.query;

    let hostId = 0;
    if (propertyView == "hostView") {
        hostId = req.user.host_id;
    }
    
    try {
        // Main query with all necessary joins
        let query = `
            SELECT 
                b.booking_id,
                b.property_id,
                b.guest_id,
                b.order_id,
                b.payment_id,
                b.check_in_date,
                b.check_out_date,
                b.total_price,
                b.status,
                b.guests_count,
                b.adults,
                b.children,
                b.infants,
                b.previous_total_price,
                b.price_difference,
                b.payment_status,
                b.payment_reference,
                b.refund_amount,
                b.refund_reference,
                b.cancellation_reason,
                b.cancellation_date,
                b.created_at,
                b.updated_at,
                
                -- Property details
                p.title AS property_title,
                p.description AS property_description,
                p.property_type,
                p.price_per_night,
                
                -- Property address
                pa.street_address,
                pa.city,
                pa.state_province,
                pa.postal_code,
                pa.country,
                
                -- Guest details
                u.name AS user_name,
                u.email AS guest_email,
                u.phone_number AS guest_phone,
                u.profile_picture_url AS guest_profile,
                
                -- Calculate nights
                DATEDIFF(b.check_out_date, b.check_in_date) as nights
                
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            JOIN users u ON u.user_id = b.guest_id
            LEFT JOIN property_addresses pa ON p.property_id = pa.property_id
            WHERE 1=1
        `;

        const queryParams = [];

        if (status) {
            query += " AND b.status = ?";
            queryParams.push(status);

        }
        if (hostId) {
            query += " AND p.host_id = ?";
            queryParams.push(hostId);
        }

        if (payment_status) {
            query += " AND b.payment_status = ?";
            queryParams.push(payment_status);
        }

        if (start_date) {
            query += " AND b.check_in_date >= ?";
            queryParams.push(start_date);
        }

        if (end_date) {
            query += " AND b.check_out_date <= ?";
            queryParams.push(end_date);
        }

        if (search) {
            query += ` AND (
                u.name LIKE ? OR 
                u.email LIKE ? OR 
                p.title LIKE ? OR 
                b.order_id LIKE ?
            )`;
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            JOIN users u ON u.user_id = b.guest_id
            WHERE 1=1
        `;
        let countParams = [...queryParams];

        // Get statistics
        let statsQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN b.status = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN b.status = 1 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN b.status = 2 THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN b.status = 3 THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as totalRevenue
            FROM bookings b
            WHERE 1=1
        `;
        let statsParams = [];

        if (status) {
            statsQuery += " AND b.status = ?";
            statsParams.push(status);
        }

        query += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        // Execute all queries
        const [bookings] = await db.promise().query(query, queryParams);
        const [countResult] = await db.promise().query(countQuery, countParams);
        const [statsResult] = await db.promise().query(statsQuery, statsParams);

        res.json({
            status: true,
            data: bookings,
            total: countResult[0].total,
            stats: statsResult[0] || {
                total: 0,
                pending: 0,
                completed: 0,
                confirmed: 0,
                cancelled: 0,
                totalRevenue: 0
            },
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(countResult[0].total / parseInt(limit))
        });

    } catch (err) {
        console.error("Get bookings error:", err);
        res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message
        });
    }
});


// Update booking status
router.post("/update-status", async (req, res) => {
    try {
        const { booking_id, status } = req.body;

        if (!booking_id || status === undefined) {
            return res.status(400).json({
                status: false,
                message: "booking_id and status are required"
            });
        }

        await db.promise().query(
            "UPDATE bookings SET status = ?, updated_at = NOW() WHERE booking_id = ?",
            [status, booking_id]
        );

        res.json({
            status: true,
            message: "Booking status updated successfully"
        });

    } catch (err) {
        console.error("Update status error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});



// Get booking statistics
router.get("/stats", async (req, res) => {
    try {
        const [stats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending_bookings,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as cancelled_bookings,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_bookings,
                SUM(CASE WHEN WEEK(created_at) = WEEK(NOW()) THEN 1 ELSE 0 END) as this_week_bookings,
                SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) THEN 1 ELSE 0 END) as this_month_bookings,
                SUM(total_price) as total_revenue,
                SUM(CASE WHEN status = 1 THEN total_price ELSE 0 END) as completed_revenue,
                AVG(total_price) as average_booking_value
            FROM bookings
        `);

        const [revenueByMonth] = await db.promise().query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as bookings_count,
                SUM(total_price) as revenue
            FROM bookings
            WHERE status = 1
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 6
        `);

        res.json({
            status: true,
            data: {
                overview: stats[0],
                revenue_by_month: revenueByMonth
            }
        });

    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Export the router
module.exports = router;
































