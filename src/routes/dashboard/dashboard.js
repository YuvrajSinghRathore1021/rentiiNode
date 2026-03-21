const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

router.get('/userCheck', async (req, res) => {
    try {
        const userId = req.user.user_id;

        // User not logged in
        if (!userId) {
            return res.json({
                status: true,
                authenticated: false,
                type: "user",
                message: "Not logged in"
            });
        }

        let type = "user";

        // check broker
        const [broker] = await db.promise().query(`SELECT id FROM brokers WHERE user_id = ? LIMIT 1`, [userId]);

        if (broker.length > 0) {
            type = "broker";
        }

        // check host
        const [host] = await db.promise().query(
            `SELECT host_id FROM host_profiles WHERE user_id = ? LIMIT 1`,
            [userId]
        );

        if (host.length > 0) {
            type = "host";
        }
        if (broker.length > 0 && host.length) {
            type = "host-broker";
        }

        // super admin check
        if (userId == 3) {
            type = "super-admin";
        }

        return res.json({
            status: true,
            authenticated: true,
            type: type,
            user_id: userId,
            message: "User authenticated"
        });

    } catch (error) {
        console.error("User check error:", error);
        return res.status(500).json({
            status: false,
            message: "Error checking user",
            error: error.message
        });
    }
});

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
    try {
        // Users metrics - Using subqueries to avoid GROUP BY issues
        const [userMetrics] = await db.promise().query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE status = 1) as active_users,
        (SELECT COUNT(*) FROM users WHERE is_host = 1) as total_hosts,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as new_users_today,
        ROUND(
          ((SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) -
           (SELECT COUNT(*) FROM users WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL 60 DAY) AND DATE_SUB(NOW(), INTERVAL 30 DAY)))
          / NULLIF((SELECT COUNT(*) FROM users WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL 60 DAY) AND DATE_SUB(NOW(), INTERVAL 30 DAY)), 0) * 100, 1
        ) as user_growth
    `);

        // Bookings metrics - Using subqueries
        const [bookingMetrics] = await db.promise().query(`
      SELECT 
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 0) as pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 1) as completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 2) as confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 3) as cancelled_bookings,
        (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURDATE()) as today_bookings,
        (SELECT COALESCE(SUM(total_price), 0) FROM bookings) as total_revenue,
        (SELECT COALESCE(AVG(total_price), 0) FROM bookings) as avg_booking_value
    `);

        // Properties metrics - Using subqueries
        const [propertyMetrics] = await db.promise().query(`
      SELECT 
        (SELECT COUNT(*) FROM properties) as total_properties,
        (SELECT COUNT(*) FROM properties WHERE status = 1) as active_properties,
        (SELECT COUNT(*) FROM properties WHERE status = 0) as pending_properties,
        (SELECT COUNT(DISTINCT host_id) FROM properties) as total_hosts
    `);

        // Revenue metrics - Using subqueries
        const [revenueMetrics] = await db.promise().query(`
      SELECT 
        (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_revenue,
        (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 1 AND YEARWEEK(created_at) = YEARWEEK(NOW())) as weekly_revenue,
        (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 1 AND DATE(created_at) = CURDATE()) as daily_revenue
    `);

        res.json({
            status: true,
            data: {
                users: {
                    total: userMetrics[0]?.total_users || 0,
                    active: userMetrics[0]?.active_users || 0,
                    hosts: userMetrics[0]?.total_hosts || 0,
                    newToday: userMetrics[0]?.new_users_today || 0,
                    growth: userMetrics[0]?.user_growth || 0
                },
                bookings: {
                    total: bookingMetrics[0]?.total_bookings || 0,
                    pending: bookingMetrics[0]?.pending_bookings || 0,
                    confirmed: bookingMetrics[0]?.confirmed_bookings || 0,
                    completed: bookingMetrics[0]?.completed_bookings || 0,
                    cancelled: bookingMetrics[0]?.cancelled_bookings || 0,
                    today: bookingMetrics[0]?.today_bookings || 0,
                    revenue: bookingMetrics[0]?.total_revenue || 0
                },
                properties: {
                    total: propertyMetrics[0]?.total_properties || 0,
                    active: propertyMetrics[0]?.active_properties || 0,
                    pending: propertyMetrics[0]?.pending_properties || 0,
                    totalHosts: propertyMetrics[0]?.total_hosts || 0
                },
                revenue: {
                    total: bookingMetrics[0]?.total_revenue || 0,
                    monthly: revenueMetrics[0]?.monthly_revenue || 0,
                    weekly: revenueMetrics[0]?.weekly_revenue || 0,
                    daily: revenueMetrics[0]?.daily_revenue || 0,
                    averagePerBooking: bookingMetrics[0]?.avg_booking_value || 0
                }
            }
        });

    } catch (error) {
        console.error("Dashboard metrics error:", error);
        res.status(500).json({
            status: false,
            message: "Error fetching dashboard metrics",
            error: error.message
        });
    }
});

// Get chart data - COMPLETELY REWRITTEN to avoid GROUP BY issues
router.get('/charts', async (req, res) => {
    const { range = 'month' } = req.query;

    try {
        let revenueData = [];
        let bookingsData = [];

        if (range === 'week') {
            // Last 7 days - Using separate queries for each day
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = new Date();

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = days[date.getDay()].substring(0, 3);

                // Get revenue for this day
                const [revenue] = await db.promise().query(
                    `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings 
           WHERE status = 1 AND DATE(created_at) = ?`,
                    [dateStr]
                );

                // Get bookings count for this day
                const [bookings] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = ?`,
                    [dateStr]
                );

                revenueData.push({
                    label: dayName,
                    value: revenue[0]?.total || 0
                });

                bookingsData.push({
                    label: dayName,
                    value: bookings[0]?.count || 0
                });
            }
        }
        else if (range === 'month') {
            // Last 4 weeks
            for (let week = 1; week <= 4; week++) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() - ((week - 1) * 7));
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 7);

                const startStr = startDate.toISOString().split('T')[0];
                const endStr = endDate.toISOString().split('T')[0];

                // Get revenue for this week
                const [revenue] = await db.promise().query(
                    `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings 
           WHERE status = 1 AND DATE(created_at) BETWEEN ? AND ?`,
                    [startStr, endStr]
                );

                // Get bookings count for this week
                const [bookings] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM bookings 
           WHERE DATE(created_at) BETWEEN ? AND ?`,
                    [startStr, endStr]
                );

                revenueData.push({
                    label: `Week ${week}`,
                    value: revenue[0]?.total || 0
                });

                bookingsData.push({
                    label: `Week ${week}`,
                    value: bookings[0]?.count || 0
                });
            }
            // Reverse to show oldest first
            revenueData.reverse();
            bookingsData.reverse();
        }
        else if (range === 'year') {
            // Last 12 months
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const today = new Date();

            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthName = months[date.getMonth()];

                // Get revenue for this month
                const [revenue] = await db.promise().query(
                    `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings 
           WHERE status = 1 AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
                    [monthStr]
                );

                // Get bookings count for this month
                const [bookings] = await db.promise().query(
                    `SELECT COUNT(*) as count FROM bookings 
           WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
                    [monthStr]
                );

                revenueData.push({
                    label: monthName,
                    value: revenue[0]?.total || 0
                });

                bookingsData.push({
                    label: monthName,
                    value: bookings[0]?.count || 0
                });
            }
        }

        // Get popular properties - Using subqueries to avoid GROUP BY issues
        const [popular] = await db.promise().query(`
      SELECT 
        p.property_id,
        p.title,
        (SELECT COUNT(*) FROM bookings b WHERE b.property_id = p.property_id) as bookings_count,
        (SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b WHERE b.property_id = p.property_id) as total_revenue,
        (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.property_id = p.property_id AND r.review_type = 'property_review') as avg_rating,
        (SELECT image_url FROM property_images WHERE property_id = p.property_id AND is_primary = 1 LIMIT 1) as primary_image
      FROM properties p
      ORDER BY bookings_count DESC
      LIMIT 5
    `);

        // Format popular properties
        const popularProperties = popular.map(item => ({
            id: item.property_id,
            title: item.title || 'Untitled',
            bookings: item.bookings_count || 0,
            revenue: item.total_revenue || 0,
            rating: item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '4.5',
            image: item.primary_image
        }));

        res.json({
            status: true,
            data: {
                revenue: revenueData,
                bookings: bookingsData,
                popularProperties: popularProperties
            }
        });

    } catch (error) {
        console.error("Chart data error:", error);
        res.status(500).json({
            status: false,
            message: "Error fetching chart data",
            error: error.message
        });
    }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
    try {
        // Recent bookings
        const [recentBookings] = await db.promise().query(`
      SELECT 
        'booking' as type,
        CONCAT('New booking from ', u.name, ' for ', p.title) as description,
        b.created_at as time,
        b.status
      FROM bookings b
      JOIN users u ON b.guest_id = u.user_id
      JOIN properties p ON b.property_id = p.property_id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

        // Recent users
        const [recentUsers] = await db.promise().query(`
      SELECT 
        'user' as type,
        CONCAT('New user registered: ', name) as description,
        created_at as time
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

        // Recent payments
        const [recentPayments] = await db.promise().query(`
      SELECT 
        'payment' as type,
        CONCAT('Payment received: ₹', amount, ' for booking #', booking_id) as description,
        payment_date as time,
        status
      FROM payments
      WHERE status = 'completed'
      ORDER BY payment_date DESC
      LIMIT 5
    `);

        // Combine and sort all activities
        const allActivities = [
            ...recentBookings.map(b => ({
                ...b,
                rawTime: b.time,
                time: formatTimeAgo(b.time)
            })),
            ...recentUsers.map(u => ({
                ...u,
                rawTime: u.time,
                time: formatTimeAgo(u.time)
            })),
            ...recentPayments.map(p => ({
                ...p,
                rawTime: p.time,
                time: formatTimeAgo(p.time)
            }))
        ].sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime))
            .slice(0, 10)
            .map(({ rawTime, ...rest }) => rest);

        res.json({
            status: true,
            data: allActivities
        });

    } catch (error) {
        console.error("Recent activity error:", error);
        res.status(500).json({
            status: false,
            message: "Error fetching recent activity",
            error: error.message
        });
    }
});

// Helper function to format time ago
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return Math.floor(seconds) + ' seconds ago';
}

module.exports = router;