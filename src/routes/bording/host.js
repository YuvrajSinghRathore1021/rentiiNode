// const express = require('express');
// const router = express.Router();
// const db = require('../../../db/ConnectionSql');
// const upload = require('../../middleware/upload');
// const jwt = require('jsonwebtoken');


// // host_profiles

// router.get("/hostProfiles", async (req, res) => {
//     const userId = req.user.user_id;
//     const { page = 1, limit = 10, search = "", status = "", type = 1 } = req.query;

//     try {
//         let query = "SELECT * FROM host_profiles WHERE type=?";
//         const queryParams = [type];

//         if (status) {
//             query += " AND status = ?";
//             queryParams.push(status);
//         }
//         if (search) {
//             query += " AND (headline LIKE ? OR bio LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern);
//         }

//         query += " ORDER BY host_id DESC LIMIT ? OFFSET ?";
//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

//         const [profiles] = await db.promise().query(query, queryParams);
//         if (profiles.length === 0) {
//             return res.status(200).json({ status: false, message: "No profiles found" });
//         }

//         let queryCount = "SELECT COUNT(host_id) as total FROM host_profiles WHERE type=?";
//         let countParams = [type];
//         if (search) {
//             queryCount += " AND (headline LIKE ? OR bio LIKE ?)";
//             countParams.push(`%${search}%`, `%${search}%`);
//         }

//         const [profileCount] = await db.promise().query(queryCount, countParams);
//         res.json({ status: true, data: profiles, total: profileCount[0].total, page: parseInt(page), limit: parseInt(limit) });
//     } catch (err) {
//         console.error("Get host profiles error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

// // Route to toggle host profile status

// router.post("/toggle-host-status", async (req, res) => {
//     const userId = req.user.user_id;
//     const { status, id } = req.body;
//     try {
//         let query = '';
//         let data = [];
//         if (status) {
//             query = "UPDATE host_profiles SET status = ?, updated_at = NOW() WHERE host_id = ?";
//             data = [status, id];
//         } else {
//             return res.status(400).json({ status: false, message: "Invalid status" });
//         }
//         await db.promise().query(query, data);

//         res.json({ status: true, message: "Host profile status updated successfully" });
//     } catch (err) {
//         console.error("Update host profile error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// // Route to get host addresses
// router.get("/hostAddresses", async (req, res) => {
//     const userId = req.user.user_id;
//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     try {
//         let query = "SELECT * FROM host_addresses WHERE 1=1";
//         const queryParams = [];

//         if (status) {
//             query += " AND status = ?";
//             queryParams.push(status);
//         }
//         if (search) {
//             query += " AND (country LIKE ? OR state LIKE ? OR city LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern, searchPattern);
//         }

//         query += " ORDER BY address_id DESC LIMIT ? OFFSET ?";
//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

//         const [addresses] = await db.promise().query(query, queryParams);
//         if (addresses.length === 0) {
//             return res.status(200).json({ status: false, message: "No addresses found" });
//         }

//         let queryCount = "SELECT COUNT(address_id) as total FROM host_addresses WHERE 1=1";
//         let countParams = [];
//         if (search) {
//             queryCount += " AND (country LIKE ? OR state LIKE ? OR city LIKE ?)";
//             countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
//         }

//         const [addressCount] = await db.promise().query(queryCount, countParams);
//         res.json({ status: true, data: addresses, total: addressCount[0].total, page: parseInt(page), limit: parseInt(limit) });
//     } catch (err) {
//         console.error("Get host addresses error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// // Route to toggle host address status
// router.post("/toggle-address-status", async (req, res) => {
//     const userId = req.user.user_id;
//     const { status, id } = req.body;

//     try {
//         let query = '';
//         let data = [];
//         if (status) {
//             query = "UPDATE host_addresses SET status = ?, updated_at = NOW() WHERE address_id = ?";
//             data = [status, id];
//         } else {
//             return res.status(400).json({ status: false, message: "Invalid status" });
//         }
//         await db.promise().query(query, data);

//         res.json({ status: true, message: "Host address status updated successfully" });
//     } catch (err) {
//         console.error("Update host address error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// // Route to get host verifications
// router.get("/verifications", async (req, res) => {
//     const userId = req.user.user_id;
//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     try {
//         let query = "SELECT * FROM host_verifications WHERE 1=1";
//         const queryParams = [];
//         query += " AND  userId=?";
//         queryParams.push(userId);
//         if (status) {

