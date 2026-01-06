const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');
const dbn = require('../../../db/db');


router.get('/properties', async (req, res) => {
    const userId = req.user.user_id;
    const hostId = req.user.host_id;
    const { page = 1, limit = 10, search = "", status = "", latitude, longitude, radius = 5 } = req.query;
    try {
        let query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, p.max_guests, 
                   p.bedrooms, p.beds, p.bathrooms, p.price_per_night, p.cleaning_fee, 
                   pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (status) {
            query += " AND p.is_active = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }
        if (latitude && longitude) {
            query += ` AND ST_Distance_Sphere(
                        point(pa.longitude, pa.latitude),
                        point(?, ?)
                    ) <= ? * 1000`; // radius in km to meters
            queryParams.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
        }

        query += " GROUP BY p.property_id ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [properties] = await db.promise().query(query, queryParams);

        if (properties.length === 0) {
            return res.status(200).json({ status: false, message: "No properties found" });
        }

        let countQuery = `
            SELECT COUNT(p.property_id) as total
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (status) {
            countQuery += " AND p.is_active = ?";
            countParams.push(status);
        }
        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }
        if (latitude && longitude) {
            countQuery += ` AND ST_Distance_Sphere(
                            point(pa.longitude, pa.latitude),
                            point(?, ?)
                        ) <= ? * 1000`; // radius in km to meters
            countParams.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
        }
        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: properties,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get properties error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get property details by property_id
router.get('/property', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, 
                   p.max_guests, p.bedrooms, p.beds, p.bathrooms, p.price_per_night, 
                   p.cleaning_fee, pa.street_address, pa.city, pa.state_province, 
                   pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
            WHERE p.property_id = ?
            GROUP BY p.property_id`;

        const [property] = await db.promise().query(query, [property_id]);

        if (property.length === 0) {
            return res.status(404).json({ status: false, message: "Property not found" });
        }

        res.json({ status: true, data: property[0] });
    } catch (err) {
        console.error("Get property details error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get properties by host_id
router.get('/host-properties', async (req, res) => {
    const hostId = req.user.host_id;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        const query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, 
                   p.max_guests, p.bedrooms, p.beds, p.bathrooms, p.price_per_night, 
                   p.cleaning_fee, pa.street_address, pa.city, pa.state_province, 
                   pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
            WHERE p.host_id = ?
            GROUP BY p.property_id`;

        const [properties] = await db.promise().query(query, [hostId]);

        if (properties.length === 0) {
            return res.status(404).json({ status: false, message: "No properties found for this host" });
        }

        res.json({ status: true, data: properties });
    } catch (err) {
        console.error("Get host properties error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get all bookings for a host with property details
router.get('/host-bookings', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT b.booking_id, b.property_id, b.check_in_date, b.check_out_date, 
                   b.total_price, b.status, b.guests_count, b.created_at, 
                   p.title AS property_title, p.description AS property_description,
                   pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            JOIN property_addresses pa ON p.address_id = pa.address_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (status) {
            query += " AND b.status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [bookings] = await db.promise().query(query, queryParams);

        if (bookings.length === 0) {
            return res.status(200).json({ status: false, message: "No bookings found" });
        }

        let countQuery = `
            SELECT COUNT(b.booking_id) as total
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (status) {
            countQuery += " AND b.status = ?";
            countParams.push(status);
        }
        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: bookings,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host bookings error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get all reviews for a host with property details
router.get('/host-reviews', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "", rating } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT r.review_id, r.rating, r.comment, r.created_at, 
                   p.title AS property_title, p.description AS property_description,
                   u.name AS reviewer_name
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.booking_id
            JOIN properties p ON b.property_id = p.property_id
            JOIN users u ON r.reviewer_id = u.user_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (rating) {
            query += " AND r.rating = ?";
            queryParams.push(parseInt(rating));
        }
        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ? OR u.name LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [reviews] = await db.promise().query(query, queryParams);

        if (reviews.length === 0) {
            return res.status(200).json({ status: false, message: "No reviews found" });
        }

        let countQuery = `
            SELECT COUNT(r.review_id) as total
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.booking_id
            JOIN properties p ON b.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (rating) {
            countQuery += " AND r.rating = ?";
            countParams.push(parseInt(rating));
        }
        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ? OR u.name LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: reviews,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host reviews error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get all house rules for a host with property details
router.get('/host-house-rules', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "" } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT hr.rule_id, hr.no_pets, hr.no_smoking, hr.no_parties, hr.no_children, 
                   hr.check_in_time, hr.check_out_time, hr.other_rules,
                   p.title AS property_title, p.description AS property_description
            FROM house_rules hr
            JOIN properties p ON hr.property_id = p.property_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY hr.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [houseRules] = await db.promise().query(query, queryParams);

        if (houseRules.length === 0) {
            return res.status(200).json({ status: false, message: "No house rules found" });
        }

        let countQuery = `
            SELECT COUNT(hr.rule_id) as total
            FROM house_rules hr
            JOIN properties p ON hr.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: houseRules,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host house rules error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
}
);

// Get all amenities for a host with property details
router.get('/host-amenities', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "" } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT a.amenity_id, a.name, a.category, a.icon_class,
                   p.title AS property_title, p.description AS property_description
            FROM amenities a
            JOIN property_amenities pa ON a.amenity_id = pa.amenity_id
            JOIN properties p ON pa.property_id = p.property_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (search) {
            query += " AND (a.name LIKE ? OR p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY a.name ASC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [amenities] = await db.promise().query(query, queryParams);

        if (amenities.length === 0) {
            return res.status(200).json({ status: false, message: "No amenities found" });
        }

        let countQuery = `
            SELECT COUNT(a.amenity_id) as total
            FROM amenities a
            JOIN property_amenities pa ON a.amenity_id = pa.amenity_id
            JOIN properties p ON pa.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (search) {
            countQuery += " AND (a.name LIKE ? OR p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: amenities,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host amenities error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get all property images for a host with property details
router.get('/host-property-images', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "" } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT pi.image_id, pi.image_url, pi.is_primary, pi.caption,
                   p.title AS property_title, p.description AS property_description
            FROM property_images pi
            JOIN properties p ON pi.property_id = p.property_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY pi.uploaded_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [images] = await db.promise().query(query, queryParams);

        if (images.length === 0) {
            return res.status(200).json({ status: false, message: "No property images found" });
        }

        let countQuery = `
            SELECT COUNT(pi.image_id) as total
            FROM property_images pi
            JOIN properties p ON pi.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: images,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host property images error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
}
);

// Get all property availability for a host with property details
router.get('/host-property-availability', async (req, res) => {
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object
    const { page = 1, limit = 10, search = "", date } = req.query;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        let query = `
            SELECT pa.availability_id, pa.date, pa.is_available, pa.price, pa.min_stay,
                   p.title AS property_title, p.description AS property_description
            FROM property_availability pa
            JOIN properties p ON pa.property_id = p.property_id
            WHERE p.host_id = ?`;

        const queryParams = [hostId];

        if (date) {
            query += " AND pa.date = ?";
            queryParams.push(date);
        }
        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        query += " ORDER BY pa.date DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [availability] = await db.promise().query(query, queryParams);

        if (availability.length === 0) {
            return res.status(200).json({ status: false, message: "No property availability found" });
        }

        let countQuery = `
            SELECT COUNT(pa.availability_id) as total
            FROM property_availability pa
            JOIN properties p ON pa.property_id = p.property_id
            WHERE p.host_id = ?`;

        let countParams = [hostId];

        if (date) {
            countQuery += " AND pa.date = ?";
            countParams.push(date);
        }
        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }

        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: availability,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get host property availability error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get all properties with pagination and filtering
router.get('/all-properties', async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "", latitude, longitude, radius = 5 } = req.query;

    try {
        let query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, 
                   p.max_guests, p.bedrooms, p.beds, p.bathrooms, p.price_per_night, 
                   p.cleaning_fee, pa.street_address, pa.city, pa.state_province, 
                   pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
            WHERE 1=1`;

        const queryParams = [];

        if (status) {
            query += " AND p.is_active = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }
        if (latitude && longitude) {
            query += ` AND ST_Distance_Sphere(
                        point(pa.longitude, pa.latitude),
                        point(?, ?)
                    ) <= ? * 1000`; // radius in km to meters
            queryParams.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
        }

        query += " GROUP BY p.property_id ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [properties] = await db.promise().query(query, queryParams);

        if (properties.length === 0) {
            return res.status(200).json({ status: false, message: "No properties found" });
        }

        let countQuery = `
            SELECT COUNT(p.property_id) as total
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            WHERE 1=1`;

        let countParams = [];
        if (status) {
            countQuery += " AND p.is_active = ?";
            countParams.push(status);
        }
        if (search) {
            countQuery += " AND (p.title LIKE ? OR p.description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }
        if (latitude && longitude) {
            countQuery += ` AND ST_Distance_Sphere(
                            point(pa.longitude, pa.latitude),
                            point(?, ?)
                        ) <= ? * 1000`; // radius in km to meters
            countParams.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
        }
        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: properties,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get all properties error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get property details by property_id for all users
router.get('/property-details', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, 
                   p.max_guests, p.bedrooms, p.beds, p.bathrooms, p.price_per_night, 
                   p.cleaning_fee, pa.street_address, pa.city, pa.state_province, 
                   pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
            WHERE p.property_id = ?
            GROUP BY p.property_id`;

        const [property] = await db.promise().query(query, [property_id]);

        if (property.length === 0) {
            return res.status(404).json({ status: false, message: "Property not found" });
        }

        res.json({ status: true, data: property[0] });
    } catch (err) {
        console.error("Get property details error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Get all properties for a host with property details
router.get('/host-properties-details', async (req, res) => {
    const hostId = req.user.host_id;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host ID is required" });
    }

    try {
        const query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, 
                   p.max_guests, p.bedrooms, p.beds, p.bathrooms, p.price_per_night, 
                   p.cleaning_fee, pa.street_address, pa.city, pa.state_province, 
                   pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id AND pi.is_primary = 1
            WHERE p.host_id = ?
            GROUP BY p.property_id`;

        const [properties] = await db.promise().query(query, [hostId]);

        if (properties.length === 0) {
            return res.status(404).json({ status: false, message: "No properties found for this host" });
        }

        res.json({ status: true, data: properties });
    } catch (err) {
        console.error("Get host properties details error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



// property on boarding/property uploads
//add property

router.post('/add-property', async (req, res) => {
    const connection = await dbn.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.user_id;
        const hostId = req.user.host_id || 1;
        const { data } = req.body;
        console.log(data);

        // 1. Insert into properties
        const [propertyResult] = await connection.query(`
            INSERT INTO properties 
            (host_id, title, description, property_type, describe_apartment, other_people, room_type, 
             max_guests, bedrooms, bedroom_look, beds, bathrooms, attached_bathrooms, dedicated_bathrooms, shard_bathrooms,
             latitude, longitude, weekday_price, weekend_price, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
        `, [
            hostId,
            data.apartmenttitle.title,
            data.aprtmentdescription.description,
            data.liketohost.type,
            data.describeyourplace.type,
            data.elsemightbethere.type,
            data.typeofplaceguesthave.type,
            data.startwiththebasics.peoplecanstay.guests,
            data.startwiththebasics.peoplecanstay.bedrooms,
            data.startwiththebasics.havealock.type,
            data.startwiththebasics.peoplecanstay.beds,
            parseInt(data.bathroomsareavailabletoguests.privateandatteched) +
            parseInt(data.bathroomsareavailabletoguests.dedicated) +
            parseInt(data.bathroomsareavailabletoguests.shared),
            data.bathroomsareavailabletoguests.privateandatteched,
            data.bathroomsareavailabletoguests.dedicated,
            data.bathroomsareavailabletoguests.shared,
            data.placelocated.latitude,
            data.placelocated.longitude,
            data.weekdaybaseprice.price,
            data.weekendprice.price
        ]);
        const propertyId = propertyResult.insertId;

        // 2. Insert property location
        await connection.query(`
            INSERT INTO property_addresses
            (property_id, street_address, city, state_province, postal_code, country, latitude, longitude)
            VALUES (?,?,?,?,?,?,?,?)
        `, [
            propertyId,
            data.placelocated.streetaddress,
            data.placelocated.district,
            data.placelocated.state,
            data.placelocated.pincode,
            data.placelocated.country,
            data.placelocated.latitude,
            data.placelocated.longitude
        ]);

        // 3. Insert host address
        await connection.query(`
            INSERT INTO host_addresses
            (host_id, street_address, city, state_province, zip_code, country, landmark,district)
            VALUES (?,?,?,?,?,?,?,?)
        `, [
            hostId,
            data.residentialaddress.streetaddress,
            data.residentialaddress.city,
            data.residentialaddress.state,
            data.residentialaddress.pincode,
            data.residentialaddress.country,
            data.residentialaddress.landmark,
            data.residentialaddress.district
        ]);

        // 4. Insert images
        if (data.placePhotos?.images?.length) {
            for (let i = 0; i < data.placePhotos.images.length; i++) {
                await connection.query(`
                    INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)
                `, [
                    propertyId,
                    data.placePhotos.images[i],
                    i === 0 ? 1 : 0
                ]);
            }
        }

        // 5. Insert amenities
        if (data.placehastooffer) {
            const amenities = Object.keys(data.placehastooffer)
                .filter(k => data.placehastooffer[k] == '1');

            for (const amenity of amenities) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE name=?`, [amenity]);
                if (rows.length) {
                    await connection.query(`
                        INSERT INTO property_amenities (property_id, amenity_id) VALUES (?,?)
                    `, [propertyId, rows[0].amenity_id]);
                }
            }
        }

        // 6. Insert "describe your apartment"
        if (data.describeyourapartment) {
            await connection.query(`
                INSERT INTO property_descriptions
                (property_id, peaceful, unique_thing, family_friendly, stylish, central, spacious)
                VALUES (?,?,?,?,?,?,?)
            `, [
                propertyId,
                data.describeyourapartment.peaceful,
                data.describeyourapartment.unique_thing,
                data.describeyourapartment.familyfriendly,
                data.describeyourapartment.stylish,
                data.describeyourapartment.central,
                data.describeyourapartment.spacious
            ]);
        }

        // 7. Insert booking settings
        if (data.pickyourbookingsetting) {
            await connection.query(`
                INSERT INTO property_booking_settings
                (property_id, approve5booking, instantbook)
                VALUES (?,?,?)
            `, [
                propertyId,
                data.pickyourbookingsetting.approve5booking,
                data.pickyourbookingsetting.instantbook
            ]);
        }

        // 8. Insert discounts
        if (data.discount) {
            await connection.query(`
                INSERT INTO property_discounts
                (property_id, newlistingpromotion, lastminutediscount, weeklydiscount, monthlydiscount)
                VALUES (?,?,?,?,?)
            `, [
                propertyId,
                data.discount.newlistingpromotion,
                data.discount.lastminutediscount,
                data.discount.weeklydiscount,
                data.discount.monthlydiscount
            ]);
        }

        // 9. Insert safety details
        if (data.safetydetails) {
            await connection.query(`
                INSERT INTO property_safety
                (property_id, securitycamera, noicedecibel, weapon)
                VALUES (?,?,?,?)
            `, [
                propertyId,
                data.safetydetails.securitycamera,
                data.safetydetails.noicedecibel,
                data.safetydetails.weapon
            ]);
        }

        await connection.commit();
        res.json({ status: true, message: "Property added successfully", propertyId });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ status: false, message: "Failed to add property" });
    } finally {
        connection.release();
    }
});

// Export the router
module.exports = router;

































// ///////////my extra api=
// // edit property
// // pending =placehastooffer,placePhotos,describeyourapartment,safetydetails
// router.post('/edit-property', async (req, res) => {
//     const userId = req.user.user_id;
//     const hostId = req.user.host_id;
//     if (hostId) {
//         return res.status(400).json({ status: false, message: "Host Not found pls re-login" });

//     }
//     const { type, propertyId, data } = req.body;
//     if (!type || !propertyId) {
//         return res.status(400).json({ status: false, message: "Booking ID and rating are required" });
//     }

//     try {
//         let updateQuery = "";
//         let updateValue = [];

//         if (type == "liketohost") {
//             updateQuery = `UPDATE properties SET property_type = ? WHERE host_id = ? and property_id=?`;
//             updateValue = [data.liketohost.type,

//                 hostId, propertyId]
//         }
//         else if (type == "describeyourplace") {
//             updateQuery = `UPDATE properties SET describe_apartment = ? WHERE host_id = ? and property_id=?`;
//             updateValue = [data.describeyourplace.type,

//                 hostId, propertyId]
//         }
//         else if (type == "typeofplaceguesthave") {
//             updateQuery = `UPDATE properties SET room_type = ? WHERE host_id = ? and property_id=?`;
//             updateValue = [data.typeofplaceguesthave.type,

//                 hostId, propertyId]
//         }
//         else if (type == "placelocated") {
//             // properties UPDATE on latitude,longitude
//             updateQuery = `UPDATE property_addresses SET street_address=?, city=?, state_province=?, postal_code=?, country=?, latitude=?, longitude=? WHERE property_id=?`;
//             updateValue = [
//                 data.placelocated.streetaddress,
//                 data.placelocated.district,
//                 data.placelocated.state,
//                 data.placelocated.pincode,
//                 data.placelocated.country,
//                 data.placelocated.latitude,
//                 data.placelocated.longitude,
//                 propertyId
//             ]
//         }
//         else if (type == "startwiththebasics") {
//             updateQuery = `UPDATE properties SET max_guests=?, bedrooms=?, bedroom_look=?, beds=? WHERE property_id=?`;
//             updateValue = [
//                 data.startwiththebasics.peoplecanstay.guests,
//                 data.startwiththebasics.peoplecanstay.bedrooms,
//                 data.startwiththebasics.havealock.type,
//                 data.startwiththebasics.peoplecanstay.beds,
//                 propertyId
//             ]
//         }
//         else if (type == "bathroomsareavailabletoguests") {
//             updateQuery = `UPDATE properties SET bathrooms=?, attached_bathrooms=?, dedicated_bathrooms=?, shard_bathrooms=? WHERE property_id=?`;
//             updateValue = [
//                 parseInt(data.bathroomsareavailabletoguests.privateandatteched) + parseInt(data.bathroomsareavailabletoguests.dedicated) + parseInt(data.bathroomsareavailabletoguests.shared),
//                 data.bathroomsareavailabletoguests.privateandatteched,
//                 data.bathroomsareavailabletoguests.dedicated,
//                 data.bathroomsareavailabletoguests.shared,
//                 propertyId
//             ]
//         }
//         else if (type == "elsemightbethere") {
//             updateQuery = `UPDATE properties SET other_people=? WHERE property_id=?`;
//             updateValue = [data.elsemightbethere.type,

//                 propertyId
//             ]
//         }
//         else if (type == "apartmenttitle") {
//             updateQuery = `UPDATE properties SET title=? WHERE property_id=?`;
//             updateValue = [data.apartmenttitle.title, propertyId
//             ]
//         }
//         else if (type == "aprtmentdescription") {
//             updateQuery = `UPDATE properties SET description=? WHERE property_id=?`;
//             updateValue = [data.aprtmentdescription.description, propertyId
//             ]
//         }

//         else if (type == "pickyourbookingsetting") {
//             updateQuery = `UPDATE property_booking_settings SET approve5booking=?, instantbook=? WHERE property_id=?`;
//             updateValue = [
//                 data.pickyourbookingsetting.approve5booking,
//                 data.pickyourbookingsetting.instantbook,
//                 propertyId
//             ]
//         }
//         else if (type == "weekdaybaseprice") {
//             updateQuery = `UPDATE properties SET weekday_price=? WHERE property_id=?`;
//             updateValue = [data.weekdaybaseprice.price, propertyId
//             ]
//         }
//         else if (type == "weekendprice") {
//             updateQuery = `UPDATE properties SET weekend_price=? WHERE property_id=?`;
//             updateValue = [data.weekendprice.price, propertyId
//             ]
//         }
//         else if (type == "discount") {
//             updateQuery = `UPDATE property_discounts SET  newlistingpromotion=?, lastminutediscount=?, weeklydiscount=?, monthlydiscount=? WHERE property_id=?`;
//             updateValue = [data.discount.newlistingpromotion,
//             data.discount.lastminutediscount,
//             data.discount.weeklydiscount,
//             data.discount.monthlydiscount, propertyId
//             ]
//         }
//         else if (type == "residentialaddress") {
//             updateQuery = `UPDATE property_discounts SET street_address=?, city=?, state_province=?, zip_code=?, country=?, landmark=?,district=? WHERE host_id=?`;
//             updateValue = [data.residentialaddress.streetaddress,
//             data.residentialaddress.city,
//             data.residentialaddress.state,
//             data.residentialaddress.pincode,
//             data.residentialaddress.country,
//             data.residentialaddress.landmark,
//             data.residentialaddress.district, hostId
//             ]
//         }
//         await db.promise().query(updateQuery, updateValue);

//         res.json({ status: true, message: "Update successfully" });
//     } catch (err) {
//         console.error("Add user review error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });