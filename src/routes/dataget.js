const express = require('express');
const router = express.Router();
const db = require('../../db/ConnectionSql');

// router.get("/get", async (req, res) => {
//     const userId = req.user.user_id;
//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     try {
//         let query = "SELECT user_id, name, email, phone_number, profile_picture_url, about,status FROM users WHERE 1=1 ";
//         const queryParams = [];

//         if (status) {
//             query += " AND status = ?";
//             queryParams.push(status);
//         }
//         if (search) {
//             query += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern, searchPattern);
//         }

//         query += " ORDER BY user_id DESC LIMIT ? OFFSET ?";
//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

//         const [user] = await db.promise().query(query, queryParams);
//         if (user.length === 0) {
//             return res.status(200).json({ status: false, message: "User not found" });
//         }
//         let queryCount = "SELECT COUNT(user_id) as total FROM users WHERE 1=1";
//         let countParams = [];
//         if (search) {
//             queryCount += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
//             countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
//         }
//         const [userCount] = await db.promise().query(queryCount, countParams);
//         res.json({ status: true, data: user, total: userCount[0].total, page: parseInt(page), limit: parseInt(limit) });
//     } catch (err) {
//         console.error("Get user error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

router.get("/get", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        // First, get the paginated users with basic info
        let query = `
            SELECT 
                u.user_id,
                u.name,
                u.legal_name,
                u.email,
                u.dob,
                u.phone_number,
                u.emergency_contact,
                u.profile_picture_url,
                u.about,
                u.created_at,
                u.updated_at,
                u.host_id,
                u.is_host,
                u.primary_address,
                u.alternate_address,
                u.is_verified_email,
                u.government_id,
                u.status,
                
                -- Get host name from host_profiles if exists
                (SELECT hp.host_name FROM host_profiles hp WHERE hp.user_id = u.user_id LIMIT 1) as host_name,
                
                -- Get host status
                (SELECT hp.status FROM host_profiles hp WHERE hp.user_id = u.user_id LIMIT 1) as host_status
                
            FROM users u
            WHERE 1=1
        `;

        const queryParams = [];

        if (status) {
            query += " AND u.status = ?";
            queryParams.push(status);
        }
        
        if (search) {
            query += " AND (u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ? OR u.legal_name LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count for pagination
        let countQuery = "SELECT COUNT(u.user_id) as total FROM users u WHERE 1=1";
        let countParams = [];
        
        if (status) {
            countQuery += " AND u.status = ?";
            countParams.push(status);
        }
        
        if (search) {
            countQuery += " AND (u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ? OR u.legal_name LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY u.user_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [users] = await db.promise().query(query, queryParams);
        
        if (users.length === 0) {
            return res.status(200).json({ 
                status: true, 
                data: [], 
                total: 0, 
                page: parseInt(page), 
                limit: parseInt(limit) 
            });
        }

        // Get additional data for all users in one go (to avoid N+1 queries)
        const userIds = users.map(u => u.user_id);
        const userIdsPlaceholder = userIds.map(() => '?').join(',');
        
        // Get counts and additional info in batch queries
        
        // 1. Get document counts
        const [docCounts] = await db.promise().query(`
            SELECT 
                user_id,
                COUNT(*) as document_count
            FROM documents 
            WHERE user_id IN (${userIdsPlaceholder}) AND type = 1 AND is_deleted = 0
            GROUP BY user_id
        `, userIds);
        
        // 2. Get booking counts
        const [bookingCounts] = await db.promise().query(`
            SELECT 
                guest_id as user_id,
                COUNT(*) as booking_count,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as confirmed_bookings,
                SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as cancelled_bookings
            FROM bookings 
            WHERE guest_id IN (${userIdsPlaceholder})
            GROUP BY guest_id
        `, userIds);
        
        // 3. Get favorites count
        const [favoriteCounts] = await db.promise().query(`
            SELECT 
                user_id,
                COUNT(*) as favorite_count
            FROM favourites 
            WHERE user_id IN (${userIdsPlaceholder})
            GROUP BY user_id
        `, userIds);
        
        // 4. Get review counts
        const [reviewCounts] = await db.promise().query(`
            SELECT 
                reviewed_id as user_id,
                COUNT(*) as review_count,
                AVG(rating) as avg_rating
            FROM reviews 
            WHERE reviewed_id IN (${userIdsPlaceholder}) AND review_type = 'guest_review'
            GROUP BY reviewed_id
        `, userIds);
        
        // 5. Get user addresses (first/default address only for list view)
        const [addresses] = await db.promise().query(`
            SELECT 
                user_id,
                street_address,
                city,
                state,
                country
            FROM user_addresses 
            WHERE user_id IN (${userIdsPlaceholder}) AND is_default = 1
        `, userIds);
        
        // 6. Get host profiles summary
        const [hostProfiles] = await db.promise().query(`
            SELECT 
                user_id,
                host_name,
                type as host_type,
                govt_id_verified,
                profile_complete,
                status as host_status
            FROM host_profiles 
            WHERE user_id IN (${userIdsPlaceholder})
        `, userIds);
        
        // 7. Get property counts for hosts
        const [propertyCounts] = await db.promise().query(`
            SELECT 
                p.host_id,
                COUNT(*) as property_count,
                SUM(CASE WHEN p.status = 1 THEN 1 ELSE 0 END) as active_properties
            FROM properties p
            WHERE p.host_id IN (
                SELECT host_id FROM host_profiles WHERE user_id IN (${userIdsPlaceholder})
            )
            GROUP BY p.host_id
        `, userIds);
        
        // Create lookup maps for quick access
        const docCountMap = Object.fromEntries(docCounts.map(d => [d.user_id, d.document_count]));
        const bookingCountMap = Object.fromEntries(bookingCounts.map(b => [b.user_id, b]));
        const favoriteCountMap = Object.fromEntries(favoriteCounts.map(f => [f.user_id, f.favorite_count]));
        const reviewCountMap = Object.fromEntries(reviewCounts.map(r => [r.user_id, r]));
        const addressMap = Object.fromEntries(addresses.map(a => [a.user_id, a]));
        const hostProfileMap = Object.fromEntries(hostProfiles.map(h => [h.user_id, h]));
        const propertyCountMap = Object.fromEntries(propertyCounts.map(p => [p.host_id, p]));
        
        // Get host_id to user_id mapping for property counts
        const hostIdToUserId = {};
        hostProfiles.forEach(hp => {
            hostIdToUserId[hp.host_id] = hp.user_id;
        });
        
        // Combine all data
        const formattedUsers = users.map(user => {
            const userId = user.user_id;
            const hostProfile = hostProfileMap[userId] || null;
            const hostId = hostProfile?.host_id;
            
            return {
                ...user,
                // Document stats
                documents_count: docCountMap[userId] || 0,
                
                // Booking stats
                total_bookings: bookingCountMap[userId]?.booking_count || 0,
                confirmed_bookings: bookingCountMap[userId]?.confirmed_bookings || 0,
                cancelled_bookings: bookingCountMap[userId]?.cancelled_bookings || 0,
                
                // Favorites
                favorites_count: favoriteCountMap[userId] || 0,
                
                // Reviews
                reviews_received: reviewCountMap[userId]?.review_count || 0,
                average_rating: reviewCountMap[userId]?.avg_rating ? parseFloat(reviewCountMap[userId].avg_rating).toFixed(1) : null,
                
                // Default address
                default_address: addressMap[userId] ? {
                    street: addressMap[userId].street_address,
                    city: addressMap[userId].city,
                    state: addressMap[userId].state,
                    country: addressMap[userId].country
                } : null,
                
                // Host profile summary
                host_profile: hostProfile,
                
                // Property stats for hosts
                total_properties: hostId ? (propertyCountMap[hostId]?.property_count || 0) : 0,
                active_properties: hostId ? (propertyCountMap[hostId]?.active_properties || 0) : 0,
                
                // Formatted dates
                member_since: new Date(user.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                
                // Verification badge
                verification_badge: user.is_verified_email == 1 ? 'verified' : 'unverified'
            };
        });

        const [userCount] = await db.promise().query(countQuery, countParams);

        res.json({ 
            status: true, 
            data: formattedUsers, 
            total: userCount[0].total, 
            page: parseInt(page), 
            limit: parseInt(limit),
            total_pages: Math.ceil(userCount[0].total / parseInt(limit))
        });
        
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error", error: err.message });
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


// In your existing API file, add this new endpoint

// Get complete user details with all related data
router.get("/user-complete/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // 1. Get basic user info
        const [user] = await db.promise().query(
            `SELECT u.*, 
                    ua.street_address, ua.city, ua.state, ua.postal_code, ua.country,
                    up.profile_picture_url
             FROM users u
             LEFT JOIN user_addresses ua ON u.user_id = ua.user_id AND ua.is_default = 1
             WHERE u.user_id = ?`,
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        // 2. Get all bookings with property details
        const [bookings] = await db.promise().query(
            `SELECT b.*,
                    p.title as property_title,
                    p.property_type,
                    p.price_per_night,
                    p.address_id,
                    pa.city as property_city,
                    pa.state_province as property_state,
                    pa.country as property_country,
                    pi.image_url as property_image,
                    hp.host_name,
                    hp.phone_number as host_phone,
                    py.payment_method,
                    py.transaction_id,
                    py.status as payment_status,
                    py.payment_date
             FROM bookings b
             LEFT JOIN properties p ON b.property_id = p.property_id
             LEFT JOIN property_addresses pa ON p.address_id = pa.address_id
             LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
             LEFT JOIN host_profiles hp ON p.host_id = hp.host_id
             LEFT JOIN payments py ON b.booking_id = py.booking_id
             WHERE b.guest_id = ?
             ORDER BY b.created_at DESC`,
            [userId]
        );

        // 3. Get user's favorite properties
        const [favorites] = await db.promise().query(
            `SELECT f.*,
                    p.title as property_title,
                    p.price_per_night,
                    p.property_type,
                    pi.image_url as property_image
             FROM favourites f
             LEFT JOIN properties p ON f.property_id = p.property_id
             LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
             WHERE f.user_id = ?`,
            [userId]
        );

        // 4. Get user reviews (given and received)
        const [reviewsGiven] = await db.promise().query(
            `SELECT r.*,
                    p.title as property_title,
                    b.check_in_date,
                    b.check_out_date
             FROM reviews r
             LEFT JOIN properties p ON r.property_id = p.property_id
             LEFT JOIN bookings b ON r.booking_id = b.booking_id
             WHERE r.reviewer_id = ? AND r.review_type = 'property_review'`,
            [userId]
        );

        const [reviewsReceived] = await db.promise().query(
            `SELECT r.*,
                    u.name as reviewer_name,
                    u.profile_picture_url as reviewer_image,
                    b.check_in_date,
                    b.check_out_date
             FROM reviews r
             LEFT JOIN users u ON r.reviewer_id = u.user_id
             LEFT JOIN bookings b ON r.booking_id = b.booking_id
             WHERE r.reviewed_id = ? AND r.review_type = 'guest_review'`,
            [userId]
        );

        // 5. Get documents
        const [documents] = await db.promise().query(
            `SELECT * FROM documents 
             WHERE user_id = ? AND is_deleted = 0
             ORDER BY uploaded_at DESC`,
            [userId]
        );

        // 6. Get messages (if user is sender or recipient)
        const [messages] = await db.promise().query(
            `SELECT m.*,
                    sender.name as sender_name,
                    recipient.name as recipient_name
             FROM messages m
             LEFT JOIN users sender ON m.sender_id = sender.user_id
             LEFT JOIN users recipient ON m.recipient_id = recipient.user_id
             WHERE m.sender_id = ? OR m.recipient_id = ?
             ORDER BY m.created_at DESC
             LIMIT 50`,
            [userId, userId]
        );

        // 7. Get pending payments
        const [pendingPayments] = await db.promise().query(
            `SELECT pp.*, b.order_id
             FROM pending_payments pp
             LEFT JOIN bookings b ON pp.booking_id = b.booking_id
             WHERE b.guest_id = ?`,
            [userId]
        );

        // 8. Get refunds
        const [refunds] = await db.promise().query(
            `SELECT r.*, b.order_id
             FROM refunds r
             LEFT JOIN bookings b ON r.booking_id = b.booking_id
             WHERE b.guest_id = ?`,
            [userId]
        );

        // Combine all data
        const userData = {
            ...user[0],
            bookings: bookings || [],
            favorites: favorites || [],
            reviews_given: reviewsGiven || [],
            reviews_received: reviewsReceived || [],
            documents: documents || [],
            messages: messages || [],
            pending_payments: pendingPayments || [],
            refunds: refunds || [],
            statistics: {
                total_bookings: bookings.length,
                total_spent: bookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0),
                total_reviews_given: reviewsGiven.length,
                total_favorites: favorites.length,
                completed_bookings: bookings.filter(b => b.status == 1).length,
                cancelled_bookings: bookings.filter(b => b.status == 3).length,
                pending_bookings: bookings.filter(b => b.status == 0).length,
                confirmed_bookings: bookings.filter(b => b.status == 2).length
            }
        };

        res.json({ 
            status: true, 
            data: userData
        });

    } catch (err) {
        console.error("Get complete user details error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Get single user with complete details - FIXED VERSION
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        // First, get the user data without GROUP BY
        const [users] = await db.promise().query(`
            SELECT 
                u.*,
                -- Host profile as JSON
                (
                    SELECT JSON_OBJECT(
                        'host_id', hp.host_id,
                        'host_name', hp.host_name,
                        'type', hp.type,
                        'profile', hp.profile,
                        'headline', hp.headline,
                        'bio', hp.bio,
                        'language_spoken', hp.language_spoken,
                        'response_time', hp.response_time,
                        'host_since', hp.host_since,
                        'govt_id_verified', hp.govt_id_verified,
                        'profile_complete', hp.profile_complete,
                        'status', hp.status
                    )
                    FROM host_profiles hp 
                    WHERE hp.user_id = u.user_id
                    LIMIT 1
                ) as host_profile
            FROM users u
            WHERE u.user_id = ?
        `, [id]);
        
        if (users.length === 0) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        
        const user = users[0];
        
        // Get addresses separately
        const [addresses] = await db.promise().query(`
            SELECT 
                address_id,
                street_address,
                city,
                state,
                postal_code,
                country,
                is_default
            FROM user_addresses 
            WHERE user_id = ?
        `, [id]);
        
        // Get documents
        const [documents] = await db.promise().query(`
            SELECT 
                document_id,
                title,
                description,
                file_path,
                status,
                uploaded_at
            FROM documents 
            WHERE user_id = ? AND type = 1 AND is_deleted = 0
            ORDER BY uploaded_at DESC
        `, [id]);
        
        // Get recent bookings
        const [recentBookings] = await db.promise().query(`
            SELECT 
                booking_id,
                property_id,
                check_in_date,
                check_out_date,
                total_price,
                status,
                created_at,
                guests_count,
                adults,
                children,
                infants,
                payment_status
            FROM bookings 
            WHERE guest_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `, [id]);
        
        // Get favorites
        const [favorites] = await db.promise().query(`
            SELECT 
                property_id,
                created_at
            FROM favourites 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [id]);
        
        // Get reviews (both given and received)
        const [reviews] = await db.promise().query(`
            SELECT 
                review_id,
                property_id,
                booking_id,
                reviewer_id,
                reviewed_id,
                review_type,
                rating,
                comment,
                created_at
            FROM reviews 
            WHERE reviewer_id = ? OR reviewed_id = ?
            ORDER BY created_at DESC
        `, [id, id]);
        
        // Get additional info
        const [additionalInfo] = await db.promise().query(`
            SELECT 
                info_key,
                info_value,
                created_at,
                updated_at
            FROM user_additional_info 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [id]);
        
        // Get host address if exists
        const [hostAddress] = await db.promise().query(`
            SELECT 
                address_id,
                country,
                flat,
                state,
                city,
                district,
                zip_code,
                street_address,
                state_province,
                full_address,
                landmark,
                latitude,
                longitude
            FROM host_addresses 
            WHERE user_id = ?
            LIMIT 1
        `, [id]);
        
        // Get statistics
        const [stats] = await db.promise().query(`
            SELECT 
                (SELECT COUNT(*) FROM bookings WHERE guest_id = ?) as total_bookings,
                (SELECT COUNT(*) FROM favourites WHERE user_id = ?) as total_favorites,
                (SELECT COUNT(*) FROM documents WHERE user_id = ? AND type = 1 AND is_deleted = 0) as total_documents,
                (SELECT COUNT(*) FROM properties WHERE host_id = (SELECT host_id FROM host_profiles WHERE user_id = ? LIMIT 1)) as total_properties
        `, [id, id, id, id]);
        
        // Combine all data
        const userData = {
            ...user,
            host_profile: user.host_profile ? JSON.parse(user.host_profile) : null,
            addresses: addresses || [],
            documents: documents || [],
            recent_bookings: recentBookings || [],
            favorites: favorites || [],
            reviews: reviews || [],
            additional_info: additionalInfo || [],
            host_address: hostAddress.length > 0 ? hostAddress[0] : null,
            statistics: stats[0] || {
                total_bookings: 0,
                total_favorites: 0,
                total_documents: 0,
                total_properties: 0
            }
        };
        
        res.json({ status: true, data: userData });
        
    } catch (err) {
        console.error("Get user details error:", err);
        res.status(500).json({ status: false, message: "Server error", error: err.message });
    }
});

// Export the router
module.exports = router;