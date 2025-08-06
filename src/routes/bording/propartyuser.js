// in this page user view all proparty,booking,review,house rules,amenities,images,availability
// and also user can search proparty by latitude and longitude
// and also user can filter proparty by price,property type,room type,amenities
// and also user can paginate the propartyqs
// and also user can sort proparty by price,created_at,updated_at
// and also user can view all proparty details by property_id
// and also user can view all proparty details by property_id with all related data like address,amenities,availability,images,house rules,reviews

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


// Get all properties with details for a user

router.get('/getAllProperties', async (req, res) => {
    const { page = 1, limit = 10, search = "", sortBy = "price", sortOrder = "asc" } = req.query;

    try {
        let query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, p.max_guests,
                   p.bedrooms, p.beds, p.bathrooms, p.price_per_night, pa.street_address, pa.city,
                   pa.state_province, pa.postal_code, pa.country, GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   GROUP_CONCAT(DISTINCT pi.image_url) AS images
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id
            WHERE 1=1
        `;

        const queryParams = [];

        if (search) {
            query += " AND (p.title LIKE ? OR p.description LIKE ? OR pa.street_address LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += ` GROUP BY p.property_id ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [properties] = await db.promise().query(query, queryParams);

        if (properties.length === 0) {
            return res.status(200).json({ status: false, message: "No properties found" });
        }

        let countQuery = `
            SELECT COUNT(DISTINCT p.property_id) as total
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
        `;

        if (search) {
            countQuery += " WHERE (p.title LIKE ? OR p.description LIKE ? OR pa.street_address LIKE ?)";
        }

        const [countResult] = await db.promise().query(countQuery, search ? [searchPattern, searchPattern, searchPattern] : []);
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


// Get property details by property_id
router.get('/getPropertyDetails', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, p.max_guests,
                   p.bedrooms, p.beds, p.bathrooms, p.price_per_night, pa.street_address, pa.city,
                   pa.state_province, pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   GROUP_CONCAT(DISTINCT pi.image_url) AS images
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id
            WHERE p.property_id = ?
            GROUP BY p.property_id
        `;

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





// Get all bookings for a user
router.get('/getUserBookings', async (req, res) => {
    const userId = req.user.user_id; // Assuming user ID is stored in req.user
    const { page = 1, limit = 10 } = req.query;

    try {
        const query = `
            SELECT b.booking_id, b.property_id, b.check_in_date, b.check_out_date, b.total_price,
                   b.status, b.guests_count, p.title AS property_title
            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            WHERE b.guest_id = ?
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [bookings] = await db.promise().query(query, [userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);

        if (bookings.length === 0) {
            return res.status(200).json({ status: false, message: "No bookings found" });
        }

        let countQuery = "SELECT COUNT(booking_id) as total FROM bookings WHERE guest_id = ?";
        const [countResult] = await db.promise().query(countQuery, [userId]);

        res.json({
            status: true,
            data: bookings,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get user bookings error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Get reviews for a user
router.get('/getUserReviews', async (req, res) => {
    const userId = req.user.user_id; // Assuming user ID is stored in req.user
    const { page = 1, limit = 10 } = req.query;

    try {
        const query = `
            SELECT r.review_id, r.rating, r.comment, r.created_at, p.title AS property_title
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.booking_id
            JOIN properties p ON b.property_id = p.property_id
            WHERE r.reviewer_id = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [reviews] = await db.promise().query(query, [userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);

        if (reviews.length === 0) {
            return res.status(200).json({ status: false, message: "No reviews found" });
        }

        let countQuery = "SELECT COUNT(review_id) as total FROM reviews WHERE reviewer_id = ?";
        const [countResult] = await db.promise().query(countQuery, [userId]);

        res.json({
            status: true,
            data: reviews,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get user reviews error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Get house rules for a property
router.get('/getHouseRules', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT hr.rule_id, hr.no_pets, hr.no_smoking, hr.no_parties, hr.no_children,
                   hr.check_in_time, hr.check_out_time, hr.other_rules
            FROM house_rules hr
            WHERE hr.property_id = ?
        `;

        const [houseRules] = await db.promise().query(query, [property_id]);

        if (houseRules.length === 0) {
            return res.status(404).json({ status: false, message: "House rules not found for this property" });
        }

        res.json({ status: true, data: houseRules[0] });
    } catch (err) {
        console.error("Get house rules error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get amenities for a property
router.get('/getPropertyAmenities', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT a.amenity_id, a.name, a.category, a.icon_class
            FROM property_amenities pa
            JOIN amenities a ON pa.amenity_id = a.amenity_id
            WHERE pa.property_id = ?
        `;
        const [amenities] = await db.promise().query(query, [property_id]);
        if (amenities.length === 0) {
            return res.status(404).json({ status: false, message: "No amenities found for this property" });
        }
        res.json({ status: true, data: amenities });
    } catch (err) {
        console.error("Get property amenities error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get property images
router.get('/getPropertyImages', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT pi.image_id, pi.image_url, pi.is_primary, pi.caption, pi.uploaded_at
            FROM property_images pi
            WHERE pi.property_id = ?
        `;
        const [images] = await db.promise().query(query, [property_id]);

        if (images.length === 0) {
            return res.status(404).json({ status: false, message: "No images found for this property" });
        }

        res.json({ status: true, data: images });
    } catch (err) {
        console.error("Get property images error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

// Get property availability

router.get('/getPropertyAvailability', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT pa.availability_id, pa.date, pa.is_available, pa.price, pa.min_stay
            FROM property_availability pa
            WHERE pa.property_id = ?
        `;
        const [availability] = await db.promise().query(query, [property_id]);

        if (availability.length === 0) {
            return res.status(404).json({ status: false, message: "No availability found for this property" });
        }

        res.json({ status: true, data: availability });
    } catch (err) {
        console.error("Get property availability error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Get properties by latitude and longitude with filtering and pagination
router.get('/searchProperties', async (req, res) => {
    const { latitude, longitude, radius = 10, page = 1, limit = 10, priceRange = "", propertyType = "", roomType = "", amenities = "" } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ status: false, message: "Latitude and longitude are required" });
    }

    try {
        let query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, p.max_guests,
                   p.bedrooms, p.beds, p.bathrooms, p.price_per_night,
                   pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   GROUP_CONCAT(DISTINCT pi.image_url) AS images
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            LEFT JOIN property_images pi ON p.property_id = pi.property_id
            WHERE 1=1
        `;

        const queryParams = [];

        // Filter by price range
        if (priceRange) {
            const [minPrice, maxPrice] = priceRange.split('-').map(Number);
            query += " AND p.price_per_night BETWEEN ? AND ?";
            queryParams.push(minPrice, maxPrice);
        }

        // Filter by property type
        if (propertyType) {
            query += " AND p.property_type = ?";
            queryParams.push(propertyType);
        }

        // Filter by room type
        if (roomType) {
            query += " AND p.room_type = ?";
            queryParams.push(roomType);
        }

        // Filter by amenities
        if (amenities) {
            const amenityList = amenities.split(',').map(a => a.trim());
            query += " AND a.name IN (?)";
            queryParams.push(amenityList);
        }

        // Calculate distance and filter by radius
        query += `
            HAVING ST_Distance_Sphere(
                POINT(p.longitude, p.latitude),
                POINT(?, ?)
            ) <= ?
        `;
        queryParams.push(longitude, latitude, radius * 1000); // Convert radius to meters
        query += `
            GROUP BY p.property_id
            ORDER BY p.price_per_night ASC
            LIMIT ? OFFSET ?
        `;
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        const [properties] = await db.promise().query(query, queryParams);
        if (properties.length === 0) {
            return res.status(200).json({ status: false, message: "No properties found" });
        }
        let countQuery = `
            SELECT COUNT(DISTINCT p.property_id) as total
            FROM properties p
            JOIN property_addresses pa ON p.address_id = pa.address_id
            LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
            LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
            WHERE 1=1
        `;
        const countParams = [];
        // Apply the same filters for counting
        if (priceRange) {
            const [minPrice, maxPrice] = priceRange.split('-').map(Number);
            countQuery += " AND p.price_per_night BETWEEN ? AND ?";
            countParams.push(minPrice, maxPrice);
        }
        if (propertyType) {
            countQuery += " AND p.property_type = ?";
            countParams.push(propertyType);
        }
        if (roomType) {
            countQuery += " AND p.room_type = ?";
            countParams.push(roomType);
        }
        if (amenities) {
            const amenityList = amenities.split(',').map(a => a.trim());
            countQuery += " AND a.name IN (?)";
            countParams.push(amenityList);
        }
        countQuery += `
            HAVING ST_Distance_Sphere(
                POINT(p.longitude, p.latitude),
                POINT(?, ?)
            ) <= ?
        `;

        countParams.push(longitude, latitude, radius * 1000); // Convert radius to meters
        const [countResult] = await db.promise().query(countQuery, countParams);
        res.json({
            status: true,
            data: properties,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Search properties error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
}
);



//add user review

router.post('/addUserReview', async (req, res) => {
    const { booking_id, rating, comment } = req.body;
    const userId = req.user.user_id; // Assuming user ID is stored in req.user
    if (!booking_id || !rating) {
        return res.status(400).json({ status: false, message: "Booking ID and rating are required" });
    }
    try {
        // Check if the booking exists and belongs to the user
        const bookingQuery = "SELECT * FROM bookings WHERE booking_id = ? AND guest_id = ?";
        const [booking] = await db.promise().query(bookingQuery, [booking_id, userId]);

        if (booking.length === 0) {
            return res.status(404).json({ status: false, message: "Booking not found or does not belong to the user" });
        }

        // Insert the review
        const insertQuery = `
            INSERT INTO reviews (booking_id, reviewer_id, reviewed_id, review_type, rating, comment)
            VALUES (?, ?, ?, 'guest', ?, ?)
        `;
        await db.promise().query(insertQuery, [booking_id, userId, booking[0].host_id, rating, comment]);

        res.json({ status: true, message: "Review added successfully" });
    } catch (err) {
        console.error("Add user review error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});





// user booking handal 

router.post('/userBooking', async (req, res) => {
    const { property_id, check_in_date, check_out_date, guests_count } = req.body;
    const userId = req.user.user_id; // Assuming user ID is stored in req.user
    if (!property_id || !check_in_date || !check_out_date || !guests_count) {
        return res.status(400).json({ status: false, message: "Property ID, check-in date, check-out date, and guests count are required" });
    }
    try {
        // Check if the property exists and is active
        const propertyQuery = "SELECT * FROM properties WHERE property_id = ? AND is_active = 1";
        const [property] = await db.promise().query(propertyQuery, [property_id]);

        if (property.length === 0) {
            return res.status(404).json({ status: false, message: "Property not found or not active" });
        }

        // Check availability for the selected dates
        const availabilityQuery = `
            SELECT * FROM property_availability
            WHERE property_id = ? AND date BETWEEN ? AND ? AND is_available = 1
        `;
        const [availability] = await db.promise().query(availabilityQuery, [property_id, check_in_date, check_out_date]);

        if (availability.length === 0) {
            return res.status(400).json({ status: false, message: "Property is not available for the selected dates" });
        }

        // Calculate total price (assuming price per night is constant for simplicity)
        const pricePerNight = property[0].price_per_night;
        const totalPrice = pricePerNight * ((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));

        // Insert booking
        const insertBookingQuery = `
            INSERT INTO bookings (property_id, guest_id, check_in_date, check_out_date, total_price, guests_count)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.promise().query(insertBookingQuery, [property_id, userId, check_in_date, check_out_date, totalPrice, guests_count]);

        res.json({ status: true, message: "Booking successful" });
    } catch (err) {
        console.error("User booking error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});




// view proparty reviews by property_id
router.get('/getPropertyReviews', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        const query = `
            SELECT r.review_id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.booking_id
            JOIN users u ON r.reviewer_id = u.user_id
            WHERE b.property_id = ?
            ORDER BY r.created_at DESC
        `;

        const [reviews] = await db.promise().query(query, [property_id]);

        if (reviews.length === 0) {
            return res.status(404).json({ status: false, message: "No reviews found for this property" });
        }

        res.json({ status: true, data: reviews });
    } catch (err) {
        console.error("Get property reviews error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// user add review for property after booking
router.post('/addPropertyReview', async (req, res) => {
    const { property_id, rating, comment } = req.body;
    const userId = req.user.user_id; // Assuming user ID is stored in req.user

    if (!property_id || !rating) {
        return res.status(400).json({ status: false, message: "Property ID and rating are required" });
    }

    try {
        // Check if the user has a booking for the property
        const bookingQuery = `
            SELECT b.booking_id, b.host_id FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            WHERE b.guest_id = ? AND p.property_id = ?
        `;
        const [booking] = await db.promise().query(bookingQuery, [userId, property_id]);

        if (booking.length === 0) {
            return res.status(404).json({ status: false, message: "No booking found for this property" });
        }

        // Insert the review
        const insertQuery = `
            INSERT INTO reviews (booking_id, reviewer_id, reviewed_id, review_type, rating, comment)
            VALUES (?, ?, ?, 'guest', ?, ?)
        `;
        await db.promise().query(insertQuery, [booking[0].booking_id, userId, booking[0].host_id, rating, comment]);

        res.json({ status: true, message: "Review added successfully" });
    } catch (err) {
        console.error("Add property review error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});






































// Export the router
module.exports = router;