//             query += " AND verified = ? ?";
//             queryParams.push(status);
//         }

//         if (search) {
//             query += " AND (document_type LIKE ? OR document_url LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern);
//         }

//         query += " ORDER BY id DESC LIMIT ? OFFSET ?";
//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

//         const [verifications] = await db.promise().query(query, queryParams);
//         if (verifications.length === 0) {
//             return res.status(200).json({ status: false, message: "No verifications found" });
//         }

//         let queryCount = "SELECT COUNT(id) as total FROM host_verifications WHERE 1=1";
//         let countParams = [];
//         if (search) {
//             queryCount += " AND (document_type LIKE ? OR document_url LIKE ?)";
//             countParams.push(`%${search}%`, `%${search}%`);
//         }

//         const [verificationCount] = await db.promise().query(queryCount, countParams);
//         res.json({ status: true, data: verifications, total: verificationCount[0].total, page: parseInt(page), limit: parseInt(limit) });
//     } catch (err) {
//         console.error("Get host verifications error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// // Route to toggle host verification status
// router.post("/toggle-verification-status", async (req, res) => {
//     const userId = req.user.user_id;
//     const { status, id } = req.body;

//     try {
//         let query = '';
//         let data = [];
//         if (status) {
//             query = "UPDATE host_verifications SET verified = ?, updated_at = NOW() WHERE id = ?";
//             data = [status, id];
//         } else {
//             return res.status(400).json({ status: false, message: "Invalid status" });
//         }
//         await db.promise().query(query, data);

//         res.json({ status: true, message: "Host verification status updated successfully" });
//     } catch (err) {
//         console.error("Update host verification error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });



// // update 
// // //update host_profiles

// router.post("/update-host-profile", async (req, res) => {
//     const {
//         host_id,
//         headline,
//         bio,
//         language_spoken,
//         response_time,
//         host_since,
//         govt_id_verified,
//         profile_complete,
//         email,
//         phone_number,
//         profile,
//         status
//     } = req.body;

//     try {
//         const query = `
//             UPDATE host_profiles SET
//                 headline = ?,
//                 bio = ?,
//                 language_spoken = ?,
//                 response_time = ?,
//                 host_since = ?,
//                 govt_id_verified = ?,
//                 profile_complete = ?,
//                 email = ?,
//                 phone_number = ?,
//                 profile = ?,
//                 status = ?
//             WHERE host_id = ?
//         `;

//         const data = [
//             headline,
//             bio,
//             language_spoken,
//             response_time,
//             host_since,
//             govt_id_verified,
//             profile_complete,
//             email,
//             phone_number,
//             profile,
//             status,
//             host_id
//         ];

//         await db.promise().query(query, data);

//         res.json({ status: true, message: "Host profile updated successfully" });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });



// // add host address
// router.post("/addHostAddress", async (req, res) => {
//     const userId = req.user.user_id;
//     const { country, state, city, zip_code, full_address, latitude, longitude } = req.body;

//     try {
//         const query = "INSERT INTO host_addresses (user_id, country, state, city, zip_code, full_address, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
//         const data = [userId, country, state, city, zip_code, full_address, latitude, longitude];

//         await db.promise().query(query, data);
//         res.json({ status: true, message: "Host address added successfully" });
//     } catch (err) {
//         console.error("Add host address error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

// // make host 
// router.post("/makeHost", async (req, res) => {
//     const userId = req.user.user_id;
//     const { host_name } = req.body;
//     try {
//         // CHECK IF USER IS ALREADY HOST
//         const existingHost = await db.promise().query("SELECT * FROM host_profiles WHERE user_id = ?", [userId]);
//         if (existingHost[0].length > 0) {
//             return res.status(200).json({ status: false, message: "User is already a host." });
//         }

//         const query = "INSERT INTO host_profiles (user_id, host_name, created_at) VALUES (?, ?, NOW())";
//         const data = [userId, host_name];

//         await db.promise().query(query, data);
//         // lastInsertId UPDATE IN USER TABLE
//         let lastInsertId = await db.promise().query("SELECT LAST_INSERT_ID() as host_id");
//         const hostId = lastInsertId[0][0].host_id;
//         await db.promise().query("UPDATE users SET host_id = ? WHERE user_id = ?",
//             [hostId, userId]
//         );
//         // MAKE NEW TOKEN 
//         const user = await db.promise().query("SELECT * FROM users WHERE user_id = ?", [userId]);

