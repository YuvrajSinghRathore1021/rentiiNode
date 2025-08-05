const express = require('express');
require('dotenv').config();
const router = express.Router();
const mysql = require('mysql2');

// DB Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hrmsnewlive',
});

router.post('/test', (req, res) => {
    res.status(200).json({ status: true, data: '', message: 'Notification service is running' });

});



router.post('/send', (req, res) => {
    const userId = req.user.user_id;
    const { receiver_id, page_url, img_url, title, message, notification_type } = req.body;

    // Store as string in DB
    const receiverIdStr = receiver_id.toString();

    const sql = `INSERT INTO notifications 
    ( sender_id, receiver_id, page_url, img_url, title, message, notification_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [decodedUserData.id, receiverIdStr, page_url, img_url, title, message, notification_type], (err, result) => {
        if (err) return res.status(500).send(err);

        const notification = {
            id: result.insertId,
            sender_id: decodedUserData.id,
            receiver_id: receiverIdStr,
            page_url,
            img_url,
            title,
            message,
            is_read: false,
            created_at: new Date(),
            notification_type
        };

        // Emit notification to each individual receiver
        const receiverIds = receiverIdStr.split(',').map(id => id.trim());
        receiverIds.forEach(id => {
            if (notification_type == 'message') {
                req.io.to(id).emit("receive-message", notification);
            } else {
                req.io.to(id).emit("receive-notification", notification);
            }
        });
        res.status(200).send({ success: true, notification });
    });
});

router.post('/NotificationGet', (req, res) => {
    const userId = req.user.user_id;
    const { notification_type = '' } = req.body;
    db.query("SELECT * FROM notifications WHERE FIND_IN_SET(?, receiver_id) and notification_type =? ORDER BY created_at DESC", [id, notification_type], (err, results) => {
        if (err) return res.status(500).send(err);
        return res.status(200).json({ status: true, data: results, message: 'Notification fetched successfully' });
    });
});

router.post('/read', (req, res) => {
    const userId = req.user.user_id;
    const { id } = req.body;
    db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).send(err);
        return res.status(200).json({ status: true, message: 'Notification marked as read' });
    });
});

module.exports = router;
