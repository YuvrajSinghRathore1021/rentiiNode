const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

// properties=SELECT `property_id`, `host_id`, `title`, `description`, `property_type`, `room_type`, `max_guests`, `bedrooms`, `beds`, `bathrooms`, `price_per_night`, `cleaning_fee`, `address_id`, `latitude`, `longitude`, `is_active`, `created_at`, `updated_at` FROM `properties` WHERE 1

// property_addresses=SELECT `address_id`, `property_id`, `street_address`, `city`, `state_province`, `postal_code`, `country` FROM `property_addresses` WHERE 1

// property_amenities=SELECT `property_id`, `amenity_id` FROM `property_amenities` WHERE 1

// property_availability=SELECT `availability_id`, `property_id`, `date`, `is_available`, `price`, `min_stay` FROM `property_availability` WHERE 1

// property_images=SELECT `image_id`, `property_id`, `image_url`, `is_primary`, `caption`, `uploaded_at` FROM `property_images` WHERE 1

// amenities=SELECT `amenity_id`, `name`, `category`, `icon_class` FROM `amenities` WHERE 1

//bookings=SELECT `booking_id`, `property_id`, `guest_id`, `check_in_date`, `check_out_date`, `total_price`, `status`, `guests_count`, `created_at`, `updated_at`, `payment_status` FROM `bookings` WHERE 1

//house_rules=SELECT `rule_id`, `property_id`, `no_pets`, `no_smoking`, `no_parties`, `no_children`, `check_in_time`, `check_out_time`, `other_rules` FROM `house_rules` WHERE 1

// reviews=SELECT `review_id`, `booking_id`, `reviewer_id`, `reviewed_id`, `review_type`, `rating`, `comment`, `created_at` FROM `reviews` WHERE 1

// Get all properties for a host with property details,pagination, and filtering and nearby search using (`latitude`, `longitude`)

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
    const hostId = req.user.host_id; // Assuming host_id is stored in the user object

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
    const userId = req.user.user_id;
    const hostId = req.user.host_id;
    const {
        title, description, property_type, room_type, max_guests,
        bedrooms, beds, bathrooms, price_per_night, cleaning_fee,
        street_address, city, state_province, postal_code, country,
        latitude, longitude
    } = req.body;

    if (!title || !description || !property_type || !room_type || !max_guests ||
        !bedrooms || !beds || !bathrooms || !price_per_night || !cleaning_fee ||
        !street_address || !city || !state_province || !postal_code || !country ||
        !latitude || !longitude) {
        return res.status(400).json({ status: false, message: "All fields are required" });
    }
    try {
        // Start a transaction
        await db.promise().beginTransaction();

        // Insert into properties table
        const propertyInsertQuery = `
            INSERT INTO properties (host_id, title, description, property_type, room_type, 
                                    max_guests, bedrooms, beds, bathrooms, price_per_night, 
                                    cleaning_fee, address_id, latitude, longitude)
            VALUES (?,? ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                    (SELECT address_id FROM property_addresses WHERE street_address = ? AND city = ? AND state_province = ? AND postal_code = ? AND country = ?), 
                    ?, ?)`;
        const propertyInsertParams = [
            hostId, title, description, property_type, room_type, max_guests,
            bedrooms, beds, bathrooms, price_per_night, cleaning_fee,
            street_address, city, state_province, postal_code, country,
            latitude, longitude
        ];
        const [propertyResult] = await db.promise().query(propertyInsertQuery, propertyInsertParams);
        const propertyId = propertyResult.insertId;
        if (!propertyId) {
            throw new Error("Failed to insert property");
        }
        // Insert into property_addresses table
        const addressInsertQuery = `
            INSERT INTO property_addresses (street_address, city, state_province, postal_code, country, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const addressInsertParams = [
            street_address, city, state_province, postal_code, country, latitude, longitude
        ];
        await db.promise().query(addressInsertQuery, addressInsertParams);
        // Commit the transaction
        await db.promise().commit();
        res.json({
            status: true, message: "Property added successfully", property_id: property,
            Id
        });
    } catch (err) {
        console.error("Add property error:", err);
        // Rollback the transaction in case of error
        await db.promise().rollback();
        res.status(500).json({ status: false, message: "Server error", error: err.message });
    }
});









// Export the router
module.exports = router;