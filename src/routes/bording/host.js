const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');
const upload = require('../../middleware/upload');



// host_profiles=SELECT `host_id`, `user_id`, `headline`, `bio`, `language_spoken`, `response_time`, `host_since`, `govt_id_verified`, `profile_complete`, `status`, `created_at` FROM `host_profiles` WHERE 1

// host_addresses=SELECT `address_id`, `user_id`, `country`, `state`, `city`, `zip_code`, `full_address`, `latitude`, `longitude` FROM `host_addresses` WHERE 1


// host_verifications=SELECT `id`, `user_id`, `document_type`, `document_url`, `verified`, `verified_by_admin`, `submitted_at`, `verified_at` FROM `host_verifications` WHERE 1


router.post('/test', (req, res) => {
    res.status(200).json({ status: true, data: '', message: 'service is running' });

});



// host_profiles
router.get("/hostProfiles", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = "SELECT * FROM host_profiles WHERE 1=1";
        const queryParams = [];

        if (status) {
            query += " AND status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (headline LIKE ? OR bio LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY host_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [profiles] = await db.promise().query(query, queryParams);
        if (profiles.length === 0) {
            return res.status(200).json({ status: false, message: "No profiles found" });
        }

        let queryCount = "SELECT COUNT(host_id) as total FROM host_profiles WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (headline LIKE ? OR bio LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [profileCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: profiles, total: profileCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get host profiles error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Route to toggle host profile status
router.post("/toggle-host-status", async (req, res) => {
    const userId = req.user.user_id;
    const { status, id } = req.body;

    try {
        let query = '';
        let data = [];
        if (status) {
            query = "UPDATE host_profiles SET status = ?, updated_at = NOW() WHERE host_id = ?";
            data = [status, id];
        } else {
            return res.status(400).json({ status: false, message: "Invalid status" });
        }
        await db.promise().query(query, data);

        res.json({ status: true, message: "Host profile status updated successfully" });
    } catch (err) {
        console.error("Update host profile error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Route to get host addresses
router.get("/hostAddresses", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = "SELECT * FROM host_addresses WHERE 1=1";
        const queryParams = [];

        if (status) {
            query += " AND status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (country LIKE ? OR state LIKE ? OR city LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY address_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [addresses] = await db.promise().query(query, queryParams);
        if (addresses.length === 0) {
            return res.status(200).json({ status: false, message: "No addresses found" });
        }

        let queryCount = "SELECT COUNT(address_id) as total FROM host_addresses WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (country LIKE ? OR state LIKE ? OR city LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [addressCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: addresses, total: addressCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get host addresses error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Route to toggle host address status
router.post("/toggle-address-status", async (req, res) => {
    const userId = req.user.user_id;
    const { status, id } = req.body;

    try {
        let query = '';
        let data = [];
        if (status) {
            query = "UPDATE host_addresses SET status = ?, updated_at = NOW() WHERE address_id = ?";
            data = [status, id];
        } else {
            return res.status(400).json({ status: false, message: "Invalid status" });
        }
        await db.promise().query(query, data);

        res.json({ status: true, message: "Host address status updated successfully" });
    } catch (err) {
        console.error("Update host address error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Route to get host verifications
router.get("/hostVerifications", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = "SELECT * FROM host_verifications WHERE 1=1";
        const queryParams = [];

        if (status) {
            query += " AND verified = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (document_type LIKE ? OR document_url LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [verifications] = await db.promise().query(query, queryParams);
        if (verifications.length === 0) {
            return res.status(200).json({ status: false, message: "No verifications found" });
        }

        let queryCount = "SELECT COUNT(id) as total FROM host_verifications WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (document_type LIKE ? OR document_url LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [verificationCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: verifications, total: verificationCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get host verifications error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Route to toggle host verification status
router.post("/toggle-verification-status", async (req, res) => {
    const userId = req.user.user_id;
    const { status, id } = req.body;

    try {
        let query = '';
        let data = [];
        if (status) {
            query = "UPDATE host_verifications SET verified = ?, updated_at = NOW() WHERE id = ?";
            data = [status, id];
        } else {
            return res.status(400).json({ status: false, message: "Invalid status" });
        }
        await db.promise().query(query, data);

        res.json({ status: true, message: "Host verification status updated successfully" });
    } catch (err) {
        console.error("Update host verification error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



// update 
// update host_profiles
router.post("/update-host-profile", async (req, res) => {
    const userId = req.user.user_id;
    const { host_id, headline, bio, language_spoken, response_time, host_since, govt_id_verified, profile_complete } = req.body;

    try {
        const query = "UPDATE host_profiles SET headline = ?, bio = ?, language_spoken = ?, response_time = ?, host_since = ?, govt_id_verified = ?, profile_complete = ?, updated_at = NOW() WHERE host_id = ?";
        const data = [headline, bio, language_spoken, response_time, host_since, govt_id_verified, profile_complete, host_id];

        await db.promise().query(query, data);
        res.json({ status: true, message: "Host profile updated successfully" });
    } catch (err) {
        console.error("Update host profile error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Route to get user data

router.get("/getUserData", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = "SELECT user_id, name, email, phone_number, profile_picture_url, about, status FROM users WHERE 1=1";
        const queryParams = [];

        if (status) {
            query += " AND status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY user_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [users] = await db.promise().query(query, queryParams);
        if (users.length === 0) {
            return res.status(200).json({ status: false, message: "No users found" });
        }

        let queryCount = "SELECT COUNT(user_id) as total FROM users WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [userCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: users, total: userCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get user data error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// add host address
router.post("/addHostAddress", async (req, res) => {
    const userId = req.user.user_id;
    const { country, state, city, zip_code, full_address, latitude, longitude } = req.body;

    try {
        const query = "INSERT INTO host_addresses (user_id, country, state, city, zip_code, full_address, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        const data = [userId, country, state, city, zip_code, full_address, latitude, longitude];

        await db.promise().query(query, data);
        res.json({ status: true, message: "Host address added successfully" });
    } catch (err) {
        console.error("Add host address error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// make host 

// router.post("/makeHost", async (req, res) => {
//     const userId = req.user.user_id;
//     const { headline, bio, language_spoken, response_time, host_since, govt_id_verified, profile_complete } = req.body;
//     try {
//         const query = "INSERT INTO host_profiles (user_id, headline, bio, language_spoken, response_time, host_since, govt_id_verified, profile_complete, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
//         const data = [userId, headline, bio, language_spoken, response_time, host_since, govt_id_verified, profile_complete];

//         await db.promise().query(query, data);
//         res.json({ status: true, message: "Host profile created successfully" });
//     } catch (err) {
//         console.error("Make host error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


router.post("/makeHost", async (req, res) => {
    const userId = req.user.user_id;
    const { host_name } = req.body;
    try {
        const query = "INSERT INTO host_profiles (user_id, host_name, created_at) VALUES (?, ?, NOW())";
        const data = [userId, host_name];

        await db.promise().query(query, data);
        res.json({ status: true, message: "Host profile created successfully" });
    } catch (err) {
        console.error("Make host error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// SELECT `id`, `user_id`, `document_type`, `document_url`, `verified`, `verified_by_admin`, `submitted_at`, `verified_at` FROM `host_verifications` WHERE 1
// document_type=uplode file



// host_verifications
router.post("/addHostVerification", upload.single("document"), async (req, res) => {
    const userId = req.user.user_id;
    const document_type = req.body.document_type;

    if (!req.file) {
        return res.status(400).json({ status: false, message: "No document uploaded" });
    }

    const document_url = "/uploads/documents/" + userId + "/" + req.file.filename;

    try {
        const query = `
            INSERT INTO host_verifications 
            (user_id, document_type, document_url, submitted_at) 
            VALUES (?, ?, ?, NOW())`;
        const data = [userId, document_type, document_url];

        await db.promise().query(query, data);
        res.json({ status: true, message: "Host verification added successfully" });
    } catch (err) {
        console.error("Add host verification error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});




// Export the router
module.exports = router;    