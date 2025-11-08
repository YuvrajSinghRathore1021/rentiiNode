const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

//view for Calendar view on click property
// Calendar view API

// router.get("/view", async (req, res) => {
//     const { propertyId, startDate, endDate } = req.query;
//     if (!propertyId || !startDate || !endDate) {
//         return res.status(400).json({ status: false, message: "propertyId, startDate, and endDate are required" });
//     }
//     try {
//         // 1. Get base property details (price per night, etc.)
//         const [properties] = await db.promise().query(
//             `SELECT price_per_night, weekend_price, weekday_price 
//              FROM properties WHERE property_id = ?`, [propertyId]
//         );

//         if (properties.length === 0) {
//             return res.status(404).json({ status: false, message: "Property not found" });
//         }

//         const basePrice = properties[0].price_per_night;

//         // 2. Get availability overrides for given date range
//         const [availability] = await db.promise().query(
//             `SELECT date, is_available, price, discount FROM property_availability
//              WHERE property_id = ? AND date BETWEEN ? AND ?`, [propertyId, startDate, endDate]
//         );

//         // 3. Build date range array
//         const start = new Date(startDate);
//         const end = new Date(endDate);
//         const dates = [];

//         for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
//             const formattedDate = d.toISOString().split("T")[0];
//             dates.push(formattedDate);
//         }

//         // 4. Merge base + overrides
//         const calendar = dates.map(date => {
//             const override = availability.find(a => a.date.toISOString().split("T")[0] === date);
//             let finalPrice = basePrice;
//             let isAvailable = 1;

//             if (override) {
//                 isAvailable = override.is_available;
//                 finalPrice = override.price !== null ? override.price : basePrice;

//                 if (override.discount) {
//                     finalPrice = finalPrice - (finalPrice * (override.discount / 100));
//                 }
//             }

//             return {
//                 date,
//                 isAvailable: Boolean(isAvailable),
//                 finalPrice
//             };
//         });
//         res.json({ status: true, propertyId, calendar });
//     } catch (err) {
//         console.error("Get calendar error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


router.get("/view", async (req, res) => {
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

// Change availability & price for specific date or time slots 
router.post("/availability/update", async (req, res) => {
    const { propertyId, date, startTime, endTime, isAvailable, price, discount } = req.body;

    if (!propertyId || !date || typeof isAvailable === "undefined") {
        return res.status(400).json({ status: false, message: "propertyId, date, and isAvailable are required" });
    }

    try {
        // Check if entry already exists (for same property, date, and time slot)
        const [existing] = await db.promise().query(
            `SELECT id FROM property_availability 
             WHERE property_id = ? AND date = ? 
             AND ((start_time IS NULL AND ? IS NULL) OR start_time = ?) 
             AND ((end_time IS NULL AND ? IS NULL) OR end_time = ?)`,
            [propertyId, date, startTime, startTime, endTime, endTime]
        );

        if (existing.length > 0) {
            // Update existing slot
            await db.promise().query(
                `UPDATE property_availability 
                 SET is_available = ?, price = ?, discount = ?, updated_at = NOW() 
                 WHERE id = ?`,
                [isAvailable ? 1 : 0, price ?? null, discount ?? null, existing[0].id]
            );
            return res.json({ status: true, message: "Availability updated successfully" });
        } else {
            // Insert new slot
            await db.promise().query(
                `INSERT INTO property_availability 
                 (property_id, date, start_time, end_time, is_available, price, discount) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [propertyId, date, startTime ?? null, endTime ?? null, isAvailable ? 1 : 0, price ?? null, discount ?? null]
            );
            return res.json({ status: true, message: "Availability added successfully" });
        }
    } catch (err) {
        console.error("Update availability error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});






// Export the router
module.exports = router;