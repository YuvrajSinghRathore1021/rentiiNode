const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');
const dbn = require('../../../db/db');
const { deletePropertyImage } = require("../../utils/propertyImageService");

// view api
router.get('/properties', async (req, res) => {
    const userId = req.user.user_id;
    const hostId = req.user.host_id;

    const { page = 1, limit = 10, search = "", status = "", latitude, longitude, radius = 5 } = req.query;
    try {
        let query = `
            SELECT p.property_id, p.title, p.description, p.property_type, p.room_type, p.max_guests, 
                   p.bedrooms, p.beds, p.bathrooms, p.price_per_night, p.cleaning_fee, p.weekday_price,p.weekend_price,
                   pa.street_address, pa.city, pa.state_province, pa.postal_code, pa.country,
                   GROUP_CONCAT(DISTINCT a.name) AS amenities,
                   pi.image_url
            FROM properties p
            JOIN property_addresses pa ON p.property_id = pa.property_id
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

router.get('/host-properties', async (req, res) => {
    const hostId = req.user?.host_id;

    if (!hostId) {
        return res.status(400).json({
            status: false,
            message: "Host ID is required"
        });
    }

    try {
        const query = `
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
                p.cleaning_fee,

                pa.street_address,
                pa.city,
                pa.state_province,
                pa.postal_code,
                pa.country,

                -- Amenities (No duplication issue)
                (
                    SELECT GROUP_CONCAT(DISTINCT a.name)
                    FROM property_amenities pa2
                    JOIN amenities a 
                        ON pa2.amenity_id = a.amenity_id
                    WHERE pa2.property_id = p.property_id
                ) AS amenities,

                -- Primary Image
                (
                    SELECT pi.image_url
                    FROM property_images pi
                    WHERE pi.property_id = p.property_id
                    AND pi.is_primary = 1
                    LIMIT 1
                ) AS primary_image

            FROM properties p
            JOIN property_addresses pa 
                ON p.property_id = pa.property_id
            WHERE p.host_id = ?
            ORDER BY p.property_id DESC
        `;

        const [properties] = await db.promise().query(query, [hostId]);

        const formattedProperties = properties.map(p => ({
            ...p,
            amenities: p.amenities ? p.amenities.split(",") : []
        }));

        return res.status(200).json({
            status: true,
            data: formattedProperties
        });

    } catch (err) {
        console.error("Get host properties error:", err);
        return res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/images/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });


// router.post('/add-property', upload.array("placesPhotos", 10), async (req, res) => {
router.post('/add-property', async (req, res) => {
    const connection = await dbn.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.user_id;
        let hostId = req.user.host_id || 0;

        let finalHostId = hostId;

        if (hostId == 0) {
            // 1. Get user details
            const [userData] = await connection.query(
                `SELECT user_id, name, email, phone_number 
         FROM users WHERE user_id=?`,
                [userId]
            );

            if (!userData.length) {
                throw new Error("User not found");
            }

            const user = userData[0];

            // 2. Create host profile
            const [hostResult] = await connection.query(`
        INSERT INTO host_profiles
        (user_id, host_name, email, phone_number, host_since, status, created_at)
        VALUES (?, ?, ?, ?, NOW(), 1, NOW())
    `, [
                user.user_id,
                user.name,
                user.email,
                user.phone_number
            ]);

            finalHostId = hostResult.insertId;
            hostId = hostResult.insertId;

            // 3. Update users table
            await connection.query(`
        UPDATE users 
        SET host_id=?, is_host=1 
        WHERE user_id=?
    `, [finalHostId, userId]);
        }


        // Parse `data` JSON
        const data = JSON.parse(req.body.data);

        let status = 0;
        let statusStr = req.body.status;

        if (statusStr == "Approve") {
            status = 1;
        }

        // 1. Insert into properties
        const [propertyResult] = await connection.query(`INSERT INTO properties  (host_id, title, description, property_type, 
            describe_apartment, other_people, room_type, max_guests, bedrooms,  bedroom_look, beds, bathrooms, attached_bathrooms, 
            dedicated_bathrooms, shard_bathrooms,latitude, longitude, weekday_price, weekend_price, created_at,status,reservation_type,price_per_night)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?,?)
        `, [
            hostId,
            data.apartmenttitle?.title || "",
            data.apartmentdescription?.description || "",
            data.liketohost?.type || "",
            data.describeyourplace?.type || "",
            data.elsemightbethere?.type || "",
            data.typeofplaceguesthave?.type || "",
            data.startwiththebasics?.peoplecanstay?.guests || "0",
            data.startwiththebasics?.peoplecanstay?.bedrooms || "0",
            data.startwiththebasics?.havealock?.type || 0,
            data.startwiththebasics?.peoplecanstay?.beds || "0",
            parseInt(data.bathroomsareavailabletoguests?.privateandatteched || 0) + parseInt(data.bathroomsareavailabletoguests?.dedicated || 0) + parseInt(data.bathroomsareavailabletoguests?.shared || 0),
            data.bathroomsareavailabletoguests?.privateandatteched || 0,
            data.bathroomsareavailabletoguests?.dedicated || 0,
            data.bathroomsareavailabletoguests?.shared || 0,
            data.placelocated?.latitude || 0,
            data.placelocated?.longitude || 0,
            data.weekdaybaseprice?.price || 0,
            data.weekendprice?.price || 0,
            status || 0,
            data?.reservationType || "",
            data.weekdaybaseprice?.price || 0
        ]);

        const propertyId = propertyResult.insertId;

        // 2. Insert property location
        if (data.placelocated && Object.keys(data.placelocated).length > 0) {
            await connection.query(`
            INSERT INTO property_addresses
            (property_id, street_address, city,district, state_province, postal_code, country, latitude, longitude)
            VALUES (?,?,?,?,?,?,?,?,?)
        `, [
                propertyId,
                data.placelocated?.streetaddress || "",
                data.placelocated?.city || "",
                data.placelocated?.district || "",
                data.placelocated?.state || "",
                data.placelocated?.pincode || "",
                data.placelocated?.country || "",
                data.placelocated?.latitude || "",
                data.placelocated.longitude || ""
            ]);
        }

        // 3. Insert host address
        if (data.residentailaddress && Object.keys(data.residentailaddress).length > 0) {
            await connection.query(`
            INSERT INTO host_addresses
            (host_id,flat, street_address, city, state_province, zip_code, country, landmark,district)
            VALUES (?,?,?,?,?,?,?,?,?)
        `, [
                hostId,
                data.residentailaddress?.flat,
                data.residentailaddress?.streetaddress,
                data.residentailaddress?.city,
                data.residentailaddress?.state,
                data.residentailaddress?.pincode,
                data.residentailaddress?.country,
                data.residentailaddress?.landmark,
                data.residentailaddress?.district
            ]);
        }

        // 4. Insert images
        let placesPhotos = req.body.placesPhotos;

        if (typeof placesPhotos === "string") {
            placesPhotos = JSON.parse(placesPhotos);
        }
        if (placesPhotos && Array.isArray(placesPhotos)) {
            for (let i = 0; i < placesPhotos.length; i++) {

                const imageUrl = placesPhotos[i]?.url;

                if (!imageUrl) {
                    console.log("Invalid image at index", i);
                    continue;
                }


                await connection.query(
                    `INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
                    [propertyId, imageUrl, i === 0 ? 1 : 0]
                );
            }
        }
        // 5. Insert amenities
        if (data.placehastooffer && Object.keys(data.placehastooffer).length > 0) {
            const amenities = Object.keys(data.placehastooffer).filter(k => data.placehastooffer[k] == '1');

            for (const amenity of amenities) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenity]);
                if (rows.length) {
                    await connection.query(`INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)`,
                        [propertyId, rows[0].amenity_id, "placehastooffer"]);
                }
            }
        }

        // 6. Insert "describe your apartment"
        if (data.describeyourapartment && Object.keys(data.describeyourapartment).length > 0) {
            const amenitiesD = Object.keys(data.describeyourapartment).filter(k => data.describeyourapartment[k] == '1');

            for (const amenityD of amenitiesD) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityD]);
                if (rows.length) {
                    await connection.query(`
                        INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)
                    `, [propertyId, rows[0].amenity_id, "describeyourapartment"]);
                }
            }
        }

        // 7. Insert booking settings
        if (data.pickyourbookingsetting && Object.keys(data.pickyourbookingsetting).length > 0) {
            await connection.query(`INSERT INTO property_booking_settings (property_id, approve5booking, instantbook) VALUES (?,?,?) `, [
                propertyId,
                data.pickyourbookingsetting?.approve5booking || 0,
                data.pickyourbookingsetting?.instantbook || 0
            ]);
        }

        // 8. Insert discounts
        if (data.discount && Object.keys(data.discount).length > 0) {
            await connection.query(`
                INSERT INTO property_discounts
                (property_id, newlistingpromotion, lastminutediscount, weeklydiscount, monthlydiscount) VALUES (?,?,?,?,?)`,
                [propertyId, data.discount?.newlistingpromotion || 0, data.discount?.lastminutediscount || 0, data.discount?.weeklydiscount || 0, data.discount?.monthlydiscount || 0]);
        }

        // 9. Insert safety details
        if (data.safetydetails && Object.keys(data.safetydetails).length > 0) {
            const amenitiesS = Object.keys(data.safetydetails)
                .filter(k => data.safetydetails[k] == '1');

            for (const amenityS of amenitiesS) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityS]);
                if (rows.length) {
                    await connection.query(`INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)`, [propertyId, rows[0].amenity_id, "safetydetails"]);
                }
            }
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