//         const token = jwt.sign(
//             {
//                 user_id: user[0][0].user_id,
//                 name: user[0][0].name,
//                 email: user[0][0].email,
//                 dob: user[0][0].dob,
//                 phone_number: user[0][0].phone_number,
//                 about: user[0][0].about,
//                 host_id: user[0][0].host_id,
//                 is_host: user[0][0].is_host,
//                 is_verified_email: user[0][0].is_verified_email,
//                 status: user[0][0].status
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: '4300h' } // 500 days
//         );

//         // send token in response
//         res.json({ status: true, message: "Host profile created successfully", token: token });

//     } catch (err) {
//         console.error("Make host error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

// router.post("/addBroker", async (req, res) => {
//     const {
//         type,
//         profile,
//         host_name,
//         email,
//         phone_number,
//         headline,
//         bio,
//         language_spoken,
//         profile_complete,
//         status
//     } = req.body;

//     try {
//         /* ==========================
//            1️⃣ Insert Host Profile
//         =========================== */
//         const [hostResult] = await db.promise().query(
//             `INSERT INTO host_profiles 
//             (type, profile, host_name, email, phone_number, headline, bio, language_spoken, profile_complete, status)
//             VALUES (?,?,?,?,?,?,?,?,?,?)`,
//             [
//                 type,
//                 profile,
//                 host_name,
//                 email,
//                 phone_number,
//                 headline,
//                 bio,
//                 language_spoken,
//                 profile_complete,
//                 status
//             ]
//         );

//         const host_id = hostResult.insertId;

//         /* ============ 2️⃣ Check User Exists =============== */
//         const [users] = await db.promise().query(
//             `SELECT user_id FROM users WHERE email = ? OR phone_number = ? LIMIT 1`,
//             [email, phone_number]
//         );

//         console.log("users:", users);

//         if (users.length > 0) {
//             /* ==========================
//                3️⃣ Update Existing User
//             =========================== */
//             await db.promise().query(
//                 `UPDATE users 
//                  SET host_id = ?, is_host = 1, status = ?
//                  WHERE user_id = ?`,
//                 [host_id, status, users[0].user_id]
//             );

//             return res.json({
//                 status: true,
//                 message: "Broker profile created successfully and user updated",
//                 host_id
//             });

//         } else {
//             /* ==========================
//                4️⃣ Insert New User
//             =========================== */
//             await db.promise().query(
//                 `INSERT INTO users 
//                 (name, email, phone_number, host_id, is_host, status, created_at)
//                 VALUES (?,?,?,?,?,?,NOW())`,
//                 [host_name, email, phone_number, host_id, 1, status]
//             );

//             return res.json({
//                 status: true,
//                 message: "Broker profile created successfully and user inserted",
//                 host_id
//             });
//         }

//     } catch (err) {
//         console.error("Add broker error:", err.sqlMessage || err);
//         res.status(500).json({
//             status: false,
//             message: err.sqlMessage || "Server error"
//         });
//     }
// });

// router.post("/addHostVerification", upload.single("document"), async (req, res) => {
//     const userId = req.user.user_id;
//     const document_type = req.body.document_type;

//     if (!req.file) {
//         return res.status(400).json({ status: false, message: "No document uploaded" });
//     }

//     const document_url = "/uploads/documents/" + userId + "/" + req.file.filename;

//     try {
//         const query = `
//             INSERT INTO host_verifications 
//             (user_id, document_type, document_url, submitted_at) 
//             VALUES (?, ?, ?, NOW())`;
//         const data = [userId, document_type, document_url];

//         await db.promise().query(query, data);
//         res.json({ status: true, message: "Host verification added successfully" });
//     } catch (err) {
//         console.error("Add host verification error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// // Route to get user data
// router.get("/getUserData", async (req, res) => {
//     const userId = req.user.user_id;
//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     try {
//         let query = "SELECT user_id, name, email, phone_number, profile_picture_url, about, status FROM users WHERE 1=1";
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

//         const [users] = await db.promise().query(query, queryParams);
//         if (users.length === 0) {
//             return res.status(200).json({ status: false, message: "No users found" });
//         }

//         let queryCount = "SELECT COUNT(user_id) as total FROM users WHERE 1=1";
//         let countParams = [];
//         if (search) {
//             queryCount += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
//             countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
//         }

