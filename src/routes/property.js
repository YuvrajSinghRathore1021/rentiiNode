const express = require('express');
const router = express.Router();
const db = require('../../db/ConnectionSql');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/property_images/',
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

const upload = multer({ storage });

router.get("/get", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    try {
        let query = "SELECT property_id, host_id, title, description, property_type, room_type, max_guests, bedrooms, beds, bathrooms, price_per_night, cleaning_fee, address_id, latitude, longitude, is_active, created_at, updated_at  FROM properties WHERE 1=1";
        const queryParams = [];

        if (status) {
            query += " AND is_active = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (title LIKE ? OR description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }


        query += " ORDER BY property_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [user] = await db.promise().query(query, queryParams);
        if (user.length === 0) {
            return res.status(200).json({ status: false, message: "Property not found" });
        }
        let queryCount = "SELECT COUNT(property_id) as total FROM properties WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (title LIKE ? OR description LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            queryCount += " AND is_active = ?";
            countParams.push(status);
        }

        const [userCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: user, total: userCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


router.post("/toggle-status", async (req, res) => {
    const userId = req.user.user_id;
    const { status, id } = req.body;

    try {
        let Query = '';
        let data = [];
        if (status) {
            Query = "UPDATE properties SET is_active = ?, updated_at = NOW() WHERE property_id = ?";
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


router.post("/create", async (req, res) => {
    const userId = req.user.user_id;
    const { title, description, property_type, room_type, max_guests, bedrooms, beds, bathrooms, price_per_night, cleaning_fee, latitude, longitude } = req.body;

    try {
        const query = "INSERT INTO properties (host_id, title, description, property_type, room_type, max_guests, bedrooms, beds, bathrooms, price_per_night, cleaning_fee,  latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const data = [userId, title, description, property_type, room_type, max_guests, bedrooms, beds, bathrooms, price_per_night, cleaning_fee, latitude, longitude];
        const [result] = await db.promise().query(query, data);
        res.json({ status: true, message: "Property created successfully", propertyId: result.insertId });
    } catch (err) {
        console.error("Create property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// new address tab 
router.post("/addressEditAdd", async (req, res) => {
    const userId = req.user.user_id;
    const { city, country, address_id, property_id, street_address, state_province, postal_code, } = req.body;
    //  `address_id`, `property_id`, `street_address`, `city`, `state_province`, `postal_code`, `country`
    try {
        let query = "";
        let data = "";
        let type = "";

        if (address_id != 0 && address_id != null && address_id != undefined && address_id != "") {
            query = "UPDATE property_addresses SET street_address = ?, city = ?, state_province = ?, postal_code = ?, country = ? WHERE address_id = ?";
            data = [street_address, city, state_province, postal_code, country, address_id];
            type = "update";
        } else {
            query = "INSERT INTO property_addresses (property_id, street_address, city, state_province, postal_code, country) VALUES (?, ?, ?, ?, ?, ?)";
            data = [property_id, street_address, city, state_province, postal_code, country];
            type = "insert";
        }
        const [result] = await db.promise().query(query, data);

        if (type == "insert") {
            let LastAddressId = result.insertId;
            const updatePropertyQuery = "UPDATE properties SET address_id = ? WHERE property_id = ?";
            await db.promise().query(updatePropertyQuery, [LastAddressId, property_id]);
        }

        res.json({ status: true, message: "Address Add /Update successfully", addressId: result.insertId });
    } catch (err) {
        console.error("Create address error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// address Get 

router.get("/addressGet", async (req, res) => {
    const userId = req.user.user_id;
    const { address_id, property_id } = req.query;

    try {
        const query = "SELECT address_id, property_id, street_address, city, state_province, postal_code, country FROM property_addresses WHERE property_id = ? and address_id = ?";
        const [address] = await db.promise().query(query, [property_id, address_id]);
        if (address.length === 0) {
            return res.status(200).json({ status: false, message: "Address not found" });
        }
        res.json({ status: true, data: address[0] });
    } catch (err) {
        console.error("Get address error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



// property_images   propertyImages
router.post("/propertyImages", async (req, res) => {
    const userId = req.user.user_id;
    const { property_id, image_url, image_id, caption } = req.body;
    try {
        let query = "";
        let data = "";
        let type = "";
        if (image_id != 0 && image_id != null && image_id != undefined && image_id != "") {
            query = "UPDATE property_images SET image_url = ?,caption=? WHERE image_id = ?";
            data = [image_url, caption, image_id];

            type = "update";
        } else {
            query = "INSERT INTO property_images (property_id, image_url,caption) VALUES (?, ?,?)";
            data = [property_id, image_url, caption];
            type = "insert";
        }
        const [result] = await db.promise().query(query, data);

        res.json({ status: true, message: "Image Add /Update successfully", imageId: result.insertId });
    } catch (err) {
        console.error("Create property image error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// propertyImagesView


router.post("/propertyImagesView", async (req, res) => {
    const userId = req.user.user_id;
    const { property_id } = req.body;
    console.log("property_id", property_id);
    try {
        const query = "SELECT image_id, property_id, image_url, is_primary, caption, uploaded_at FROM property_images WHERE property_id = ?";
        const [images] = await db.promise().query(query, [property_id]);
        if (images.length === 0) {
            return res.status(200).json({ status: false, message: "Images not found" });
        }
        res.json({ status: true, data: images });
    } catch (err) {
        console.error("Get property images error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});




router.post("/propertyImageUpload", upload.single('image'), async (req, res) => {
    const { property_id, caption } = req.body;
    const image_url = `/uploads/property_images/${req.file.filename}`;

    try {
        const query = `INSERT INTO property_images (property_id, image_url, caption, uploaded_at)
                       VALUES (?, ?, ?, NOW())`;
        await db.promise().query(query, [property_id, image_url, caption]);

        res.json({ status: true, message: "Image uploaded successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "Image upload failed" });
    }
});

// favorites

router.post("/favorites", async (req, res) => {
    const userId = req.user.user_id;
    const { property_id, favorite_id, type } = req.body;
    try {
        let query = "";
        let data = "";
        let type = "";

        if (type == "remove") {
            query = "UPDATE favorites SET property_id = ? WHERE favorite_id = ?";
            data = [property_id, favorite_id];
            type = "update";
        } else {
            query = "INSERT INTO favorites (user_id, property_id) VALUES (?, ?)";
            data = [userId, property_id];
            type = "insert";
        }
        const [result] = await db.promise().query(query, data);
        res.json({ status: true, message: "Favorite Add / Update successfully", favoriteId: result.insertId });

    } catch (err) {
        console.error("Create favorite error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }

});




// Export the router
module.exports = router;