router.post('/edit-property', upload.array("placesPhotos", 10), async (req, res) => {

    const connection = await dbn.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.user.user_id;
        const hostId = req.user.host_id || 0;
        const propertyId = req.body.property_Id;

        if (!propertyId) {
            throw new Error("Property ID required");
        }

        const data = JSON.parse(req.body.data);
        let status = 0;
        if (req.body.status == "Approve") status = 1;

        // ✅ 1. Update properties table
        await connection.query(`
            UPDATE properties SET
                title=?,
                description=?,
                property_type=?,
                describe_apartment=?,
                other_people=?,
                room_type=?,
                max_guests=?,
                bedrooms=?,
                bedroom_look=?,
                beds=?,
                bathrooms=?,
                attached_bathrooms=?,
                dedicated_bathrooms=?,
                shard_bathrooms=?,
                latitude=?,
                longitude=?,
                weekday_price=?,
                weekend_price=?,
                status=?,
                reservation_type=?,
                price_per_night=?
            WHERE property_id=? AND host_id=?
        `, [
            data.apartmenttitle?.title || "",
            data.apartmentdescription?.description || "",
            data.liketohost?.type || "",
            data.describeyourplace?.type || "",
            data.elsemightbethere?.type || "",
            data.typeofplaceguesthave?.type || "",
            data.startwiththebasics?.peoplecanstay?.guests || 0,
            data.startwiththebasics?.peoplecanstay?.bedrooms || 0,
            data.startwiththebasics?.havealock?.type || 0,
            data.startwiththebasics?.peoplecanstay?.beds || 0,
            parseInt(data.bathroomsareavailabletoguests?.privateandatteched || 0) +
            parseInt(data.bathroomsareavailabletoguests?.dedicated || 0) +
            parseInt(data.bathroomsareavailabletoguests?.shared || 0),
            data.bathroomsareavailabletoguests?.privateandatteched || 0,
            data.bathroomsareavailabletoguests?.dedicated || 0,
            data.bathroomsareavailabletoguests?.shared || 0,
            data.placelocated?.latitude || 0,
            data.placelocated?.longitude || 0,
            data.weekdaybaseprice?.price || 0,
            data.weekendprice?.price || 0,
            status,
            data?.reservationType || "",
            data.weekdaybaseprice?.price || 0,
            propertyId,
            hostId
        ]);

        // ✅ 2. Update property address
        await connection.query(`
            UPDATE property_addresses SET
                street_address=?,
                city=?,
                district=?,
                state_province=?,
                postal_code=?,
                country=?,
                latitude=?,
                longitude=?
            WHERE property_id=?
        `, [
            data.placelocated?.streetaddress || "",
            data.placelocated?.city || "",
            data.placelocated?.district || "",
            data.placelocated?.state || "",
            data.placelocated?.pincode || "",
            data.placelocated?.country || "",
            data.placelocated?.latitude || "",
            data.placelocated?.longitude || "",
            propertyId
        ]);

        // ✅ 3. Update booking settings
        await connection.query(`
            UPDATE property_booking_settings SET
                approve5booking=?,
                instantbook=?
            WHERE property_id=?
        `, [
            data.pickyourbookingsetting?.approve5booking || 0,
            data.pickyourbookingsetting?.instantbook || 0,
            propertyId
        ]);

        // ✅ 4. Update discounts
        await connection.query(`
            UPDATE property_discounts SET
                newlistingpromotion=?,
                lastminutediscount=?,
                weeklydiscount=?,
                monthlydiscount=?
            WHERE property_id=?
        `, [
            data.discount?.newlistingpromotion || 0,
            data.discount?.lastminutediscount || 0,
            data.discount?.weeklydiscount || 0,
            data.discount?.monthlydiscount || 0,
            propertyId
        ]);

        // ✅ 5. Replace amenities (delete old → insert new)
        await connection.query(`DELETE FROM property_amenities WHERE property_id=?`, [propertyId]);

        const insertAmenities = async (amenityObj, key) => {
            if (!amenityObj) return;

            const amenities = Object.keys(amenityObj).filter(k => amenityObj[k] == '1');

            for (const amenity of amenities) {
                const [rows] = await connection.query(
                    `SELECT amenity_id FROM amenities WHERE value=?`,
                    [amenity]
                );

                if (rows.length) {
                    await connection.query(
                        `INSERT INTO property_amenities (property_id, amenity_id, data_key)
                         VALUES (?,?,?)`,
                        [propertyId, rows[0].amenity_id, key]
                    );
                }
            }
        };

        await insertAmenities(data.placehastooffer, "placehastooffer");
        await insertAmenities(data.describeyourapartment, "describeyourapartment");
        await insertAmenities(data.safetydetails, "safetydetails");

        // ✅ 6. Images update (optional)
        if (req.files && req.files.length) {
            await connection.query(`DELETE FROM property_images WHERE property_id=?`, [propertyId]);

            for (let i = 0; i < req.files.length; i++) {
                const imageUrl = `/uploads/images/${req.files[i].filename}`;

                await connection.query(
                    `INSERT INTO property_images (property_id, image_url, is_primary)
                     VALUES (?,?,?)`,
                    [propertyId, imageUrl, i === 0 ? 1 : 0]
                );
            }
        }

        await connection.commit();

        res.json({
            status: true,
            message: "Property updated successfully",
            propertyId
        });

    } catch (err) {
        await connection.rollback();
        console.error(err);

        res.status(500).json({
            status: false,
            message: "Failed to update property"
        });

    } finally {
        connection.release();
    }
});


