const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');


// Get all properties with details for a user
// router.get('/getAllProperties', async (req, res) => {
//     const userId = req?.user?.user_id || 0;
//     const { page = 1, limit = 10, search = "", sortBy = "price_per_night", sortOrder = "asc", latitude, longitude, radius = 5, startDate = "", endDate = "", totalGuests = 0 } = req.query;

//     try {
//         let query = `
//             SELECT 
//     p.property_id,
//     p.title,
//     p.description,
//     p.property_type,
//     p.room_type,
//     p.max_guests,
//     p.bedrooms,
//     p.beds,
//     p.bathrooms,
//     p.price_per_night,
//     pa.street_address,
//     pa.city,
//     p.latitude,
//     p.longitude,
//     p.weekday_price,
//     p.weekend_price,
//     pa.state_province,
//     pa.postal_code,
//     pa.country,

//     (
//         SELECT GROUP_CONCAT(DISTINCT a.name SEPARATOR ', ')
//         FROM property_amenities pa2
//         JOIN amenities a ON pa2.amenity_id = a.amenity_id
//         WHERE pa2.property_id = p.property_id
//     ) AS amenities,

//     (
//         SELECT GROUP_CONCAT(DISTINCT pi.image_url SEPARATOR ', ')
//         FROM property_images pi
//         WHERE pi.property_id = p.property_id
//     ) AS images

// FROM properties p
// LEFT JOIN property_addresses pa 
//     ON p.property_id = pa.property_id
// WHERE 1=1;
//  `;

//         const queryParams = [];
//         if (search) {
//             query += " AND (p.title LIKE ? OR p.description LIKE ? OR pa.street_address LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern, searchPattern);
//         }
//         if (latitude && longitude) {
//             query += ` AND ST_Distance_Sphere(point(pa.longitude, pa.latitude),point(?, ?)) <= ? * 1000`;
//             queryParams.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
//         }

//         if (totalGuests) {
//             console.log("totalGuests", totalGuests);
//             query += ` AND p.max_guests >= ?`;
//             queryParams.push(parseInt(totalGuests));
//         }

//         query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;

//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
//         const [properties] = await db.promise().query(query, queryParams);
//         if (properties.length === 0) {
//             return res.status(200).json({ status: false, message: "No properties found" });
//         }

//         let countQuery = `
//             SELECT COUNT(DISTINCT p.property_id) as total FROM properties p
//             LEFT JOIN property_addresses pa ON  p.property_id = pa.property_id
//             LEFT JOIN property_amenities pa2 ON p.property_id = pa2.property_id
//             LEFT JOIN amenities a ON pa2.amenity_id = a.amenity_id
//         `;

//         if (search) {
//             countQuery += " WHERE (p.title LIKE ? OR p.description LIKE ? OR pa.street_address LIKE ?)";
//         } if (latitude && longitude) {
//             countQuery += ` AND ST_Distance_Sphere(point(pa.longitude, pa.latitude), point(?, ?) ) <= ? * 1000`;
//             countParams.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
//         }

//         const [countResult] = await db.promise().query(countQuery, search ? [searchPattern, searchPattern, searchPattern] : []);

//         const formattedProperties = await Promise.all(
//             properties.map(async (p) => ({
//                 ...p,
//                 amenities: p.amenities ? p.amenities.split(",") : [],
//                 images: p.images ? p.images.split(",") : [],
//                 favourite: await favouriteCheck(userId, p.property_id) // returns true/false
//             }))
//         );

//         res.json({
//             status: true,
//             data: formattedProperties,
//             total: countResult[0].total,
//             page: parseInt(page),
//             limit: parseInt(limit)
//         });
//     } catch (err) {
//         console.error("Get all properties error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

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
// router.get('/getUserBookings', async (req, res) => {
//     const userId = req?.user?.user_id || 0;

//     const { page = 1, limit = 10 } = req.query;
//     try {
//         const query = `
//             SELECT b.booking_id, b.property_id, b.check_in_date, b.check_out_date, b.total_price,
//             b.status, b.guests_count, p.title AS property_title FROM bookings b
//             JOIN properties p ON b.property_id = p.property_id WHERE b.guest_id = ?
//             ORDER BY b.created_at DESC LIMIT ? OFFSET ?
//         `;

//         const [bookings] = await db.promise().query(query, [userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);

//         if (bookings.length === 0) {
//             return res.status(200).json({ status: false, message: "No bookings found" });
//         }

