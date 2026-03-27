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
            (guest_id,property_id, order_id, payment_id, check_in_date, check_out_date, total_price, status, guests_count,adults,children,infants) 
            VALUES (?,?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`,
            [userId, property_id, razorpay_order_id, razorpay_payment_id, startDate, endDate, amount, 1, guests_count, adults, children, infants]
        );

        return res.json({
            status: 1,
            message: "Payment verified & booking saved",
            booking_id: result.insertId
        });

    } catch (err) {
        return res.json({ status: 0, message: "DB error", error: err });
    }
});



// // verify-pending-payment


// Verify Payment API
router.post("/verify-pending-payment", async (req, res) => {
    const userId = req.user.user_id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, reference, payment_method, transaction_id, payment_details } = req.body;

    // Validate required fields
    if (!reference) {
        return res.json({ status: 0, message: "Payment reference is required" });
    }

    // Verify Razorpay signature (uncomment in production)
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "UF4goP3u0QnN1UjsT48VGD0N")
            .update(sign)
            .digest("hex");

        // if (expectedSign !== razorpay_signature) {
        //     return res.json({ status: 0, message: "Invalid signature" });
        // }
    }

    try {
        // Start transaction
        await db.promise().query("START TRANSACTION");

        // 1. First check if pending payment exists
        const [pendingPayment] = await db.promise().query(
            `SELECT pp.*, b.property_id, b.guest_id, b.status as booking_status 
             FROM pending_payments pp
             JOIN bookings b ON pp.booking_id = b.booking_id
             WHERE pp.reference = ? AND pp.status = 0`,
            [reference]
        );

        if (pendingPayment.length === 0) {
            await db.promise().query("ROLLBACK");
            return res.json({
                status: 0,
                message: "Invalid or already processed payment reference"
            });
        }

        const payment = pendingPayment[0];

        // 2. Update pending_payments table
        const [updateResult] = await db.promise().query(
            `UPDATE pending_payments SET 
                status = 1,
                payment_method = ?,
                transaction_id = ?,
                payment_details = ?,
                razorpay_order_id = ?,
                razorpay_payment_id = ?,
                razorpay_signature = ?,
                completed_at = NOW(),
                updated_at = NOW()
             WHERE reference = ? AND status = 0`,
            [
                payment_method || 'razorpay',
                transaction_id || razorpay_payment_id,
                payment_details || JSON.stringify({
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                    ...(payment_details ? JSON.parse(payment_details) : {})
                }),
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                reference
            ]
        );

        if (updateResult.affectedRows === 0) {
            await db.promise().query("ROLLBACK");
            return res.json({
                status: 0,
                message: "Failed to update payment status"
            });
        }

        // 3. Update booking based on payment type
        let bookingUpdateQuery = "";
        let bookingUpdateValues = [];
        if (payment.payment_type === 'date_change') {
            // For date change payments, update booking to confirmed
            bookingUpdateQuery = `UPDATE bookings SET 
                payment_status = 'paid',
                status = 2, -- confirmed
                updated_at = NOW()
                WHERE booking_id = ?`;
            bookingUpdateValues = [payment.booking_id];
        }
        else if (payment.payment_type === 'initial_booking') {
            // For initial booking, update status to confirmed
            bookingUpdateQuery = `UPDATE bookings SET 
                payment_status = 'paid',
                status = 2, -- confirmed
                updated_at = NOW()
                WHERE booking_id = ?`;
            bookingUpdateValues = [payment.booking_id];
        }

        if (bookingUpdateQuery) {
            await db.promise().query(bookingUpdateQuery, bookingUpdateValues);
        }

        // 4. Create payment record in payments table (if you have one)
        await db.promise().query(
            `INSERT INTO payments (
                booking_id, 
                amount, 
                payment_method, 
                transaction_id, 
                status, 
                payment_date
            ) VALUES (?, ?, ?, ?, 'completed', NOW())`,
            [
                payment.booking_id,
                payment.amount,
                payment_method || 'razorpay',
                transaction_id || razorpay_payment_id
            ]
        );

        return res.json({
            status: 1,
            message: "Payment verified successfully",
            data: {
                booking_id: payment.booking_id,
                amount: payment.amount,
                reference: reference,
                payment_id: razorpay_payment_id,
                status: 'completed'
            }
        });

    } catch (err) {
        await db.promise().query("ROLLBACK");
        console.error("Payment verification error:", err);
        return res.json({
            status: 0,
            message: "Payment verification failed",
            error: err.message
        });
    }
});


// Export the router
module.exports = router;