router.post('/add-propertyWeb', async (req, res) => {
    const connection = await dbn.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.user_id;
        const hostId = req.user.host_id || 0;
        // Parse `data` JSON
        const data = JSON.parse(req.body.data);

        let status = 0;
        let statusStr = req.body.status;

        if (statusStr == "Approve") {
            status = 1;
        }

        // 1. Insert into properties
        const [propertyResult] = await connection.query(`INSERT INTO properties  (host_id, title, description, property_type, 
            describe_apartment, other_people, room_type, max_guests, bedrooms,  bedroom_look, beds, bathrooms, attached_bathrooms, 
            dedicated_bathrooms, shard_bathrooms,latitude, longitude, weekday_price, weekend_price, created_at,status,reservation_type)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?)
        `, [
            hostId,
            data.apartmenttitle?.title || "",
            data.apartmentdescription?.description || "",
            data.liketohost?.type || "",
            data.describeyourplace?.type || "",
            data.elsemightbethere?.type || "",
            data.typeofplaceguesthave?.type || "",
            data.startwiththebasics?.peoplecanstay?.guests || "0",
            data.startwiththebasics?.peoplecanstay?.bedrooms || "0",
            data.startwiththebasics?.havealock?.type || "",
            data.startwiththebasics?.peoplecanstay?.beds || "0",
            parseInt(data.bathroomsareavailabletoguests?.privateandatteched || 0) + parseInt(data.bathroomsareavailabletoguests?.dedicated || 0) + parseInt(data.bathroomsareavailabletoguests?.shared || 0),
            data.bathroomsareavailabletoguests?.privateandatteched || 0,
            data.bathroomsareavailabletoguests?.dedicated || 0,
            data.bathroomsareavailabletoguests?.shared || 0,
            data.placelocated?.latitude || 0,
            data.placelocated?.longitude || 0,
            data.weekdaybaseprice?.price || 0,
            data.weekendprice?.price || 0,
            status || 0,
            data?.reservationType || ""
        ]);

        const propertyId = propertyResult.insertId;

        // 2. Insert property location
        if (data.placelocated && Object.keys(data.placelocated).length > 0) {
            await connection.query(`
            INSERT INTO property_addresses
            (property_id, street_address, city,district, state_province, postal_code, country, latitude, longitude)
            VALUES (?,?,?,?,?,?,?,?,?)
        `, [
                propertyId,
                data.placelocated?.streetaddress || "",
                data.placelocated?.city || "",
                data.placelocated?.district || "",
                data.placelocated?.state || "",
                data.placelocated?.pincode || "",
                data.placelocated?.country || "",
                data.placelocated?.latitude || "",
                data.placelocated.longitude || ""
            ]);
        }

        // 3. Insert host address
        if (data.residentailaddress && Object.keys(data.residentailaddress).length > 0) {
            await connection.query(`
            INSERT INTO host_addresses
            (host_id,flat, street_address, city, state_province, zip_code, country, landmark,district)
            VALUES (?,?,?,?,?,?,?,?,?)
        `, [
                hostId,
                data.residentailaddress?.flat,
                data.residentailaddress?.streetaddress,
                data.residentailaddress?.city,
                data.residentailaddress?.state,
                data.residentailaddress?.pincode,
                data.residentailaddress?.country,
                data.residentailaddress?.landmark,
                data.residentailaddress?.district
            ]);
        }

        // 4. Insert images
        // if (req.files && req.files.length) {
        //     for (let i = 0; i < req.files.length; i++) {
        //         const imageUrl = `/uploads/images/${req.files[i].filename}`; // relative path
        //         await connection.query(`INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
        //             [propertyId, imageUrl, i === 0 ? 1 : 0]);
        //     }
        // }

        if (data?.placesPhotos && data?.placesPhotos?.length) {
            for (let i = 0; i < data?.placesPhotos.length; i++) {
                const imageUrl = `${data?.placesPhotos[i]}`;
                await connection.query(`INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
                    [propertyId, imageUrl, i === 0 ? 1 : 0]);
            }
        }

        // 5. Insert amenities
        if (data.placehastooffer && Object.keys(data.placehastooffer).length > 0) {
            const amenities = Object.keys(data.placehastooffer).filter(k => data.placehastooffer[k] == '1');

            for (const amenity of amenities) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenity]);
                if (rows.length) {
                    await connection.query(`INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)`,
                        [propertyId, rows[0].amenity_id, "placehastooffer"]);
                }
            }
        }

        // 6. Insert "describe your apartment"
        if (data.describeyourapartment && Object.keys(data.describeyourapartment).length > 0) {
            const amenitiesD = Object.keys(data.describeyourapartment).filter(k => data.describeyourapartment[k] == '1');

            for (const amenityD of amenitiesD) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityD]);
                if (rows.length) {
                    await connection.query(`
                        INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)
                    `, [propertyId, rows[0].amenity_id, "describeyourapartment"]);
                }
            }
        }

        // 7. Insert booking settings
        if (data.pickyourbookingsetting && Object.keys(data.pickyourbookingsetting).length > 0) {
            await connection.query(`INSERT INTO property_booking_settings (property_id, approve5booking, instantbook) VALUES (?,?,?) `, [
                propertyId,
                data.pickyourbookingsetting?.approve5booking || 0,
                data.pickyourbookingsetting?.instantbook || 0
            ]);
        }

        // 8. Insert discounts
        if (data.discount && Object.keys(data.discount).length > 0) {
            await connection.query(`
                INSERT INTO property_discounts
                (property_id, newlistingpromotion, lastminutediscount, weeklydiscount, monthlydiscount) VALUES (?,?,?,?,?)`,
                [propertyId, data.discount?.newlistingpromotion || 0, data.discount?.lastminutediscount || 0, data.discount?.weeklydiscount || 0, data.discount?.monthlydiscount || 0]);
        }

        // 9. Insert safety details
        if (data.safetydetails && Object.keys(data.safetydetails).length > 0) {
            const amenitiesS = Object.keys(data.safetydetails)
                .filter(k => data.safetydetails[k] == '1');

            for (const amenityS of amenitiesS) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityS]);
                if (rows.length) {
                    await connection.query(`INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)`, [propertyId, rows[0].amenity_id, "safetydetails"]);
                }
            }
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


router.post("/edit-propertyWeb",
    async (req, res) => {
        const connection = await dbn.getConnection();
        try {
            await connection.beginTransaction();

            const userId = req.user.user_id;
            const hostId = req.user.host_id || 0;

            const data = JSON.parse(req.body.data);
            const property_Id = req.body.property_Id;
            if (!property_Id) {
                return res
                    .status(400)
                    .json({ status: false, message: "property_Id is required" });
            }

            let status = 0;
            if (req.body.status === "Approve") status = 1;

            /* =========================
               1. UPDATE PROPERTIES
            ========================== */
            await connection.query(
                `
        UPDATE properties SET
          title=?,
          description=?,
          property_type=?,
          describe_apartment=?,
          other_people=?,
          room_type=?,
          max_guests=?,
          bedrooms=?,
          bedroom_look=?,
          beds=?,
          bathrooms=?,
          attached_bathrooms=?,
          dedicated_bathrooms=?,
          shard_bathrooms=?,
          latitude=?,
          longitude=?,
          weekday_price=?,
          weekend_price=?,
          status=?,
          reservation_type=?
        WHERE property_id=? AND host_id=?
      `,
                [
                    data.apartmenttitle?.title || "",
                    data.apartmentdescription?.description || "",
                    data.liketohost?.type || "",
                    data.describeyourplace?.type || "",
                    data.elsemightbethere?.type || "",
                    data.typeofplaceguesthave?.type || "",
                    data.startwiththebasics?.peoplecanstay?.guests || 0,
                    data.startwiththebasics?.peoplecanstay?.bedrooms || 0,
                    data.startwiththebasics?.havealock?.type || "",
                    data.startwiththebasics?.peoplecanstay?.beds || 0,
                    parseInt(data.bathroomsareavailabletoguests?.privateandatteched || 0) +
                    parseInt(data.bathroomsareavailabletoguests?.dedicated || 0) +
                    parseInt(data.bathroomsareavailabletoguests?.shared || 0),
                    data.bathroomsareavailabletoguests?.privateandatteched || 0,
                    data.bathroomsareavailabletoguests?.dedicated || 0,
                    data.bathroomsareavailabletoguests?.shared || 0,
                    data.placelocated?.latitude || 0,
                    data.placelocated?.longitude || 0,
                    data.weekdaybaseprice?.price || 0,
                    data.weekendprice?.price || 0,
                    status,
                    data?.reservationType || "",
                    property_Id,
                    hostId
                ]
            );

            /* =========================
               2. UPDATE PROPERTY ADDRESS
            ========================== */
            await connection.query(
                `
        UPDATE property_addresses SET
          street_address=?,
          city=?,
          district=?,
          state_province=?,
          postal_code=?,
          country=?,
          latitude=?,
          longitude=?
        WHERE property_id=?
      `,
                [
                    data.placelocated?.streetaddress || "",
                    data.placelocated?.city || "",
                    data.placelocated?.district || "",
                    data.placelocated?.state || "",
                    data.placelocated?.pincode || "",
                    data.placelocated?.country || "",
                    data.placelocated?.latitude || "",
                    data.placelocated?.longitude || "",
                    property_Id
                ]
            );

            /* =========================
               3. DELETE OLD DATA
            ========================== */
            // await connection.query(
            //     "DELETE FROM property_images WHERE property_id=?",
            //     [property_Id]
            // );
            await connection.query(
                "DELETE FROM property_amenities WHERE property_id=?",
                [property_Id]
            );
            await connection.query(
                "DELETE FROM property_booking_settings WHERE property_id=?",
                [property_Id]
            );
            await connection.query(
                "DELETE FROM property_discounts WHERE property_id=?",
                [property_Id]
            );

            /* =========================
               4. INSERT IMAGES AGAIN
            ========================== */
            // if (req.files && req.files.length) {
            //     for (let i = 0; i < req.files.length; i++) {
            //         const imageUrl = `/uploads/images/${req.files[i].filename}`;
            //         await connection.query(
            //             `INSERT INTO property_images (property_id, image_url, is_primary)
            //  VALUES (?,?,?)`,
            //             [property_Id, imageUrl, i === 0 ? 1 : 0]
            //         );
            //     }
            // }


            if (data?.placesPhotos && data?.placesPhotos?.length) {
                for (let i = 0; i < data?.placesPhotos.length; i++) {
                    const imageUrl = `${data?.placesPhotos[i]}`;
                    await connection.query(`INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
                        [property_Id, imageUrl, i === 0 ? 1 : 0]);
                }
            }

            /* =========================
               5. INSERT AMENITIES AGAIN
            ========================== */
            const insertAmenities = async (obj, key) => {
                if (!obj) return;
                for (const k of Object.keys(obj)) {
                    if (obj[k] == "1") {
                        const [rows] = await connection.query(
                            "SELECT amenity_id FROM amenities WHERE value=?",
                            [k]
                        );
                        if (rows.length) {
                            await connection.query(
                                `INSERT INTO property_amenities (property_id, amenity_id, data_key)
                 VALUES (?,?,?)`,
                                [property_Id, rows[0].amenity_id, key]
                            );
                        }
                    }
                }
            };

            await insertAmenities(data.placehastooffer, "placehastooffer");
            await insertAmenities(data.describeyourapartment, "describeyourapartment");
            await insertAmenities(data.safetydetails, "safetydetails");

            /* =========================
               6. BOOKING & DISCOUNT
            ========================== */
            if (data.pickyourbookingsetting) {
                await connection.query(
                    `INSERT INTO property_booking_settings
           (property_id, approve5booking, instantbook)
           VALUES (?,?,?)`,
                    [
                        property_Id,
                        data.pickyourbookingsetting?.approve5booking || 0,
                        data.pickyourbookingsetting?.instantbook || 0
                    ]
                );
            }

            if (data.discount) {
                await connection.query(
                    `INSERT INTO property_discounts
           (property_id, newlistingpromotion, lastminutediscount, weeklydiscount, monthlydiscount)
           VALUES (?,?,?,?,?)`,
                    [
                        property_Id,
                        data.discount?.newlistingpromotion || 0,
                        data.discount?.lastminutediscount || 0,
                        data.discount?.weeklydiscount || 0,
                        data.discount?.monthlydiscount || 0
                    ]
                );
            }

            await connection.commit();
            res.json({
                status: true,
                message: "Property updated successfully",
                property_Id
            });
        } catch (err) {
            await connection.rollback();
            console.error(err);
            res.status(500).json({ status: false, message: "Edit failed" });
        } finally {
            connection.release();
        }
    }
);

// router.post('/edit-property', async (req, res) => {
//     const userId = req.user.user_id;
//     const hostId = req.user.host_id;

//     if (!hostId) {
//         return res.status(400).json({ status: false, message: "Host Not found pls re-login" });
//     }

//     const { type, propertyId, data } = req.body;

//     if (!type || !propertyId) {
//         return res.status(400).json({ status: false, message: "Property ID and type are required" });
//     }


//     try {
//         let updateQuery = "";
//         let updateValue = [];
//         let dataNew = "";

//         if (type == "producttitle") {

//             updateQuery = `UPDATE properties SET title = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [data?.producttitle?.title, hostId, propertyId];
//         }
//         if (type == "direction") {

//             updateQuery = `UPDATE properties SET description = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [data?.direction, hostId, propertyId];
//         }
//         else if (type == "propertytype") {
//             dataNew = data?.propertytype;
//             updateQuery = `UPDATE properties SET describe_apartment = ?,listing_type=?,floor=? ,floor_listing=?,year_built=?,property_size=?, unit=? WHERE host_id = ? AND property_id=?`;

//             updateValue = [dataNew?.mostlikeyourplace, dataNew?.Listingtype, dataNew?.floors, dataNew?.floorislistingon, dataNew?.yearbuilt, dataNew?.propertysize, dataNew?.unit, hostId, propertyId];
//         }
//         else if (type == "pernight") {
//             dataNew = data?.pernight;
//             updateQuery = `UPDATE properties SET price_per_night = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [dataNew?.pernight, hostId, propertyId];
//         }
//         else if (type == "weekendprice") {
//             dataNew = data?.weekendprice;
//             updateQuery = `UPDATE properties SET weekend_price = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [dataNew?.weekendprice, hostId, propertyId];
//         }
//         else if (type == "weeklydiscount") {
//             dataNew = data?.weeklydiscount;
//             updateQuery = `UPDATE properties SET weekly_discount = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [dataNew?.weeklydiscount, hostId, propertyId]; weekly_discount
//         }

//         else if (type == "monthlydiscount") {
//             dataNew = data?.monthlydiscount;
//             updateQuery = `UPDATE properties SET monthly_discount = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [dataNew?.monthlydiscount, hostId, propertyId];
//         }
//         else if (type == "bookingsetting") {
//             dataNew = data?.bookingsetting;
//             updateQuery = `UPDATE properties SET booking_setting = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [dataNew?.bookingsetting, hostId, propertyId];
//         }
//         else if (type == "numberofguests") {
//             dataNew = data?.numberofguests;
//             updateQuery = `UPDATE properties SET max_guests = ? WHERE host_id = ? AND property_id=?`;
//             updateValue = [dataNew?.numberofguests, hostId, propertyId];
//         }
//         else if (type == "placehastooffer" || type == "describeyourapartment" || type == "safetydetails" || type == "amenities") {
//             await db.promise().query(`DELETE FROM property_amenities WHERE property_id=?`, [propertyId]);
//             const items = Object.keys(data[type]).filter(k => data[type][k] == '1');
//             for (const item of items) {
//                 const [rows] = await db.promise().query(`SELECT amenity_id FROM amenities WHERE value=?`, [item]);
//                 if (rows.length) {
//                     await db.promise().query(
//                         `INSERT INTO property_amenities (property_id, amenity_id) VALUES (?,?)`,
//                         [propertyId, rows[0].amenity_id]
//                     );
//                 }
//             }
//         }

//         // new 
//         else if (type == "availability") {
//             let av = data.availability;
//             let minimumavailability = av.minimumavailability?.minimumavailability || null;
//             let maximumnights = av.maximumnights?.maximumnights || null;
//             let advancenotice = av.advancenotice?.advancenotice || null;
//             let samedayadvancenotice = av.samedayadvancenotice?.samedayadvancenotice || null;
//             let preparationtime = av.preparationtime?.preparationtime || null;
//             let availabilitywindow = av.availabilitywindow?.availabilitywindow || null;

//             let restricted_checkin = av.moreavailabilitysetting?.restrictedcheckin?.restrictedcheckin || null;
//             let restricted_checkout = av.moreavailabilitysetting?.restrictedcheckout?.restrictedcheckout || null;

//             // check if exists
//             let [check] = await db.promise().query(
//                 "SELECT id FROM property_availability WHERE property_id = ?",
//                 [propertyId]
//             );

//             if (check.length > 0) {
//                 // Update
//                 updateQuery = `
//             UPDATE property_availability SET
//                 minimumavailability = ?,
//                 maximumnights = ?,
//                 advancenotice = ?,
//                 samedayadvancenotice = ?,
//                 preparationtime = ?,
//                 availabilitywindow = ?,
//                 restricted_checkin = ?,
//                 restricted_checkout = ?
//             WHERE property_id = ?
//         `;

//                 updateValue = [
//                     minimumavailability,
//                     maximumnights,
//                     advancenotice,
//                     samedayadvancenotice,
//                     preparationtime,
//                     availabilitywindow,
//                     restricted_checkin,
//                     restricted_checkout,
//                     propertyId
//                 ];
//             } else {
//                 // Insert
//                 updateQuery = `
//             INSERT INTO property_availability 
//             (property_id, minimumavailability, maximumnights, advancenotice,
//              samedayadvancenotice, preparationtime, availabilitywindow,
//              restricted_checkin, restricted_checkout)
//             VALUES (?,?,?,?,?,?,?,?,?)
//         `;

//                 updateValue = [
//                     propertyId,
//                     minimumavailability,
//                     maximumnights,
//                     advancenotice,
//                     samedayadvancenotice,
//                     preparationtime,
//                     availabilitywindow,
//                     restricted_checkin,
//                     restricted_checkout
//                 ];
//             }
//         }

//         else if (type == "placelocated") {
//             updateQuery = `UPDATE property_addresses 
//                            SET street_address=?, city=?, state_province=?, postal_code=?, country=?, latitude=?, longitude=? 
//                            WHERE property_id=?`;
//             updateValue = [
//                 data.placelocated.streetaddress,
//                 data.placelocated.district,
//                 data.placelocated.state,
//                 data.placelocated.pincode,
//                 data.placelocated.country,
//                 data.placelocated.latitude,
//                 data.placelocated.longitude,
//                 propertyId
//             ];
//         }
//         else if (type == "description") {
//             let desc = data.description;

//             let listingdescription = desc.listingdescription?.listingdescription || null;
//             let yourproperty = desc.yourproperty?.yourproperty || null;
//             let guestaccessdetails = desc.guestaccess?.guestaccessdetails || null;
//             let interactionwithguests = desc.interactionwithguests?.interactionwithguests || null;
//             let otherdetails = desc.otherdetails?.otherdetails || null;

//             // Check if exists
//             let [check] = await db.promise().query(
//                 "SELECT id FROM property_description_details WHERE property_id = ?",
//                 [propertyId]
//             );

//             if (check.length > 0) {
//                 // UPDATE
//                 updateQuery = `
//             UPDATE property_description_details SET
//                 listingdescription = ?,
//                 yourproperty = ?,
//                 guestaccessdetails = ?,
//                 interactionwithguests = ?,
//                 otherdetails = ?
//             WHERE property_id = ?
//         `;

//                 updateValue = [
//                     listingdescription,
//                     yourproperty,
//                     guestaccessdetails,
//                     interactionwithguests,
//                     otherdetails,
//                     propertyId
//                 ];

//             } else {
//                 // INSERT
//                 updateQuery = `
//             INSERT INTO property_description_details
//             (property_id, listingdescription, yourproperty, guestaccessdetails,
//              interactionwithguests, otherdetails)
//             VALUES (?,?,?,?,?,?)
//         `;

//                 updateValue = [
//                     propertyId,
//                     listingdescription,
//                     yourproperty,
//                     guestaccessdetails,
//                     interactionwithguests,
//                     otherdetails
//                 ];
//             }
//         }


//         // ✅ Pending Parts
//         else if (type == "placePhotos") {
//             // delete old and insert new
//             await db.promise().query(`DELETE FROM property_images WHERE property_id=?`, [propertyId]);
//             if (data.placePhotos?.images?.length) {
//                 for (let i = 0; i < data.placePhotos.images.length; i++) {
//                     await db.promise().query(
//                         `INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
//                         [propertyId, data.placePhotos.images[i], i === 0 ? 1 : 0]
//                     );
//                 }
//             }
//         }

//         else if (type == "houserules") {

//             let rules = data.houserules;

//             let no_pets = rules.petsallowed == "1" ? 0 : 1;
//             let no_smoking = rules.smokingallowed == "1" ? 0 : 1;
//             let no_parties = rules.eventsallowed == "1" ? 0 : 1;
//             let no_children = rules.quiethours == "1" ? 1 : 0;

//             let check_in_time = rules.checkincheckouttimes == "1" ? "default" : null;
//             let check_out_time = rules.checkincheckouttimes == "1" ? "default" : null;

//             let other_rules = rules.additionalrules || null;

//             // check if exists
//             let [check] = await db.promise().query(
//                 "SELECT rule_id FROM house_rules WHERE property_id = ?",
//                 [propertyId]
//             );

//             if (check.length > 0) {
//                 // UPDATE
//                 updateQuery = `
//             UPDATE house_rules SET
//                 no_pets = ?,
//                 no_smoking = ?,
//                 no_parties = ?,
//                 no_children = ?,
//                 check_in_time = ?,
//                 check_out_time = ?,
//                 other_rules = ?
//             WHERE property_id = ?
//         `;

//                 updateValue = [
//                     no_pets,
//                     no_smoking,
//                     no_parties,
//                     no_children,
//                     check_in_time,
//                     check_out_time,
//                     other_rules,
//                     propertyId
//                 ];

//             } else {
//                 // INSERT
//                 updateQuery = `
//             INSERT INTO house_rules
//             (property_id, no_pets, no_smoking, no_parties, no_children,
//              check_in_time, check_out_time, other_rules)
//             VALUES (?,?,?,?,?,?,?,?)
//         `;

//                 updateValue = [
//                     propertyId,
//                     no_pets,
//                     no_smoking,
//                     no_parties,
//                     no_children,
//                     check_in_time,
//                     check_out_time,
//                     other_rules
//                 ];
//             }
//         }
//         else if (type == "cancellationpolicy") {

//             let pol = data.cancellationpolicy;

//             let standardpolicy = pol.standardpolicy || null;
//             let longtermstaypolicy = pol.longtermstaypolicy || null;

//             // Check if exists
//             let [check] = await db.promise().query(
//                 "SELECT id FROM property_cancellation_policy WHERE property_id = ?",
//                 [propertyId]
//             );

//             if (check.length > 0) {
//                 // UPDATE
//                 updateQuery = `
//             UPDATE property_cancellation_policy SET
//                 standardpolicy = ?,
//                 longtermstaypolicy = ?
//             WHERE property_id = ?
//         `;

//                 updateValue = [
//                     standardpolicy,
//                     longtermstaypolicy,
//                     propertyId
//                 ];

//             } else {
//                 // INSERT
//                 updateQuery = `
//             INSERT INTO property_cancellation_policy
//             (property_id, standardpolicy, longtermstaypolicy)
//             VALUES (?,?,?)
//         `;

//                 updateValue = [
//                     propertyId,
//                     standardpolicy,
//                     longtermstaypolicy
//                 ];
//             }
//         }
//         else if (type == "checkin") {

//             let checkin = data.checkin;

//             let starttime = checkin.starttime || null;
//             let endtime = checkin.endtime || null;
//             let checkouttime = checkin.checkouttime || null;

//             // Check if record exists
//             let [check] = await db.promise().query(
//                 "SELECT id FROM property_checkin WHERE property_id = ?",
//                 [propertyId]
//             );

//             if (check.length > 0) {
//                 // UPDATE
//                 updateQuery = `
//             UPDATE property_checkin SET
//                 starttime = ?,
//                 endtime = ?,
//                 checkouttime = ?
//             WHERE property_id = ?
//         `;

//                 updateValue = [
//                     starttime,
//                     endtime,
//                     checkouttime,
//                     propertyId
//                 ];

//             } else {
//                 // INSERT
//                 updateQuery = `
//             INSERT INTO property_checkin
//             (property_id, starttime, endtime, checkouttime)
//             VALUES (?,?,?,?)
//         `;

//                 updateValue = [
//                     propertyId,
//                     starttime,
//                     endtime,
//                     checkouttime
//                 ];
//             }
//         }
//         else if (type == "checkout") {

//             let checkout = data.checkout;

//             let starttime = checkout.starttime || null;
//             let endtime = checkout.endtime || null;
//             let checkouttime = checkout.checkouttime || null;

//             // Check if record exists
//             let [check] = await db.promise().query(
//                 "SELECT id FROM property_checkout WHERE property_id = ?",
//                 [propertyId]
//             );

//             if (check.length > 0) {
//                 // UPDATE
//                 updateQuery = `
//             UPDATE property_checkout SET
//                 starttime = ?,
//                 endtime = ?,
//                 checkouttime = ?
//             WHERE property_id = ?
//         `;

//                 updateValue = [
//                     starttime,
//                     endtime,
//                     checkouttime,
//                     propertyId
//                 ];

//             } else {
//                 // INSERT
//                 updateQuery = `
//             INSERT INTO property_checkout
//             (property_id, starttime, endtime, checkouttime)
//             VALUES (?,?,?,?)
//         `;

//                 updateValue = [
//                     propertyId,
//                     starttime,
//                     endtime,
//                     checkouttime
//                 ];
//             }
//         }



//         if (updateQuery) {
//             await db.promise().query(updateQuery, updateValue);
//         }

//         res.json({ status: true, message: "Property updated successfully" });
//     } catch (err) {
//         console.error("Edit property error:", err);
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });


// //view property-old proper 


router.get('/view-property-onboarding', async (req, res) => {
    const { propertyId, type } = req.query;
    try {
        // 1. Fetch property details
        const [propertyRows] = await db.promise().query(`
            SELECT * FROM properties WHERE property_id = ?`, [propertyId]);

        if (!propertyRows.length) {
            return res.status(404).json({ status: false, message: "Property not found" });
        }
        const property = propertyRows[0];

        // 2. Property address
        const [addressRows] = await db.promise().query(`
            SELECT * FROM property_addresses WHERE property_id = ?`, [propertyId]);
        const address = addressRows[0] || {};

        // 3. Host address
        const [hostRows] = await db.promise().query(`
            SELECT * FROM host_addresses WHERE host_id = ?`, [property.host_id]);
        const hostAddress = hostRows[0] || {};

        const [hostDetailesRows] = await db.promise().query(`
            SELECT host_id, user_id, profile, host_name, created_at FROM host_profiles WHERE host_id = ?`, [property.host_id]);
        const hostDetailes = hostDetailesRows[0] || {};

        // 4. Images
        const [imageRows] = await db.promise().query(`
            SELECT * FROM property_images WHERE property_id = ?`, [propertyId]);
        const images = imageRows.map(img => img.image_url);

        // 5. Amenities
        const [amenityRows] = await db.promise().query(`
            SELECT a.value,a.name ,pa.data_key
            FROM property_amenities pa 
            JOIN amenities a ON pa.amenity_id=a.amenity_id 
            WHERE pa.property_id=? `, [propertyId]);
        const amenitiesList = amenityRows.map(r => r.value);

        // 6. Booking settings
        const [bookingRows] = await db.promise().query(`
            SELECT * FROM property_booking_settings WHERE property_id = ?
        `, [propertyId]);
        const booking = bookingRows[0] || {};

        // 7. Discounts
        const [discountRows] = await db.promise().query(`
            SELECT * FROM property_discounts WHERE property_id = ?
        `, [propertyId]);
        const discount = discountRows[0] || {};

        // const groupedByUser = {};
        let groupedByUser = [];
        if (type == "userView") {
            const [userAdditionalInfo] = await db.promise().query(`
        SELECT uai.info_value, uai.info_key FROM properties p
        INNER JOIN host_profiles hp ON p.host_id = hp.host_id
        INNER JOIN users u ON hp.user_id = u.user_id
        INNER JOIN user_additional_info uai ON u.user_id = uai.user_id
        WHERE p.property_id = ? `, [propertyId]);

            groupedByUser = userAdditionalInfo;

            // if (userAdditionalInfo.length > 0) {
            //     // Group by user_id
            //     userAdditionalInfo.forEach(item => {
            //         if (!groupedByUser[item.user_id]) {
            //             groupedByUser[item.user_id] = {
            //                 user_id: item.user_id,
            //                 additional_info: {}
            //             };
            //         }
            //         groupedByUser[item.user_id].additional_info[item.info_key] = item.info_value;
            //     });
            // }
        }

        // 🏗️ Map amenities into categories like add-API expects
        let placehastooffer = {};
        let describeyourapartment = {};
        let safetydetails = {};

        let placehastoofferWithkey = [];
        let describeyourapartmentWithkey = [];
        let safetydetailsWithkey = [];

        // // Example mapping: you can extend logic to split based on category


        for (const row of amenityRows) {
            const { value, data_key, name } = row;
            if (data_key == "placehastooffer") {
                placehastooffer[value] = "1";

                placehastoofferWithkey.push({ key: value, value: "1", name: name });
            } else if (data_key == "describeyourapartment") {
                describeyourapartmentWithkey.push({ key: value, value: "1", name: name });
                describeyourapartment[value] = "1";
            } else if (data_key == "safetydetails") {
                safetydetailsWithkey.push({ key: value, value: "1", name: name });
                safetydetails[value] = "1";
            }
        }

        // Final structured response (same like add)
        const data = {
            liketohost: { type: property.property_type },
            describeyourplace: { type: property.describe_apartment },
            typeofplaceguesthave: { type: property.room_type },
            elsemightbethere: { type: property.other_people },
            apartmenttitle: { title: property.title },
            apartmentdescription: { description: property.description },
            userAdditionalInfo: groupedByUser,

            startwiththebasics: {
                peoplecanstay: {
                    guests: property.max_guests,
                    bedrooms: property.bedrooms,
                    beds: property.beds,
                },
                havealock: { type: property.bedroom_look }
            },

            bathroomsareavailabletoguests: {
                privateandatteched: property.attached_bathrooms,
                dedicated: property.dedicated_bathrooms,
                shared: property.shard_bathrooms
            },

            placelocated: {
                streetaddress: address.street_address,
                district: address.district,
                city: address.city,
                state: address.state_province,
                pincode: address.postal_code,
                country: address.country,
                latitude: address.latitude,
                longitude: address.longitude
            },
            residentailaddress: {
                flat: hostAddress.flat,
                streetaddress: hostAddress.street_address,
                city: hostAddress.city,
                state: hostAddress.state_province,
                pincode: hostAddress.zip_code,
                country: hostAddress.country,
                landmark: hostAddress.landmark,
                district: hostAddress.district
            },
            hostDetailes: {
                host_name: hostDetailes.host_name,
                profile: hostDetailes.profile,
                created_at: hostDetailes.created_at,
                hostType: 'Host',
                hostAddress: hostAddress.city + ' ' + hostAddress.district + '' + hostAddress.country
            },
            placePhotos: {
                images: images
            },

            placehastooffer,
            describeyourapartment,
            safetydetails,

            pickyourbookingsetting: {
                approve5booking: booking.approve5booking || 0,
                instantbook: booking.instantbook || 0
            },

            weekdaybaseprice: { price: property.weekday_price },
            weekendprice: { price: property.weekend_price },
            discount: {
                newlistingpromotion: discount.newlistingpromotion || 0,
                lastminutediscount: discount.lastminutediscount || 0,
                weeklydiscount: discount.weeklydiscount || 0,
                monthlydiscount: discount.monthlydiscount || 0
            },
            reservationType: property.reservation_type,
            placehastoofferWithkey,
            describeyourapartmentWithkey,
            safetydetailsWithkey

        };

        res.json({ status: true, message: "Property fetched successfully", data });

    } catch (err) {
        console.error("View property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

//// view property-new proper 
router.get('/view-property', async (req, res) => {
    const { propertyId } = req.query;

    if (!propertyId) {
        return res.status(400).json({ status: false, message: "Property ID required" });
    }

    try {

        // =========================
        // 1️⃣ MAIN PROPERTY
        // =========================
        const [propertyRows] = await db.promise().query(
            `SELECT * FROM properties WHERE property_id = ?`,
            [propertyId]
        );

        if (!propertyRows.length) {
            return res.status(404).json({ status: false, message: "Property not found" });
        }

        const property = propertyRows[0];

        // =========================
        // 2️⃣ RELATED TABLES
        // =========================

        const [[address = {}]] = await db.promise().query(
            `SELECT * FROM property_addresses WHERE property_id = ?`,
            [propertyId]
        );

        const [[availability = {}]] = await db.promise().query(
            `SELECT * FROM property_availability WHERE property_id = ?`,
            [propertyId]
        );

        const [[booking = {}]] = await db.promise().query(
            `SELECT * FROM property_booking_settings WHERE property_id = ?`,
            [propertyId]
        );

        const [[discount = {}]] = await db.promise().query(
            `SELECT newlistingpromotion, lastminutediscount, weeklydiscount, monthlydiscount FROM property_discounts WHERE property_id = ?`,
            [propertyId]
        );

        const [[descriptionDetails = {}]] = await db.promise().query(
            `SELECT * FROM property_description_details WHERE property_id = ?`,
            [propertyId]
        );

        const [[houseRules = {}]] = await db.promise().query(
            `SELECT * FROM house_rules WHERE property_id = ?`,
            [propertyId]
        );

        const [[cancellationPolicy = {}]] = await db.promise().query(
            `SELECT * FROM property_cancellation_policy WHERE property_id = ?`,
            [propertyId]
        );

        const [[hostProfile = {}]] = await db.promise().query(
            `SELECT host_id, host_name, profile, created_at FROM host_profiles WHERE host_id = ?`,
            [property.host_id]
        );

        const [[hostAddress = {}]] = await db.promise().query(
            `SELECT * FROM host_addresses WHERE host_id = ?`,
            [property.host_id]
        );

        // =========================
        // 3️⃣ IMAGES
        // =========================
        const [imageRows] = await db.promise().query(
            `SELECT image_url FROM property_images WHERE property_id = ?`,
            [propertyId]
        );

        const images = imageRows.map(img => img.image_url);

        // =========================
        // 4️⃣ AMENITIES
        // =========================
        const [amenityRows] = await db.promise().query(`
            SELECT a.value, a.name, pa.data_key
            FROM property_amenities pa
            JOIN amenities a ON pa.amenity_id = a.amenity_id
            WHERE pa.property_id = ?
        `, [propertyId]);

        let amenitiesGrouped = {};
        let amenitiesWithKey = [];

        for (const row of amenityRows) {
            if (!amenitiesGrouped[row.data_key]) {
                amenitiesGrouped[row.data_key] = {};
            }
            amenitiesGrouped[row.data_key][row.value] = "1";
            amenitiesWithKey.push({
                key: row.value,
                value: "1",
                name: row.name,
                category: row.data_key
            });
        }

        // =========================
        // FINAL RESPONSE
        // =========================

        const data = {

            // BASIC
            propertyId: property.property_id,
            title: property.title,
            reservationType: property.reservation_type,

            // PROPERTY TYPE
            property_type: {
                most_like_your_place: property.most_like_your_place,
                property_type: property.property_type,
                listing_type: property.listing_type,
                how_many_floors_in_the_building: property.floor,
                which_floor_is_the_listing_on: property.floor_listing,
                year_built: property.year_built,
                property_size: property.property_size,
                unit: property.unit
            },

            // PRICE
            per_night_price: {
                price: property.price_per_night
            },

            // GUESTS
            number_of_guests: {
                value: property.max_guests
            },

            // AVAILABILITY
            minimum_nights: {
                value: availability.minimumavailability || 0
            },
            maximum_nights: {
                value: availability.maximumnights || 0
            },
            availability: {
                advance_notice: availability.advancenotice,
                same_day_advance_notice: availability.samedayadvancenotice,
                preparation_time: availability.preparationtime,
                availability_window: availability.availabilitywindow
            },
            more_availability: {
                restricted_check_in: availability.restricted_checkin,
                restricted_check_out: availability.restricted_checkout
            },

            // LOCATION
            location: {
                street_address: address.street_address,
                city: address.city,
                state: address.state_province,
                postal_code: address.postal_code,
                country: address.country,
                latitude: address.latitude,
                longitude: address.longitude
            },

            // DESCRIPTION
            listing_description: {
                description: descriptionDetails.listingdescription
            },
            your_property_details: {
                details: descriptionDetails.yourproperty
            },
            your_property_guest_access_details: {
                details: descriptionDetails.guestaccessdetails
            },
            Interaction_with_guests: {
                details: descriptionDetails.interactionwithguests
            },

            // BOOKING
            booking_setting: {
                value: booking.instantbook === 1 ? "Use Instant Book" : "Approve all booking"
            },

            // DISCOUNT
            discount: {
                monthly_discount: discount?.monthlydiscount || 0,
                weekly_discount: discount?.weeklydiscount || 0

            },



            // HOUSE RULES
            house_rules: {
                pets_allowed: houseRules.no_pets == 1 ? "true" : "false",
                smoking: houseRules.no_smoking == 1 ? "true" : "false",
                events_allowed: houseRules.no_parties == 1 ? "true" : "false",
                quiet_hours: houseRules.no_children == 1 ? "true" : "false",
                checkin_checkout_times: houseRules.check_in_time ? "true" : "false",
                checkinwindowintime: houseRules.check_in_time,
                checkoutwindowouttime: houseRules.check_out_time,
                maxPets: houseRules.max_pets,
                quietStart: houseRules.quiet_start_time || 0,
                quietEnd: houseRules.quiet_end_time || 0,
                commercialAllowed: houseRules.commercial_photography_allowed == 1 ? "true" : "false",
                checkOutTime: houseRules.checkOutTime,
                Additional_rules: {
                    value: houseRules.other_rules
                }
            },

            // CANCELLATION
            standard_policy: {
                value: cancellationPolicy.standardpolicy
            },
            long_term_stay_policy: {
                value: cancellationPolicy.longtermstaypolicy
            },

            // HOST
            host: {
                host_name: hostProfile.host_name,
                profile: hostProfile.profile,
                created_at: hostProfile.created_at,
                address: hostAddress
            },

            // IMAGES
            photo_tour: {
                images: images
            },

            // AMENITIES
            amenities: amenitiesGrouped,
            amenitiesWithKey

        };

        res.json({
            status: true,
            message: "Property fetched successfully",
            data
        });

    } catch (err) {
        console.error("View property error:", err);
        res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message
        });
    }
});

router.get('/viewPropertyList', async (req, res) => {
    const hostId = req.user?.host_id;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host not found, please re-login" });
    }
    try {

        let query = `SELECT 
    p.property_id,
    p.title,
    p.status,
    pi.image_url,
    pa.street_address,
    pa.city,
    pa.district,
    pa.state_province,
    pa.postal_code,
    pa.country
FROM properties p
LEFT JOIN property_images pi 
    ON pi.property_id = p.property_id 
    AND pi.is_primary = 1
LEFT JOIN property_addresses pa 
    ON pa.property_id = p.property_id
WHERE p.host_id = ?
ORDER BY p.property_id DESC;`
        const [properties] = await db.promise().query(query, [hostId]);

        // 🧩 Group properties by status
        const groupedData = {
            pending: [],
            inprocess: [],
            complete: []
        };

        properties.forEach((p) => {
            if (p.status === 0) {
                groupedData.pending.push(p);
            } else if (p.status === 1) {
                groupedData.complete.push(p);
            } else {
                groupedData.inprocess.push(p);
            }
        });
        return res.status(200).json({
            status: true,
            message: "Property fetched successfully",
            data: groupedData
        });

    } catch (err) {
        console.error("❌ View property error:", err);
        return res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});


// Edit Property Listing API - Handles individual section updates
router.post('/edit-property-listing', async (req, res) => {
    const userId = req.user.user_id;
    const hostId = req.user.host_id;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host Not found pls re-login" });
    }


    const { type, propertyId, data } = req.body;

    if (!type || !propertyId) {
        return res.status(400).json({ status: false, message: "Property ID and type are required" });
    }

    const connection = await dbn.getConnection();

    try {

        let updateQuery = "";
        let updateValue = [];
        // Handle different section types based on your data structure
        switch (type) {
            case "title":
                updateQuery = `UPDATE properties SET title = ? WHERE property_id=? AND host_id=?`;
                updateValue = [data?.title?.title, propertyId, hostId];
                await connection.query(updateQuery, updateValue);
                break;

            case "property_type":
                const propType = data?.property_type;
                updateQuery = `UPDATE properties SET 
                    property_type = ?,
                    most_like_your_place = ?,
                    listing_type = ?,
                    floor = ?,
                    floor_listing = ?,
                    year_built = ?,
                    property_size = ?,
                    unit = ?
                    WHERE property_id=? AND host_id=?`;
                updateValue = [
                    propType?.property_type || "",
                    propType?.most_like_your_place || "",
                    propType?.listing_type || "",
                    propType?.how_many_floors_in_the_building || 0,
                    propType?.which_floor_is_the_listing_on || 0,
                    propType?.year_built || 0,
                    propType?.property_size || 0,
                    propType?.unit || "",
                    propertyId,
                    hostId
                ];
                await connection.query(updateQuery, updateValue);
                break;

            case "per_night_price":
                updateQuery = `UPDATE properties SET price_per_night = ? WHERE property_id=? AND host_id=?`;
                updateValue = [data?.per_night_price?.per_night_price || 0, propertyId, hostId];
                await connection.query(updateQuery, updateValue);
                break;

            case "weekly_discount":
                // Handle discounts - assuming you have a property_discounts table
                const discount = data?.weekly_discount;

                // Check if discount record exists
                const [existingDiscount] = await connection.query(
                    "SELECT id FROM property_discounts WHERE property_id = ?",
                    [propertyId]
                );

                if (existingDiscount.length > 0) {
                    updateQuery = `UPDATE property_discounts SET weeklydiscount = ? WHERE property_id = ?`;
                    updateValue = [discount?.weekly_discount || 0, propertyId];
                } else {
                    updateQuery = `INSERT INTO property_discounts (property_id, weeklydiscount) VALUES (?, ?)`;
                    updateValue = [propertyId, discount?.weekly_discount || 0];
                }
                await connection.query(updateQuery, updateValue);
                break;
            case "monthly_discount":
                const monthly_discount = data?.monthly_discount;

                // Check if discount record exists
                const [monthlyDiscount] = await connection.query(
                    "SELECT id FROM property_discounts WHERE property_id = ?",
                    [propertyId]
                );

                if (monthlyDiscount.length > 0) {
                    updateQuery = `UPDATE property_discounts SET monthlydiscount = ? WHERE property_id = ?`;
                    updateValue = [monthly_discount?.monthly_discount || 0, propertyId];
                } else {
                    updateQuery = `INSERT INTO property_discounts (property_id, monthlydiscount) VALUES (?, ?)`;
                    updateValue = [propertyId, monthly_discount?.monthly_discount || 0];
                }

                await connection.query(updateQuery, updateValue);
                break;

            case "minimum_nights":
            case "maximum_nights":
                // Handle in property_availability table
                const nightsValue = data[type][type] || 0;

                const field = type === "minimum_nights" ? "minimumavailability" : "maximumnights";

                // Check if availability record exists
                const [existingAvail] = await connection.query(
                    "SELECT id FROM property_availability WHERE property_id = ?",
                    [propertyId]
                );

                if (existingAvail.length > 0) {
                    updateQuery = `UPDATE property_availability SET ${field} = ? WHERE property_id = ?`;
                    updateValue = [nightsValue, propertyId];
                } else {
                    updateQuery = `INSERT INTO property_availability (property_id, ${field}) VALUES (?, ?)`;
                    updateValue = [propertyId, nightsValue];
                }
                await connection.query(updateQuery, updateValue);
                break;

            case "availability":
                const avail = data?.availability;
                // Check if availability record exists
                const [availCheck] = await connection.query(
                    "SELECT id FROM property_availability WHERE property_id = ?",
                    [propertyId]
                );


                if (availCheck.length > 0) {
                    updateQuery = `UPDATE property_availability SET 
                        advancenotice = ?,
                        samedayadvancenotice = ?,
                        preparationtime = ?,
                        availabilitywindow = ?
                        WHERE property_id = ?`;
                    updateValue = [
                        avail?.advance_notice || null,
                        avail?.same_day_advance_notice || null,
                        avail?.preparation_time || null,
                        avail?.availability_window || null,
                        propertyId
                    ];
                } else {
                    updateQuery = `INSERT INTO property_availability 
                        (property_id, advancenotice, samedayadvancenotice, preparationtime, availabilitywindow)
                        VALUES (?, ?, ?, ?, ?)`;
                    updateValue = [
                        propertyId,
                        avail?.advance_notice || null,
                        avail?.same_day_advance_notice || null,
                        avail?.preparation_time || null,
                        avail?.availability_window || null
                    ];
                }
                await connection.query(updateQuery, updateValue);
                break;

            case "more_availability":
                const moreAvail = data?.more_availability;

                // Check if availability record exists
                const [moreAvailCheck] = await connection.query(
                    "SELECT id FROM property_availability WHERE property_id = ?",
                    [propertyId]
                );

                if (moreAvailCheck.length > 0) {
                    updateQuery = `UPDATE property_availability SET 
                        restricted_checkin = ?,
                        restricted_checkout = ?
                        WHERE property_id = ?`;
                    updateValue = [
                        moreAvail?.restricted_check_in || null,
                        moreAvail?.restricted_check_out || null,
                        propertyId
                    ];
                } else {
                    updateQuery = `INSERT INTO property_availability 
                        (property_id, restricted_checkin, restricted_checkout)
                        VALUES (?, ?, ?)`;
                    updateValue = [
                        propertyId,
                        moreAvail?.restricted_check_in || null,
                        moreAvail?.restricted_check_out || null
                    ];
                }
                await connection.query(updateQuery, updateValue);
                break;

            case "number_of_guests":
                updateQuery = `UPDATE properties SET max_guests = ? WHERE property_id=? AND host_id=?`;
                updateValue = [data?.number_of_guests?.number_of_guests || 0, propertyId, hostId];
                await connection.query(updateQuery, updateValue);
                break;

            case "listing_description":
            case "your_property_details":
            case "your_property_guest_access_details":
            case "Interaction_with_guests":
                // Handle in property_description_details table
                let descField = "";
                let descValue = "";

                switch (type) {
                    case "listing_description":
                        descField = "listingdescription";
                        descValue = data?.listing_description?.listing_description || "";
                        break;
                    case "your_property_details":
                        descField = "yourproperty";
                        descValue = data?.your_property_details?.your_property_details || "";
                        break;
                    case "your_property_guest_access_details":
                        descField = "guestaccessdetails";
                        descValue = data?.your_property_guest_access_details?.your_property_guest_access_details || "";
                        break;
                    case "Interaction_with_guests":
                        descField = "interactionwithguests";
                        descValue = data?.Interaction_with_guests?.Interaction_with_guests || "";
                        break;
                }

                // Check if description record exists
                const [descCheck] = await connection.query(
                    "SELECT id FROM property_description_details WHERE property_id = ?",
                    [propertyId]
                );

                if (descCheck.length > 0) {
                    updateQuery = `UPDATE property_description_details SET ${descField} = ? WHERE property_id = ?`;
                    updateValue = [descValue, propertyId];
                } else {
                    updateQuery = `INSERT INTO property_description_details (property_id, ${descField}) VALUES (?, ?)`;
                    updateValue = [propertyId, descValue];
                }
                await connection.query(updateQuery, updateValue);
                break;

            case "amenities":
                // Handle amenities
                if (data.amenities && data.amenities.amenities) {
                    // Delete existing amenities
                    await connection.query(`DELETE FROM property_amenities WHERE property_id=? AND data_key='amenities'`, [propertyId]);

                    // Split comma-separated amenities and insert
                    const amenitiesList = data.amenities.amenities;
                    for (const amenity of amenitiesList) {
                        const [rows] = await connection.query(
                            `SELECT amenity_id FROM amenities WHERE name LIKE ? OR value LIKE ?`,
                            [`%${amenity}%`, `%${amenity}%`]
                        );

                        if (rows.length) {
                            await connection.query(
                                `INSERT INTO property_amenities (property_id, amenity_id, data_key) VALUES (?,?,?)`,
                                [propertyId, rows[0].amenity_id, "amenities"]
                            );
                        }
                    }
                }
                break;

            case "location":
                const loc = data?.location?.location;

                // Check if address record exists
                const [addrCheck] = await connection.query(
                    "SELECT address_id FROM property_addresses WHERE property_id = ?",
                    [propertyId]
                );

                if (addrCheck.length > 0) {
                    updateQuery = `UPDATE property_addresses SET 
                        street_address = ?,
                        city = ?,
                        state_province = ?,
                        postal_code = ?,
                        country = ?,
                        latitude = ?,
                        longitude = ?
                        WHERE property_id = ?`;
                    updateValue = [
                        loc?.street || "",
                        loc?.city || "",
                        loc?.state || "",
                        loc?.postalCode || "",
                        loc?.country || "",
                        loc?.latitude || "",
                        loc?.longitude || "",
                        propertyId
                    ];
                } else {
                    updateQuery = `INSERT INTO property_addresses 
                        (property_id, street_address, city, state_province, postal_code, country, latitude, longitude)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    updateValue = [
                        propertyId,
                        loc?.street_address || "",
                        loc?.city || "",
                        loc?.state || "",
                        loc?.postal_code || "",
                        loc?.country || "",
                        loc?.latitude || "",
                        loc?.longitude || ""
                    ];
                }
                await connection.query(updateQuery, updateValue);
                break;
            case "booking_setting":
                const bookingVal = data?.booking_setting?.booking_setting === "Use Instant Book" ? 1 : 0;

                // Check if booking settings record exists
                const [bookingCheck] = await connection.query(
                    "SELECT id FROM property_booking_settings WHERE property_id = ?",
                    [propertyId]
                );

                if (bookingCheck.length > 0) {
                    updateQuery = `UPDATE property_booking_settings SET instantbook = ? WHERE property_id = ?`;
                    updateValue = [bookingVal, propertyId];
                } else {
                    updateQuery = `INSERT INTO property_booking_settings (property_id, instantbook) VALUES (?, ?)`;
                    updateValue = [propertyId, bookingVal];
                }
                await connection.query(updateQuery, updateValue);
                break;

            case "house_rules":
                const rules = data?.house_rules;
                // Map your data structure to database fields
                const no_pets = rules?.petsAllowed
                const no_smoking = rules?.smokingAllowed; // smoking false means no smoking allowed
                const no_parties = rules?.eventsAllowed;
                const no_children = rules?.quietHoursAllowed;

                let check_in_time = null;
                let check_out_time = null;

                if (rules?.checkInAllowed) {
                    check_in_time = rules?.checkInStart || null;
                    check_out_time = rules?.checkInEnd || null;
                } //checkouttime

                // Check if house rules record exists
                const [rulesCheck] = await connection.query(
                    "SELECT rule_id FROM house_rules WHERE property_id = ?",
                    [propertyId]
                );

                if (rulesCheck.length > 0) {
                    updateQuery = `UPDATE house_rules SET 
                        no_pets = ?,
                        max_pets=?,
                        no_smoking = ?,
                        no_parties = ?,
                        no_children = ?,
                        check_in_time = ?,
                        check_out_time = ?,
                        other_rules = ?,
                        quiet_start_time=?,
                        quiet_end_time=?,
                        commercial_photography_allowed=? ,
                        checkOutTime=?
                        WHERE property_id = ?`;
                    updateValue = [
                        no_pets,
                        rules?.maxPets || 0,
                        no_smoking,
                        no_parties,
                        no_children,
                        check_in_time,
                        check_out_time,
                        rules?.Additional_rules?.value || null,
                        rules?.quietStart,
                        rules?.quietEnd,
                        rules?.commercialAllowed,
                        rules?.checkOutTime,
                        propertyId
                    ];

                } else {
                    updateQuery = `INSERT INTO house_rules 
                        (property_id, no_pets,max_pets, no_smoking, no_parties, no_children, check_in_time, check_out_time, other_rules,quiet_start_time, quiet_end_time, commercial_photography_allowed,checkOutTime)
                        VALUES (?, ?, ?,?, ?, ?, ?, ?, ? ,?,?,?,?)`;
                    updateValue = [
                        propertyId,
                        no_pets,
                        rules?.max_pets || 0,
                        no_smoking,
                        no_parties,
                        no_children,
                        check_in_time,
                        check_out_time,
                        rules?.Additional_rules?.value || null,
                        rules?.quietStart,
                        rules?.quietEnd,
                        rules?.commercialAllowed,
                        rules?.checkOutTime,
                    ];
                }
                await connection.query(updateQuery, updateValue);
                break;

            case "cancellation_policy":
                // Handle cancellation policies
                const policyValue = data?.cancellation_policy;

                // Check if policy record exists
                const [policyCheck] = await connection.query(
                    "SELECT id FROM property_cancellation_policy WHERE property_id = ?",
                    [propertyId]
                );

                if (policyCheck.length > 0) {
                    updateQuery = `UPDATE property_cancellation_policy SET standardpolicy = ?,longtermstaypolicy=? WHERE property_id = ?`;
                    updateValue = [policyValue?.standardPolicy, policyValue?.longTermPolicy, propertyId];
                } else {
                    updateQuery = `INSERT INTO property_cancellation_policy (property_id, standardpolicy,longtermstaypolicy) VALUES (?,?, ?)`;
                    updateValue = [propertyId, policyValue?.standardPolicy, policyValue?.longTermPolicy,];
                }
                await connection.query(updateQuery, updateValue);
                break;

            default:
                // If no matching case, just return success (no changes made)
                break;
        }

        await connection.commit();

        res.json({
            status: true,
            message: "Property section updated successfully",
            propertyId: propertyId,
            section: type
        });

    } catch (err) {
        await connection.rollback();
        console.error("Edit property listing error:", err);
        res.status(500).json({
            status: false,
            message: "Server error while updating property section",
            error: err.message
        });
    } finally {
        connection.release();
    }
});


router.post("/deletePropertyImage", async (req, res) => {
    try {

        const { propertyId, imageUrl } = req.body;

        if (!propertyId || !imageUrl) {
            return res.status(400).json({
                status: false,
                message: "propertyId and imageUrl are required"
            });
        }
        const deleted = await deletePropertyImage(propertyId, imageUrl);
        if (!deleted) {
            return res.status(404).json({
                status: false,
                message: "Image not found"
            });
        }

        res.json({
            status: true,
            message: "Image deleted successfully"
        });

    } catch (err) {
        console.error("Delete Property Image Error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Export the router
module.exports = router;




