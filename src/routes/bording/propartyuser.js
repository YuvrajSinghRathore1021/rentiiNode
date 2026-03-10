const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');


// Get all properties with details for a user
router.get('/getAllProperties', async (req, res) => {
    try {
        const userId = req?.user?.user_id || 0;

        let {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "price_per_night",
            sortOrder = "asc",
            latitude,
            longitude,
            radius = 5,
            totalGuests = 0
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        /* ---------------- SAFE SORTING ---------------- */
        const allowedSort = ["price_per_night", "title", "max_guests"];
        const allowedOrder = ["asc", "desc"];

        const finalSortBy = allowedSort.includes(sortBy)
            ? sortBy
            : "price_per_night";

        const finalSortOrder = allowedOrder.includes(sortOrder.toLowerCase())
            ? sortOrder
            : "asc";

        /* ---------------- MAIN QUERY ---------------- */
        let query = `
            SELECT 
                p.property_id,
                p.title,
                p.description,
                p.property_type,
                p.room_type,
                p.max_guests,
                p.bedrooms,
                p.beds,
                p.bathrooms,
                p.price_per_night,
                pa.street_address,
                pa.city,
                p.latitude,
                p.longitude,
                p.weekday_price,
                p.weekend_price,
                pa.state_province,
                pa.postal_code,
                pa.country,

                (
                    SELECT GROUP_CONCAT(DISTINCT a.name SEPARATOR ', ')
                    FROM property_amenities pa2
                    JOIN amenities a 
                        ON pa2.amenity_id = a.amenity_id
                    WHERE pa2.property_id = p.property_id
                ) AS amenities,

                (
                    SELECT GROUP_CONCAT(DISTINCT pi.image_url SEPARATOR ', ')
                    FROM property_images pi
                    WHERE pi.property_id = p.property_id
                ) AS images

            FROM properties p
            LEFT JOIN property_addresses pa 
                ON p.property_id = pa.property_id
            WHERE 1=1
        `;

        const queryParams = [];

        /* ---------------- SEARCH ---------------- */
        if (search) {
            const pattern = `%${search}%`;
            query += `
                AND (
                    p.title LIKE ? 
                    OR p.description LIKE ? 
                    OR pa.street_address LIKE ?
                )
            `;
            queryParams.push(pattern, pattern, pattern);
        }

        /* ---------------- GEO FILTER ---------------- */
        if (latitude && longitude) {
            query += `
                AND ST_Distance_Sphere(
                    POINT(pa.longitude, pa.latitude),
                    POINT(?, ?)
                ) <= ? * 1000
            `;
            queryParams.push(
                parseFloat(longitude),
                parseFloat(latitude),
                parseFloat(radius)
            );
        }

        /* ---------------- GUEST FILTER ---------------- */
        if (totalGuests) {
            query += ` AND p.max_guests >= ?`;
            queryParams.push(parseInt(totalGuests));
        }

        /* ---------------- SORT + PAGINATION ---------------- */
        query += `
            ORDER BY ${finalSortBy} ${finalSortOrder}
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, (page - 1) * limit);

        const [properties] = await db.promise().query(query, queryParams);

        /* ---------------- COUNT QUERY ---------------- */
        let countQuery = `
            SELECT COUNT(DISTINCT p.property_id) AS total
            FROM properties p
            LEFT JOIN property_addresses pa
                ON p.property_id = pa.property_id
            WHERE 1=1
        `;

        const countParams = [];

        if (search) {
            const pattern = `%${search}%`;
            countQuery += `
                AND (
                    p.title LIKE ? 
                    OR p.description LIKE ? 
                    OR pa.street_address LIKE ?
                )
            `;
            countParams.push(pattern, pattern, pattern);
        }

        if (latitude && longitude) {
            countQuery += `
                AND ST_Distance_Sphere(
                    POINT(pa.longitude, pa.latitude),
                    POINT(?, ?)
                ) <= ? * 1000
            `;
            countParams.push(
                parseFloat(longitude),
                parseFloat(latitude),
                parseFloat(radius)
            );
        }

        if (totalGuests) {
            countQuery += ` AND p.max_guests >= ?`;
            countParams.push(parseInt(totalGuests));
        }

        const [countResult] = await db.promise().query(countQuery, countParams);

        /* ---------------- FORMAT DATA ---------------- */
        const formattedProperties = await Promise.all(
            properties.map(async (p) => ({
                ...p,
                amenities: p.amenities ? p.amenities.split(", ") : [],
                images: p.images ? p.images.split(", ") : [],
                favourite: await favouriteCheck(userId, p.property_id)
            }))
        );

        return res.json({
            status: true,
            data: formattedProperties,
            total: countResult[0].total,
            page,
            limit
        });

    } catch (err) {
        console.error("Get properties error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});



// // user favourite
router.get('/getfavouriteProperties', async (req, res) => {
    try {
        const userId = req?.user?.user_id || 0;

        let {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "price_per_night",
            sortOrder = "asc",
            latitude,
            longitude,
            radius = 5
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        /* -------- SAFE SORT -------- */
        const allowedSort = ["price_per_night", "title", "city"];
        const allowedOrder = ["asc", "desc"];

        const finalSortBy = allowedSort.includes(sortBy)
            ? sortBy
            : "price_per_night";

        const finalSortOrder = allowedOrder.includes(sortOrder.toLowerCase())
            ? sortOrder
            : "asc";

        /* -------- MAIN QUERY -------- */
        let query = `
            SELECT 
                p.property_id,
                p.title,
                p.price_per_night,
                pa.street_address,
                pa.city,
                p.latitude,
                p.longitude,
                p.weekday_price,
                p.weekend_price,
                pa.state_province,
                pa.postal_code,
                pa.country,

                (
                    SELECT GROUP_CONCAT(DISTINCT a.name SEPARATOR ', ')
                    FROM property_amenities pa2
                    JOIN amenities a 
                        ON pa2.amenity_id = a.amenity_id
                    WHERE pa2.property_id = p.property_id
                ) AS amenities,

                (
                    SELECT GROUP_CONCAT(DISTINCT pi.image_url SEPARATOR ', ')
                    FROM property_images pi
                    WHERE pi.property_id = p.property_id
                ) AS images

            FROM properties p
            JOIN property_addresses pa 
                ON p.property_id = pa.property_id
            JOIN favourites fav 
                ON fav.property_id = p.property_id 
                AND fav.user_id = ?
            WHERE 1=1
        `;

        const params = [userId];

        /* -------- SEARCH -------- */
        if (search) {
            const pattern = `%${search}%`;
            query += `
                AND (
                    p.title LIKE ?
                    OR p.description LIKE ?
                    OR pa.street_address LIKE ?
                )
            `;
            params.push(pattern, pattern, pattern);
        }

        /* -------- GEO FILTER -------- */
        if (latitude && longitude) {
            query += `
                AND ST_Distance_Sphere(
                    POINT(pa.longitude, pa.latitude),
                    POINT(?, ?)
                ) <= ? * 1000
            `;
            params.push(
                parseFloat(longitude),
                parseFloat(latitude),
                parseFloat(radius)
            );
        }

        /* -------- PAGINATION -------- */
        query += `
            ORDER BY ${finalSortBy} ${finalSortOrder}
            LIMIT ? OFFSET ?
        `;

        params.push(limit, (page - 1) * limit);

        const [properties] = await db.promise().query(query, params);

        /* -------- COUNT QUERY -------- */
        let countQuery = `
            SELECT COUNT(DISTINCT p.property_id) AS total
            FROM properties p
            JOIN property_addresses pa 
                ON p.property_id = pa.property_id
            JOIN favourites fav 
                ON fav.property_id = p.property_id 
                AND fav.user_id = ?
            WHERE 1=1
        `;

        const countParams = [userId];

        if (search) {
            const pattern = `%${search}%`;
            countQuery += `
                AND (
                    p.title LIKE ?
                    OR p.description LIKE ?
                    OR pa.street_address LIKE ?
                )
            `;
            countParams.push(pattern, pattern, pattern);
        }

        if (latitude && longitude) {
            countQuery += `
                AND ST_Distance_Sphere(
                    POINT(pa.longitude, pa.latitude),
                    POINT(?, ?)
                ) <= ? * 1000
            `;
            countParams.push(
                parseFloat(longitude),
                parseFloat(latitude),
                parseFloat(radius)
            );
        }

        const [countResult] = await db.promise().query(countQuery, countParams);

        /* -------- FORMAT DATA -------- */
        const formatted = properties.map(p => ({
            ...p,
            amenities: p.amenities ? p.amenities.split(", ") : [],
            images: p.images ? p.images.split(", ") : [],
            favourite: true
        }));

        res.json({
            status: true,
            data: formatted,
            total: countResult[0].total,
            page,
            limit
        });

    } catch (err) {
        console.error("Favourite properties error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
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
            FROM properties p
            JOIN  property_addresses pa ON p.property_id = pa.property_id
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
    const userId = req.user.user_id;
    const { page = 1, limit = 10 } = req.query;

    try {
        let query = `
            SELECT 
                b.booking_id,
                b.property_id,
                b.check_in_date,
                b.check_out_date,
                b.total_price,
                b.status,
                b.guests_count,

                p.title AS property_title,

                pa.street_address,
                pa.city,
                pa.state_province,
                pa.country,
                pa.latitude,
                pa.longitude,

                 (
                    SELECT GROUP_CONCAT(DISTINCT pi.image_url SEPARATOR ', ')
                    FROM property_images pi
                    WHERE pi.property_id = p.property_id
                ) AS images

            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            LEFT JOIN property_addresses pa ON pa.property_id = p.property_id

            WHERE b.guest_id = ?
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `;


        const [bookings] = await db.promise().query(query, [
            userId, parseInt(limit),
            (parseInt(page) - 1) * parseInt(limit)
        ]);

        if (bookings.length === 0) {
            return res.status(200).json({
                status: false,
                message: "No bookings found"
            });
        }

        // 🔹 Format response
        const formattedData = bookings.map(item => ({
            booking_id: item.booking_id,
            property_id: item.property_id,
            property_title: item.property_title,
            check_in_date: item.check_in_date,
            check_out_date: item.check_out_date,
            total_price: item.total_price,
            status: item.status == 3 ? "cancelled" : "completed",
            guests_count: item.guests_count,

            images: item.images ? item.images.split(",") : [],

            address: {
                street_address: item.street_address,
                city: item.city,
                state: item.state_province,
                country: item.country,
                latitude: item.latitude,
                longitude: item.longitude
            }
        }));

        const countQuery = `
            SELECT COUNT(booking_id) AS total 
            FROM bookings 
            WHERE guest_id = ?
        `;
        const [countResult] = await db.promise().query(countQuery, [userId]);

        res.json({
            status: true,
            data: formattedData,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (err) {
        console.error("Get user bookings error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Get reviews for a user 
router.get('/review/view', async (req, res) => {
    const userId = req?.user?.user_id || 0; // Assuming user ID is stored in req.user
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
            JOIN property_addresses pa ON  p.property_id = pa.property_id
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
            JOIN property_addresses pa ON  p.property_id = pa.property_id
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
    const userId = req?.user?.user_id || 0; // Assuming user ID is stored in req.user
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
    const userId = req?.user?.user_id || 0; // Assuming user ID is stored in req.user
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
    const userId = req?.user?.user_id || 0; // Assuming user ID is stored in req.user

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

const favouriteCheck = async (userId, propertyId) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT user_id FROM favourites WHERE user_id = ? AND property_id = ? LIMIT 1`,
            [userId, propertyId]
        );
        return rows.length > 0; // ✅ returns true or false
    } catch (err) {
        console.error("Error checking favourite:", err);
        return false;
    }
};


router.get('/getProperty', async (req, res) => {
    const { property_id } = req.query;

    if (!property_id) {
        return res.status(400).json({ status: false, message: "Property ID is required" });
    }

    try {
        // 1️⃣ PROPERTY MAIN DATA
        const [property] = await db.promise().query(
            `SELECT 
                p.property_id,
                p.title,
                p.description,
                p.property_type,
                p.max_guests,
                p.bedrooms,
                p.bathrooms,
                p.price_per_night,
                p.cleaning_fee,
                p.latitude,
                p.longitude,
                h.host_id,
                h.host_name,
                h.created_at as experience_years,
                h.profile as avatar_url,
                h.response_time as response_rate
            FROM properties p
            LEFT JOIN host_profiles h ON p.host_id = h.host_id
            WHERE p.property_id = ?`,
            [property_id]
        );

        if (property.length === 0) {
            return res.status(404).json({ status: false, message: "Property not found" });
        }

        const p = property[0];

        // 2️⃣ LOCATION DETAILS
        const [location] = await db.promise().query(
            `SELECT city, state_province AS state, country,
                    CONCAT(city, ', ', state_province, ', ', country) AS full_address
             FROM property_addresses
             WHERE property_id = ?`,
            [property_id]
        );

        // 3️⃣ GALLERY IMAGES
        const [gallery] = await db.promise().query(
            `SELECT image_url 
             FROM property_images
             WHERE property_id = ?`,
            [property_id]
        );

        // 4️⃣ AMENITIES
        const [amenities] = await db.promise().query(
            `SELECT name 
             FROM property_amenities pa
             JOIN amenities a ON pa.amenity_id = a.amenity_id
             WHERE pa.property_id = ?`,
            [property_id]
        );

        // 5️⃣ REVIEWS
        const [reviews] = await db.promise().query(
            `SELECT 
                r.comment AS review_text,
                r.rating,
                r.created_at AS date,
                u.name,
                u.profile_picture_url as avatar_url
             FROM reviews r
             JOIN users u ON r.reviewer_id = u.user_id
             WHERE r.property_id = ?`,
            [property_id]
        );

        // 6️⃣ HOUSE RULES + SAFETY + CANCELLATION
        const [rules] = await db.promise().query(
            `SELECT *
             FROM house_rules
             WHERE property_id = ?`,
            [property_id]
        );

        // 7️⃣ BUILD FINAL STRUCTURED JSON
        const responseData = {
            property_id: p.property_id,
            title: p.title,
            rating: 4.92,              // You can calculate avg rating
            total_reviews: reviews.length,
            is_superhost: true,        // Optional dynamic field

            location: location[0] || {},

            host: {
                name: p.host_name,
                experience_years: p.experience_years,
                avatar_url: p.avatar_url,
                total_reviews: reviews.length,
                rating: 4.92,
                response_rate: p.response_rate
            },

            gallery: gallery.map(img => ({ image_url: img.image_url })),

            features: {
                property_type: p.property_type,
                guests: p.max_guests,
                bedrooms: p.bedrooms,
                baths: p.bathrooms
            },

            description: p.description ? p.description.split("\n") : "",

            sleeping_arrangements: [
                { title: "Bedroom 1", description: "1 King Bed" },
                { title: "Bedroom 2", description: "1 Queen Bed" }
            ],

            amenities: amenities.map(a => a.name),
            reviews: reviews.map(r => ({
                name: r.name,
                date: r.date,
                avatar_url: r.avatar_url,
                review_text: r.review_text
            })),

            things_to_know: {
                house_rules: [
                    `Check-in: ${rules[0]?.check_in_time}`,
                    `Checkout: ${rules[0]?.check_out_time}`,
                    `${p.max_guests} guests maximum`,
                    rules[0]?.no_smoking ? "No smoking" : "",
                    rules[0]?.no_pets ? "No pets" : ""
                ].filter(Boolean),

                safety: [
                    rules[0]?.carbon_monoxide ? "Carbon monoxide alarm" : "",
                    rules[0]?.smoke_alarm ? "Smoke alarm" : "",
                    "Security cameras on property"
                ].filter(Boolean),

                cancellation_policy: [
                    rules[0]?.cancellation_policy || "Free cancellation for 48 hours"
                ]
            },

            map: {
                latitude: p.latitude,
                longitude: p.longitude
            },

            pricing: {
                price_per_night: p.price_per_night
            }
        };

        res.json({
            status: 1,
            message: "Property details fetched successfully",
            data: responseData
        });

    } catch (err) {
        console.error("Get property details error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// ///////new price 
router.post('/pricing', async (req, res) => {
    const { property_id, startDate, endDate, adults, children, infants } = req.body;

    const [property] = await db.promise().query(
        `SELECT p.property_id, p.max_guests, p.price_per_night, p.cleaning_fee FROM properties p WHERE p.property_id = ?`,
        [property_id]
    );

    if (property.length === 0) {
        return res.status(200).json({ status: false, message: "Property not found" });
    } else {
        const p = property[0];

        let guestCount = adults + children;
        if (guestCount > p.max_guests) {
            return res.status(200).json({ status: false, message: `Guest count exceeds maximum allowed (${p.max_guests})` });
        }

        // Calculate number of nights
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const pricePerNight = Number(p.price_per_night);
        const cleaningFee = Number(p.cleaning_fee);

        const totalPrice = (pricePerNight * numberOfNights) + cleaningFee;


        res.json({
            status: true,
            data: {
                total_nights: numberOfNights,
                total: totalPrice,
                total_nights_price: p.price_per_night * numberOfNights,
                price_per_night: p.price_per_night,
                cleaning_fee: p.cleaning_fee,
            }
        });

    }


});



router.get('/propertybookingDetails', async (req, res) => {
    const { booking_id } = req.query;
    try {

        const [orderInfo] = await db.promise().query(`
            SELECT 
                b.booking_id,
                b.property_id,
                b.order_id,
                b.check_in_date,
                b.check_out_date,
                b.total_price,
                b.status,
                b.guests_count,
                b.adults,b.children,b.infants,
                b.created_at as booking_created_at,
                
                -- Payment info
                p.payment_id,
                p.amount as payment_amount,
                p.payment_method,
                p.status as payment_status
                
            FROM bookings b
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE b.booking_id = ?
            ORDER BY b.created_at DESC
            LIMIT 1
        `, [booking_id]);
        let propertyId = orderInfo[0].property_id

        if (!propertyId) {
            return res.status(400).json({
                status: false,
                message: "Property ID is required"
            });
        }
        // 1. Get property basic details with place information
        const [propertyBasic] = await db.promise().query(`
            SELECT 
                p.property_id,
                p.title,
                p.description,
                p.property_type,
                p.listing_type,
                p.max_guests,
                p.price_per_night,
                p.weekend_price,
                p.created_at,
                                
                -- Address details
                pa.street_address,
                pa.city,
                pa.state_province,
                pa.postal_code,
                pa.country,
                pa.latitude,
                pa.longitude           
                 
            FROM properties p
            LEFT JOIN property_addresses pa ON p.property_id = pa.property_id
            WHERE p.property_id = ?
        `, [propertyId]);

        if (propertyBasic.length === 0) {
            return res.json({
                status: false,
                message: "Property not found"
            });
        }

        // 2. Get property images
        const [propertyImages] = await db.promise().query(`
            SELECT image_url, is_primary, caption 
            FROM property_images 
            WHERE property_id = ?
            ORDER BY is_primary DESC
        `, [propertyId]);

        // 3. Get check-in/check-out times
        const [checkinTimes] = await db.promise().query(`
            SELECT starttime, endtime, checkouttime
            FROM property_checkin 
            WHERE property_id = ?
        `, [propertyId]);

        // 4. Get house rules
        const [houseRules] = await db.promise().query(`
            SELECT 
                no_pets,
                no_smoking,
                no_parties,
                no_children,
                check_in_time,
                check_out_time,
                other_rules
            FROM house_rules 
            WHERE property_id = ?
        `, [propertyId]);

        // 5. Get amenities (house offers)
        const [amenities] = await db.promise().query(`
            SELECT a.name, a.value, a.category, a.icon_class
            FROM property_amenities pa
            JOIN amenities a ON pa.amenity_id = a.amenity_id
            WHERE pa.property_id = ?
        `, [propertyId]);

        // 6. Get cancellation policy
        const [cancellationPolicy] = await db.promise().query(`
            SELECT standardpolicy, longtermstaypolicy
            FROM property_cancellation_policy 
            WHERE property_id = ?
        `, [propertyId]);

        // 7. Get host details
        const [hostDetails] = await db.promise().query(`
            SELECT 
                hp.host_id,
                hp.host_name,
                hp.email as host_email,
                hp.phone_number as host_phone,
                hp.headline,
                hp.bio,
                hp.language_spoken,
                hp.response_time,
                hp.host_since,
                hp.govt_id_verified,
                hp.profile as profile_picture,
                
                -- Host address
                ha.country as host_country,
                ha.city as host_city,
                ha.street_address as host_street_address,
                
                -- User details
                u.name as user_name,
                u.profile_picture_url as user_profile_picture,
                u.about as user_about,
                u.is_verified_email
                
            FROM properties p
            JOIN host_profiles hp ON p.host_id = hp.host_id
            LEFT JOIN host_addresses ha ON hp.host_id = ha.host_id
            LEFT JOIN users u ON hp.user_id = u.user_id
            WHERE p.property_id = ?
        `, [propertyId]);



        // 9. Generate confirmation code (you can generate based on property ID + timestamp)
        const confirmationCode = Math.floor(10000 + Math.random() * 90000).toString();

        // 10. Format house rules array
        const formattedHouseRules = [];
        if (houseRules.length > 0) {
            const rules = houseRules[0];
            if (rules.no_pets === 1) formattedHouseRules.push("No pets");
            if (rules.no_smoking === 1) formattedHouseRules.push("No smoking");
            if (rules.no_parties === 1) formattedHouseRules.push("No parties/events");
            if (rules.no_children === 1) formattedHouseRules.push("Not suitable for children");
            if (rules.other_rules) formattedHouseRules.push(rules.other_rules);
        }

        // 11. Format check-in/out times
        let checkInTime = "3:00 PM"; // default
        let checkOutTime = "11:00 AM"; // default

        if (checkinTimes.length > 0) {
            if (checkinTimes[0].starttime) checkInTime = checkinTimes[0].starttime;
            if (checkinTimes[0].checkouttime) checkOutTime = checkinTimes[0].checkouttime;
        }

        // 12. Format the response according to your structure
        const responseData = [{
            place_details: {
                place_images: propertyImages.map(img => img.image_url),
                check_in: checkInTime,
                check_out: checkOutTime,
                address: {
                    street_address: propertyBasic[0]?.street_address,
                    city: propertyBasic[0]?.city,
                    state_province: propertyBasic[0]?.state_province,
                    postal_code: propertyBasic[0]?.postal_code,
                    country: propertyBasic[0]?.country,
                    latitude: propertyBasic[0]?.latitude,
                    longitude: propertyBasic[0]?.longitude
                },
                things_to_know: houseRules[0]?.other_rules || "No specific rules",
                your_place: propertyBasic[0].street_address || "Address",
                latitude: propertyBasic[0].latitude,
                longitude: propertyBasic[0].longitude,
            },
            reservation_details: {
                number_of_guests: propertyBasic[0].max_guests?.toString() || "0",
                confirmation_code: confirmationCode,
                cancellation_policy: cancellationPolicy[0]?.standardpolicy || "Flexible"
            },
            check_in_out: {
                check_in_method: "keypad", // You can fetch this from your database if available
                how_to_get_inside: houseRules[0]?.other_rules || "Check-in instructions will be provided"
            },
            house_offers: amenities.map(a => a.name),
            house_rules: formattedHouseRules,
            host_details: hostDetails.length > 0 ? {
                name: hostDetails[0].host_name || hostDetails[0].user_name,
                email: hostDetails[0].host_email,
                phone: hostDetails[0].host_phone,
                headline: hostDetails[0].headline,
                bio: hostDetails[0].bio,
                languages: hostDetails[0].language_spoken,
                response_time: hostDetails[0].response_time,
                host_since: hostDetails[0].host_since,
                verified: hostDetails[0].govt_id_verified === 1,
                profile_picture: hostDetails[0].profile_picture || hostDetails[0].user_profile_picture,
                location: hostDetails[0].host_city ? `${hostDetails[0].host_city}, ${hostDetails[0].host_country}` : "Location not specified"
            } : "Host details not available",
            order_info: orderInfo.length > 0 ? {
                booking_id: orderInfo[0].booking_id,
                order_id: orderInfo[0].order_id,
                check_in: orderInfo[0].check_in_date,
                check_out: orderInfo[0].check_out_date,
                total_price: orderInfo[0].total_price,
                guests: orderInfo[0].guests_count,

                adults: orderInfo[0].adults,
                children: orderInfo[0].children,
                infants: orderInfo[0].infants,

                status: orderInfo[0].status,
                payment: orderInfo[0].payment_id ? {
                    amount: orderInfo[0].payment_amount,
                    method: orderInfo[0].payment_method,
                    status: orderInfo[0].payment_status
                } : null
            } : "No active booking found"
        }];

        res.json({
            status: true,
            data: responseData
        });

    } catch (err) {
        console.error("Error fetching property details:", err);
        res.status(500).json({
            status: false,
            message: "Server error while fetching property details",
            error: err.message
        });
    }
});


// manage guest 
// Manage Booking API - Handle all booking operations

router.post("/manageBooking", async (req, res) => {
    const {
        booking_id,
        type, // // manage_guests, update_dates, cancel_booking
        adults,
        children,
        infants,
        check_in_date,
        check_out_date,
        cancellation_reason
    } = req.body;

    // Validate required fields
    if (!booking_id) {
        return res.json({
            status: 0,
            message: "Booking ID is required"
        });
    }

    if (!type) {
        return res.json({
            status: 0,
            message: "Operation type is required"
        });
    }

    // Validate type against allowed values
    const allowedTypes = ['manage_guests', 'update_dates', 'cancel_booking'];
    if (!allowedTypes.includes(type)) {
        return res.json({
            status: 0,
            message: "Invalid operation type. Allowed types: manage_guests, update_dates, cancel_booking"
        });
    }

    try {
        let query = "";
        let values = [];
        let responseMessage = "";
        let paymentType = "";
        let refundReference = ""

        switch (type) {
            // 1. MANAGE GUESTS - Update guest counts
            case "manage_guests":
                // Validate guest counts
                if (adults === undefined || adults === null || adults < 0) {
                    return res.json({
                        status: 0,
                        message: "Valid adults count is required and must be 0 or greater"
                    });
                }

                // Validate individual counts are numbers and non-negative
                const parsedAdults = parseInt(adults) || 0;
                const parsedChildren = parseInt(children) || 0;
                const parsedInfants = parseInt(infants) || 0;

                if (parsedAdults < 0 || parsedChildren < 0 || parsedInfants < 0) {
                    return res.json({
                        status: 0,
                        message: "Guest counts cannot be negative"
                    });
                }

                // Calculate total guests
                const total_guests = parsedAdults + parsedChildren + parsedInfants;

                // Validate at least one adult
                if (parsedAdults === 0) {
                    return res.json({
                        status: 0,
                        message: "At least one adult is required"
                    });
                }

                // First check if booking exists and get property max guests
                const [bookingCheck] = await db.promise().query(
                    `SELECT b.*, p.max_guests, b.status 
                     FROM bookings b
                     JOIN properties p ON b.property_id = p.property_id
                     WHERE b.booking_id = ?`,
                    [booking_id]
                );

                if (bookingCheck.length === 0) {
                    return res.json({
                        status: 0,
                        message: "Booking not found"
                    });
                }

                // Check if booking can be modified (not cancelled or completed)
                if (bookingCheck[0].status === 3) {
                    return res.json({
                        status: 0,
                        message: "Cannot modify a cancelled booking"
                    });
                }

                // Validate against max guests
                if (total_guests > bookingCheck[0].max_guests) {
                    return res.json({
                        status: 0,
                        message: `Maximum ${bookingCheck[0].max_guests} guests allowed for this property`
                    });
                }

                query = `UPDATE bookings SET guests_count = ?,adults = ?,children = ?,infants = ?, 
                         updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?`;

                values = [total_guests, parsedAdults, parsedChildren, parsedInfants, booking_id];
                responseMessage = "Guest count updated successfully";
                break;

            // 2. UPDATE DATES - Change check-in/out dates with payment handling
            case "update_dates":
                if (!check_in_date || !check_out_date) {
                    return res.json({
                        status: 0,
                        message: "Check-in and check-out dates are required"
                    });
                }

                // Validate date format
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(check_in_date) || !dateRegex.test(check_out_date)) {
                    return res.json({
                        status: 0,
                        message: "Invalid date format. Use YYYY-MM-DD"
                    });
                }

                // Validate dates
                const checkIn = new Date(check_in_date);
                const checkOut = new Date(check_out_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
                    return res.json({
                        status: 0,
                        message: "Invalid date values"
                    });
                }

                if (checkIn < today) {
                    return res.json({
                        status: 0,
                        message: "Check-in date cannot be in the past"
                    });
                }

                if (checkOut <= checkIn) {
                    return res.json({
                        status: 0,
                        message: "Check-out date must be after check-in date"
                    });
                }

                // Get current booking details
                const [currentBooking] = await db.promise().query(
                    `SELECT b.*, p.price_per_night, p.title as property_title,
                            u.name as guest_name, u.email as guest_email, u.user_id
                     FROM bookings b
                     JOIN properties p ON b.property_id = p.property_id
                     JOIN users u ON b.guest_id = u.user_id
                     WHERE b.booking_id = ?`,
                    [booking_id]
                );

                if (currentBooking.length === 0) {
                    return res.json({
                        status: 0,
                        message: "Booking not found"
                    });
                }

                const booking = currentBooking[0];

                // Check if booking can be modified
                if (booking.status === 3) {
                    return res.json({
                        status: 0,
                        message: "Cannot modify a cancelled booking"
                    });
                }

                // Check if property is available for new dates
                const [availabilityCheck] = await db.promise().query(
                    `SELECT b.* FROM bookings b 
                     WHERE b.property_id = ? 
                     AND b.booking_id != ?
                     AND b.status IN (1, 2) 
                     AND (
                         (check_in_date <= ? AND check_out_date > ?) OR
                         (check_in_date < ? AND check_out_date >= ?) OR
                         (check_in_date >= ? AND check_out_date <= ?)
                     )`,
                    [booking.property_id, booking_id,
                        check_out_date, check_in_date,
                        check_out_date, check_in_date,
                        check_in_date, check_out_date]
                );

                if (availabilityCheck.length > 0) {
                    return res.json({
                        status: 0,
                        message: "Property is not available for selected dates"
                    });
                }

                // Calculate nights and new price
                const currentCheckIn = new Date(booking.check_in_date);
                const currentCheckOut = new Date(booking.check_out_date);

                const currentNights = Math.ceil((currentCheckOut - currentCheckIn) / (1000 * 60 * 60 * 24));
                const newNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

                if (newNights < 1) {
                    return res.json({
                        status: 0,
                        message: "Booking must be for at least 1 night"
                    });
                }

                const pricePerNight = parseFloat(booking.price_per_night);
                const currentTotalPrice = parseFloat(booking.total_price);
                const newTotalPrice = newNights * pricePerNight;

                // Calculate price difference
                const priceDifference = newTotalPrice - currentTotalPrice;

                // If price increased, need additional payment
                if (Math.abs(priceDifference) > 0.01) { // Handle floating point precision
                    const paymentReference = "PAY_" + Date.now() + "_" + booking_id;

                    if (priceDifference > 0) {
                        // Create pending payment record
                        await db.promise().query(
                            `INSERT INTO pending_payments 
                             (booking_id, amount, payment_type, status, reference, created_at) 
                             VALUES (?, ?, 'date_change', 0, ?, NOW())`,
                            [booking_id, priceDifference.toFixed(2), paymentReference]
                        );

                        // Update booking with new dates but keep status as pending_payment
                        query = `UPDATE bookings SET 
                                check_in_date = ?,
                                check_out_date = ?,
                                total_price = ?,
                                previous_total_price = ?,
                                price_difference = ?,
                                payment_status = 'pending_additional',
                                payment_reference = ?,
                                updated_at = CURRENT_TIMESTAMP
                                WHERE booking_id = ?`;

                        values = [check_in_date, check_out_date, newTotalPrice.toFixed(2),
                            currentTotalPrice.toFixed(2), priceDifference.toFixed(2),
                            paymentReference, booking_id];

                        responseMessage = `Dates updated. Additional payment of $${priceDifference.toFixed(2)} required. Payment reference: ${paymentReference}`;

                        // Send notification to guest for additional payment
                        // await db.promise().query(
                        //     `INSERT INTO notifications (user_id, title, message, type, created_at)
                        //      VALUES (?, 'Additional Payment Required', 
                        //      CONCAT('Your date change request requires additional payment of $', ?, 
                        //             '. Please complete the payment using reference: ', ?), 
                        //      'payment_required', NOW())`,
                        //     [booking.guest_id, priceDifference.toFixed(2), paymentReference]
                        // );
                        refundReference = paymentReference;
                        paymentType = "additionalPayment"
                    } else {
                        // Price decreased - process refund
                        const refundAmount = Math.abs(priceDifference);
                        refundReference = "REF_" + Date.now() + "_" + booking_id;

                        await db.promise().query(
                            `INSERT INTO refunds 
                             (booking_id, amount, refund_type, status, reference, created_at) 
                             VALUES (?, ?, 'date_change', 0, ?, NOW())`,
                            [booking_id, refundAmount.toFixed(2), refundReference]
                        );

                        query = `UPDATE bookings SET 
                                check_in_date = ?,
                                check_out_date = ?,
                                total_price = ?,
                                previous_total_price = ?,
                                price_difference = ?,
                                refund_amount = ?,
                                refund_reference = ?,
                                updated_at = CURRENT_TIMESTAMP
                                WHERE booking_id = ?`;

                        values = [check_in_date, check_out_date, newTotalPrice.toFixed(2),
                            currentTotalPrice.toFixed(2), priceDifference.toFixed(2),
                            refundAmount.toFixed(2), refundReference, booking_id];

                        responseMessage = `Dates updated. Refund of $${refundAmount.toFixed(2)} will be processed. Reference: ${refundReference}`;
                        refundReference = refundReference;
                        paymentType = "refund"
                    }
                } else {
                    // Price same - direct update
                    query = `UPDATE bookings SET 
                            check_in_date = ?,
                            check_out_date = ?,
                            updated_at = CURRENT_TIMESTAMP
                            WHERE booking_id = ?`;

                    values = [check_in_date, check_out_date, booking_id];
                    responseMessage = "Booking dates updated successfully";
                }
                break;

            // 3. CANCEL BOOKING
            case "cancel_booking":
                if (!cancellation_reason || cancellation_reason.trim() === '') {
                    return res.json({
                        status: 0,
                        message: "Cancellation reason is required"
                    });
                }

                // Check if booking exists and get cancellation policy
                const [cancelCheck] = await db.promise().query(
                    `SELECT b.*, pcp.standardpolicy, b.status 
                     FROM bookings b
                     LEFT JOIN property_cancellation_policy pcp ON b.property_id = pcp.property_id
                     WHERE b.booking_id = ?`,
                    [booking_id]
                );

                if (cancelCheck.length === 0) {
                    return res.json({
                        status: 0,
                        message: "Booking not found"
                    });
                }

                const bookingdata = cancelCheck[0];

                // Check if already cancelled
                if (bookingdata.status === 3) {
                    return res.json({
                        status: 0,
                        message: "Booking is already cancelled"
                    });
                }

                const checkInDate = new Date(bookingdata.check_in_date);
                const today_cancel = new Date();
                today_cancel.setHours(0, 0, 0, 0);

                const daysUntilCheckIn = Math.ceil((checkInDate - today_cancel) / (1000 * 60 * 60 * 24));

                // Apply cancellation policy
                let refund_amount = 0;
                const policy = bookingdata.standardpolicy || "flexible";

                switch (policy.toLowerCase()) {
                    case "flexible":
                        if (daysUntilCheckIn >= 1) refund_amount = bookingdata.total_price;
                        break;
                    case "moderate":
                        if (daysUntilCheckIn >= 5) refund_amount = bookingdata.total_price;
                        else if (daysUntilCheckIn >= 3) refund_amount = bookingdata.total_price * 0.5;
                        break;
                    case "strict":
                        if (daysUntilCheckIn >= 7) refund_amount = bookingdata.total_price * 0.5;
                        break;
                    default:
                        refund_amount = 0;
                }

                // Update booking status
                query = `UPDATE bookings SET 
                        status = 3,
                        cancellation_reason = ?,
                        cancellation_date = NOW(),
                        updated_at = CURRENT_TIMESTAMP
                        WHERE booking_id = ?`;

                values = [cancellation_reason, booking_id];
                const refundAmount = parseFloat(refund_amount) || 0;


                // Log cancellation reason
                await db.promise().query(
                    `INSERT INTO booking_cancellations (booking_id, reason, refund_amount, cancelled_at) 
                     VALUES (?, ?, ?, NOW())`,
                    [booking_id, cancellation_reason, refundAmount]
                );

                responseMessage = `Booking cancelled successfully. Refund amount: $${refundAmount}`;

                refundReference = 0;
                paymentType = "bookingRefund";

                break;
        }

        // Execute the update query if any
        if (query) {
            const [result] = await db.promise().query(query, values);

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Booking not found or no changes made"
                });
            }
        }

        return res.json({
            status: 1,
            message: responseMessage || "Operation completed successfully",
            booking_id: booking_id,
            refundReference,
            paymentType,
        });

    } catch (err) {
        console.error("Manage Booking Error:", err);
        return res.status(500).json({ // Use proper HTTP status code for server errors
            status: 0,
            message: "Server error occurred while processing your request",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined // Only show error details in development
        });
    }
});




// //  View booking payment details
router.post("/payment", async (req, res) => {
    try {
        const { booking_id } = req.body;

        if (!booking_id) {
            return res.status(400).json({ status: 0, message: "booking_id is required" });
        }

        const pendingPaymentsQuery = `SELECT * FROM pending_payments Where booking_id=?`;
        const [pendingPayments] = await db.promise().query(pendingPaymentsQuery, [booking_id]);

        const bookingsQuery = `SELECT * FROM bookings Where booking_id=?`;
        const [bookings] = await db.promise().query(bookingsQuery, [booking_id]);

        const paymentsQuery = `SELECT * FROM payments Where booking_id=?`;
        const [payments] = await db.promise().query(paymentsQuery, [booking_id]);

        const refundsQuery = `SELECT * FROM refunds Where booking_id=?`;
        const [refunds] = await db.promise().query(refundsQuery, [booking_id]);



        return res.json({
            status: 1,
            message: "data found",
            pendingPayments: pendingPayments,
            bookings: bookings,
            payments: payments,
            refunds: refunds
        });

    } catch (err) {
        console.error("Error fetching payment details:", err);
        return res.status(500).json({
            status: 0,
            message: "Server error",
            error: err.message
        });
    }
});





// Export the router
module.exports = router;