const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: "rzp_test_RMBOUMwnUg1PeD",
    key_secret: "UF4goP3u0QnN1UjsT48VGD0N"
});

router.post("/booking/create-order", async (req, res) => {
    try {
        const { amount, property_id } = req.body;
        console.log(amount);

        const order = await razorpay.orders.create({
            amount: amount * 100,  // convert to paise
            currency: "INR",
            receipt: "receipt_" + property_id
        });

        return res.json({
            status: 1,
            data: {
                order_id: order.id,
                amount: order.amount
            }
        });
    } catch (err) {
        return res.json({ status: 0, message: "Order creation failed", err });
    }
});



router.post("/verify-payment", async (req, res) => {
    const userId = req.user.user_id
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        property_id,
        amount,
        startDate,
        endDate,
        adults,
        children,
        infants
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", "UF4goP3u0QnN1UjsT48VGD0N")
        .update(sign).digest("hex");

    // if (expectedSign !== razorpay_signature) {
    //     return res.json({ status: 0, message: "Invalid signature" });
    // }

    try {
        // Total guests
        const guests_count = adults + children + infants;

        // Insert booking in DB
        const [result] = await db.promise().query(
            `INSERT INTO bookings 
            (guest_id,property_id, order_id, payment_id, check_in_date, check_out_date, total_price, status, guests_count) 
            VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, property_id, razorpay_order_id, razorpay_payment_id, startDate, endDate, amount, 1, guests_count]
        );

        return res.json({
            status: 1,
            message: "Payment verified & booking saved",
            booking_id: result.insertId
        });

    } catch (err) {
        console.log(err);
        return res.json({ status: 0, message: "DB error", error: err });
    }
});

// Export the router
module.exports = router;