//         let countQuery = "SELECT COUNT(booking_id) as total FROM bookings WHERE guest_id = ?";
//         const [countResult] = await db.promise().query(countQuery, [userId]);

//         res.json({
//             status: true,
//             data: bookings,
//             total: countResult[0].total,
//             page: parseInt(page),
//             limit: parseInt(limit)
//         });
//     } catch (err) {
//         console.error("Get user bookings error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

router.get('/getUserBookings', async (req, res) => {
    const userId = req?.user?.user_id || 0;
    const { page = 1, limit = 10 } = req.query;

    try {
        const query = `
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

                GROUP_CONCAT(pi.image_url) AS images

            FROM bookings b
            JOIN properties p ON b.property_id = p.property_id
            LEFT JOIN property_addresses pa ON pa.property_id = p.property_id
            LEFT JOIN property_images pi ON pi.property_id = p.property_id

            WHERE b.guest_id = ?
            GROUP BY b.booking_id
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [bookings] = await db
            .promise()
            .query(query, [
                userId,
                parseInt(limit),
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
            status: item.status,
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



/////// get book proparty details //////

router.get('/propertybookingDetails', async (req, res) => {
    const { booking_id } = req.query;

    try {
        const [bookingRows] = await db.query(`
      SELECT 
        b.booking_id,
        b.check_in_date,
        b.check_out_date,
        b.check_in_time,
        b.check_out_time,
        b.guests_count,

        p.property_id,
        p.title,

        u.name AS guest_name,
        u.profile_picture_url AS guest_image,

        pa.latitude,
        pa.longitude,
        CONCAT(pa.street_address, ', ', pa.city, ', ', pa.country) AS full_address,

        pc.standardpolicy,

        pay.transaction_id,
        pay.payment_method,
        pay.amount,
        pay.status AS payment_status,

        hp.host_name,
        hp.profile,
        hp.phone_number,
        hp.email,

        fav.property_id AS favourite_property

      FROM bookings b
      JOIN properties p ON p.property_id = b.property_id
      JOIN users u ON u.user_id = b.guest_id
      LEFT JOIN property_addresses pa ON pa.property_id = p.property_id
      LEFT JOIN property_cancellation_policy pc ON pc.property_id = p.property_id
      LEFT JOIN payments pay ON pay.booking_id = b.booking_id
      LEFT JOIN host_profiles hp ON hp.host_id = p.host_id
      LEFT JOIN favourites fav 
        ON fav.property_id = p.property_id AND fav.user_id = b.guest_id
      WHERE b.booking_id = ?
      LIMIT 1
    `, [booking_id]);

        if (bookingRows.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const data = bookingRows[0];

        /** PROPERTY IMAGE */
        const [[image]] = await db.query(`
      SELECT image_url 
      FROM property_images 
      WHERE property_id = ? AND is_primary = 1
      LIMIT 1
    `, [data.property_id]);

        /** WIFI AMENITIES */
        const [wifi] = await db.query(`
      SELECT a.name, a.value 
      FROM amenities a
      JOIN property_amenities pa ON pa.amenity_id = a.amenity_id
      WHERE pa.property_id = ? AND a.category = 'wifi'
    `, [data.property_id]);

        /** HOUSE RULES */
        const [[rules]] = await db.query(`
      SELECT * FROM property_houserules WHERE property_id = ?
    `, [data.property_id]);

        /** RESPONSE */
        let responseData = {
            image: image?.image_url || null,

            isFavourite: !!data.favourite_property,
            favouriteID: data.favourite_property || null,

            checkIn: `${data.check_in_date} ${data.check_in_time}`,
            checkOut: `${data.check_out_date} ${data.check_out_time}`,

            address: {
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.full_address
            },

            reservationDetails: {
                guests: {
                    name: data.guest_name,
                    image: data.guest_image
                }
            },

            confirmationCode: data.booking_id,
            cancellationPolicy: data.standardpolicy,
            receipt: data.transaction_id,
            checkInMethod: "self check-in",

            wifiDetails: wifi,
            houseRules: rules || {},

            hostDetails: {
                name: data.host_name,
                profile: data.profile,
                phone: data.phone_number,
                email: data.email
            },

            paymentInfo: {
                amount: data.amount,
                method: data.payment_method,
                status: data.payment_status
            },

            supportDetails: {
                supportEmail: "support@rentii.com",
                supportPhone: "+91-9999999999"
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

// Export the router
module.exports = router;