//         const [userCount] = await db.promise().query(queryCount, countParams);
//         res.json({ status: true, data: users, total: userCount[0].total, page: parseInt(page), limit: parseInt(limit) });
//     } catch (err) {
//         console.error("Get user data error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// // host check 
// router.post("/checkHost", async (req, res) => {
//     const user = req.user;

//     try {
//         // send token in response
//         res.json({ status: true, message: "Host profile checked successfully", data: user });
//     } catch (err) {
//         console.error("check host error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

// // Export the router
// module.exports = router;    




















const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');
const upload = require('../../middleware/upload');
const jwt = require('jsonwebtoken');

// Get host profiles with complete details
router.get("/hostProfiles", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "", type = 1, verification = "" } = req.query;

    try {
        let query = `
            SELECT 
                hp.*,
                u.name as user_name,
                u.email as user_email,
                u.phone_number as user_phone,
                u.profile_picture_url,
                u.is_verified_email,
                (SELECT COUNT(*) FROM properties WHERE host_id = hp.host_id) as total_properties,
                (SELECT COUNT(*) FROM properties WHERE host_id = hp.host_id AND status = 1) as active_properties,
                (SELECT COUNT(*) FROM bookings b 
                 JOIN properties p ON b.property_id = p.property_id 
                 WHERE p.host_id = hp.host_id) as total_bookings,
                (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r 
                 JOIN properties p ON r.property_id = p.property_id 
                 WHERE p.host_id = hp.host_id AND r.review_type = 'host_review') as avg_rating
            FROM host_profiles hp
            LEFT JOIN users u ON hp.user_id = u.user_id
            WHERE hp.type = ?
        `;

        const queryParams = [type];

        if (status) {
            query += " AND hp.status = ?";
            queryParams.push(status);
        }

        if (verification) {
            query += " AND hp.govt_id_verified = ?";
            queryParams.push(verification);
        }

        if (search) {
            query += " AND (hp.host_name LIKE ? OR hp.email LIKE ? OR hp.phone_number LIKE ? OR hp.headline LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count
        let countQuery = "SELECT COUNT(*) as total FROM host_profiles WHERE type = ?";
        let countParams = [type];

        if (status) {
            countQuery += " AND status = ?";
            countParams.push(status);
        }

        query += " ORDER BY hp.host_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [profiles] = await db.promise().query(query, queryParams);

        // Get statistics
        const [stats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN govt_id_verified = 1 THEN 1 ELSE 0 END) as verified,
                (SELECT COUNT(*) FROM properties) as total_properties,
                (SELECT COUNT(*) FROM bookings) as total_bookings
            FROM host_profiles
            WHERE type = ?
        `, [type]);

        const [countResult] = await db.promise().query(countQuery, countParams);

        res.json({
            status: true,
            data: profiles,
            total: countResult[0]?.total || 0,
            stats: stats[0] || {
                total: 0,
                active: 0,
                pending: 0,
                verified: 0,
                total_properties: 0,
                total_bookings: 0
            },
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host profiles error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get single host details with complete information
router.get("/hostDetails/:hostId", async (req, res) => {
    const { hostId } = req.params;

    try {
        // Get host profile
        const [host] = await db.promise().query(`
            SELECT 
                hp.*,
                u.name as user_name,
                u.email as user_email,
                u.phone_number as user_phone,
                u.profile_picture_url,
                u.is_verified_email,
                u.created_at as user_created_at
            FROM host_profiles hp
            LEFT JOIN users u ON hp.user_id = u.user_id
            WHERE hp.host_id = ?
        `, [hostId]);

        if (host.length === 0) {
            return res.status(404).json({ status: false, message: "Host not found" });
        }

        // Get host address
        const [address] = await db.promise().query(`
            SELECT * FROM host_addresses WHERE user_id = ? OR host_id = ?
            LIMIT 1
        `, [host[0].user_id || 0, hostId]);

        // Get properties
        const [properties] = await db.promise().query(`
            SELECT 
                p.*,
                (SELECT image_url FROM property_images WHERE property_id = p.property_id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM bookings WHERE property_id = p.property_id) as booking_count
            FROM properties p
            WHERE p.host_id = ?
            ORDER BY p.created_at DESC
        `, [hostId]);

        // Get statistics
        const [statistics] = await db.promise().query(`
            SELECT 
                (SELECT COUNT(*) FROM properties WHERE host_id = ?) as total_properties,
                (SELECT COUNT(*) FROM properties WHERE host_id = ? AND status = 1) as active_properties,
                (SELECT COUNT(*) FROM bookings b 
                 JOIN properties p ON b.property_id = p.property_id 
                 WHERE p.host_id = ?) as total_bookings,
                (SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b 
                 JOIN properties p ON b.property_id = p.property_id 
                 WHERE p.host_id = ? AND b.status = 1) as total_revenue,
                (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r 
                 JOIN properties p ON r.property_id = p.property_id 
                 WHERE p.host_id = ? AND r.review_type = 'host_review') as avg_rating
        `, [hostId, hostId, hostId, hostId, hostId]);

        // Get documents
        const [documents] = await db.promise().query(`
            SELECT * FROM documents 
            WHERE user_id = ? AND type = 1 AND is_deleted = 0
            ORDER BY uploaded_at DESC
        `, [host[0].user_id || 0]);

        // Get reviews
        const [reviews] = await db.promise().query(`
            SELECT 
                r.*,
                u.name as reviewer_name,
                u.profile_picture_url as reviewer_image,
                p.title as property_title
            FROM reviews r
            LEFT JOIN users u ON r.reviewer_id = u.user_id
            LEFT JOIN properties p ON r.property_id = p.property_id
            WHERE r.reviewed_id = ? OR r.reviewer_id = ?
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [host[0].user_id || 0, host[0].user_id || 0]);

        res.json({
            status: true,
            data: {
                host: host[0],
                address: address[0] || null,
                properties: properties,
                statistics: statistics[0] || {
                    total_properties: 0,
                    active_properties: 0,
                    total_bookings: 0,
                    total_revenue: 0,
                    avg_rating: 0
                },
                documents: documents,
                reviews: reviews
            }
        });

    } catch (err) {
        console.error("Get host details error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Route to toggle host profile status
router.post("/toggle-host-status", async (req, res) => {
    const { status, id } = req.body;
    try {
        await db.promise().query(
            "UPDATE host_profiles SET status = ?, updated_at = NOW() WHERE host_id = ?",
            [status, id]
        );
        res.json({ status: true, message: "Host profile status updated successfully" });
    } catch (err) {
        console.error("Update host profile error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Route to toggle verification status
router.post("/toggle-verification-status", async (req, res) => {
    const { id, verified } = req.body;
    try {
        await db.promise().query(
            "UPDATE host_profiles SET govt_id_verified = ?, updated_at = NOW() WHERE host_id = ?",
            [verified, id]
        );
        res.json({ status: true, message: "Verification status updated successfully" });
    } catch (err) {
        console.error("Update verification error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Update host profile
router.post("/update-host-profile", async (req, res) => {
    const {
        host_id,
        headline,
        bio,
        language_spoken,
        response_time,
        host_since,
        govt_id_verified,
        profile_complete,
        email,
        phone_number,
        profile,
        status
    } = req.body;

    try {
        const query = `
            UPDATE host_profiles SET
                headline = ?,
                bio = ?,
                language_spoken = ?,
                response_time = ?,
                host_since = ?,
                govt_id_verified = ?,
                profile_complete = ?,
                email = ?,
                phone_number = ?,
                profile = ?,
                status = ?,
                updated_at = NOW()
            WHERE host_id = ?
        `;

        await db.promise().query(query, [
            headline,
            bio,
            language_spoken,
            response_time,
            host_since,
            govt_id_verified,
            profile_complete,
            email,
            phone_number,
            profile,
            status,
            host_id
        ]);

        res.json({ status: true, message: "Host profile updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Add broker
router.post("/addBroker", async (req, res) => {
    const {
        type = 2,
        profile,
        host_name,
        email,
        phone_number,
        headline,
        bio,
        language_spoken,
        profile_complete = 1,
        status = 1
    } = req.body;

    try {
        // Insert Host Profile
        const [hostResult] = await db.promise().query(
            `INSERT INTO host_profiles 
            (type, profile, host_name, email, phone_number, headline, bio, language_spoken, profile_complete, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
            [
                type,
                profile,
                host_name,
                email,
                phone_number,
                headline,
                bio,
                language_spoken,
                profile_complete,
                status
            ]
        );

        const host_id = hostResult.insertId;

        // Check if user exists
        const [users] = await db.promise().query(
            `SELECT user_id FROM users WHERE email = ? OR phone_number = ? LIMIT 1`,
            [email, phone_number]
        );

        if (users.length > 0) {
            // Update existing user
            await db.promise().query(
                `UPDATE users 
                 SET host_id = ?, is_host = 1, status = ?, updated_at = NOW()
                 WHERE user_id = ?`,
                [host_id, status, users[0].user_id]
            );
        } else {
            // Insert new user
            await db.promise().query(
                `INSERT INTO users 
                (name, email, phone_number, host_id, is_host, status, created_at)
                VALUES (?,?,?,?,?,?,NOW())`,
                [host_name, email, phone_number, host_id, 1, status]
            );
        }

        res.json({
            status: true,
            message: "Broker profile created successfully",
            host_id
        });

    } catch (err) {
        console.error("Add broker error:", err);
        res.status(500).json({
            status: false,
            message: err.sqlMessage || "Server error"
        });
    }
});

// Get host addresses
router.get("/hostAddresses", async (req, res) => {
    const { page = 1, limit = 10, search = "", user_id = "" } = req.query;

    try {
        let query = "SELECT * FROM host_addresses WHERE 1=1";
        const queryParams = [];

        if (user_id) {
            query += " AND user_id = ?";
            queryParams.push(user_id);
        }

        if (search) {
            query += " AND (country LIKE ? OR state LIKE ? OR city LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY address_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [addresses] = await db.promise().query(query, queryParams);

        let countQuery = "SELECT COUNT(*) as total FROM host_addresses WHERE 1=1";
        let countParams = [];

        if (user_id) {
            countQuery += " AND user_id = ?";
            countParams.push(user_id);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);

        res.json({
            status: true,
            data: addresses,
            total: countResult[0]?.total || 0
        });
    } catch (err) {
        console.error("Get host addresses error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Add host address
router.post("/addHostAddress", async (req, res) => {
    const userId = req.user.user_id;
    const { country, state, city, zip_code, full_address, latitude, longitude } = req.body;

    try {
        await db.promise().query(
            "INSERT INTO host_addresses (user_id, country, state, city, zip_code, full_address, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [userId, country, state, city, zip_code, full_address, latitude, longitude]
        );
        res.json({ status: true, message: "Host address added successfully" });
    } catch (err) {
        console.error("Add host address error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Make host
router.post("/makeHost", async (req, res) => {
    const userId = req.user.user_id;
    const { host_name } = req.body;

    try {
        // Check if user is already a host
        const [existingHost] = await db.promise().query(
            "SELECT * FROM host_profiles WHERE user_id = ?",
            [userId]
        );

        if (existingHost.length > 0) {
            return res.status(200).json({ status: false, message: "User is already a host." });
        }

        // Insert host profile
        const [result] = await db.promise().query(
            "INSERT INTO host_profiles (user_id, host_name, created_at) VALUES (?, ?, NOW())",
            [userId, host_name]
        );

        const hostId = result.insertId;

        // Update user table
        await db.promise().query(
            "UPDATE users SET host_id = ?, is_host = 1 WHERE user_id = ?",
            [hostId, userId]
        );

        // Get updated user data
        const [user] = await db.promise().query(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        // Generate new token
        const token = jwt.sign(
            {
                user_id: user[0].user_id,
                name: user[0].name,
                email: user[0].email,
                dob: user[0].dob,
                phone_number: user[0].phone_number,
                about: user[0].about,
                host_id: user[0].host_id,
                is_host: user[0].is_host,
                is_verified_email: user[0].is_verified_email,
                status: user[0].status
            },
            process.env.JWT_SECRET,
            { expiresIn: '4300h' }
        );

        res.json({
            status: true,
            message: "Host profile created successfully",
            token: token
        });

    } catch (err) {
        console.error("Make host error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Add host verification
router.post("/addHostVerification", upload.single("document"), async (req, res) => {
    const userId = req.user.user_id;
    const document_type = req.body.document_type;

    if (!req.file) {
        return res.status(400).json({ status: false, message: "No document uploaded" });
    }

    const document_url = "/uploads/documents/" + userId + "/" + req.file.filename;

    try {
        await db.promise().query(
            `INSERT INTO host_verifications 
            (user_id, document_type, document_url, submitted_at) 
            VALUES (?, ?, ?, NOW())`,
            [userId, document_type, document_url]
        );
        res.json({ status: true, message: "Host verification added successfully" });
    } catch (err) {
        console.error("Add host verification error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Check host status
router.post("/checkHost", async (req, res) => {
    const user = req.user;
    res.json({ status: true, message: "Host profile checked successfully", data: user });
});

module.exports = router;