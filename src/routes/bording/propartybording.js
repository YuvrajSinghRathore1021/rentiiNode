const express = require('express');
const router = express.Router();
// const db = require('../../../db/dbSql');
const db = require('../../../db/ConnectionSql');
const dbn = require('../../../db/db');

// view api
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
    const hostId = req.user.host_id;
    console.log(hostId)
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
            JOIN property_addresses pa ON p.property_id = pa.property_id
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

////// property on boarding/property uploads
// /////add property proper work but image not uploded 
// router.post('/add-property', async (req, res) => {
//     const connection = await dbn.getConnection();
//     try {
//         await connection.beginTransaction();

//         const userId = req.user.user_id;
//         const hostId = req.user.host_id || 1;
//         const { data } = req.body;
//         console.log(data);
//         // return;

//         // 1. Insert into properties
//         const [propertyResult] = await connection.query(`
//             INSERT INTO properties 
//             (host_id, title, description, property_type, describe_apartment, other_people, room_type, 
//              max_guests, bedrooms, bedroom_look, beds, bathrooms, attached_bathrooms, dedicated_bathrooms, shard_bathrooms,
//              latitude, longitude, weekday_price, weekend_price, created_at)
//             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
//         `, [
//             hostId,
//             data.apartmenttitle.title,
//             data.apartmentdescription.description,
//             data.liketohost.type,
//             data.describeyourplace.type,
//             data.elsemightbethere.type,
//             data.typeofplaceguesthave.type,
//             data.startwiththebasics.peoplecanstay.guests,
//             data.startwiththebasics.peoplecanstay.bedrooms,
//             data.startwiththebasics.havealock.type,
//             data.startwiththebasics.peoplecanstay.beds,
//             parseInt(data.bathroomsareavailabletoguests.privateandatteched) +
//             parseInt(data.bathroomsareavailabletoguests.dedicated) +
//             parseInt(data.bathroomsareavailabletoguests.shared),
//             data.bathroomsareavailabletoguests.privateandatteched,
//             data.bathroomsareavailabletoguests.dedicated,
//             data.bathroomsareavailabletoguests.shared,
//             data.placelocated.latitude,
//             data.placelocated.longitude,
//             data.weekdaybaseprice.price,
//             data.weekendprice.price
//         ]);
//         const propertyId = propertyResult.insertId;

//         // 2. Insert property location
//         await connection.query(`
//             INSERT INTO property_addresses
//             (property_id, street_address, city, state_province, postal_code, country, latitude, longitude)
//             VALUES (?,?,?,?,?,?,?,?)
//         `, [
//             propertyId,
//             data.placelocated.streetaddress,
//             data.placelocated.district,
//             data.placelocated.state,
//             data.placelocated.pincode,
//             data.placelocated.country,
//             data.placelocated.latitude,
//             data.placelocated.longitude
//         ]);

//         // 3. Insert host address
//         await connection.query(`
//             INSERT INTO host_addresses
//             (host_id, street_address, city, state_province, zip_code, country, landmark,district)
//             VALUES (?,?,?,?,?,?,?,?)
//         `, [
//             hostId,
//             data.residentailaddress.streetaddress,
//             data.residentailaddress.city,
//             data.residentailaddress.state,
//             data.residentailaddress.pincode,
//             data.residentailaddress.country,
//             data.residentailaddress.landmark,
//             data.residentailaddress.district
//         ]);

//         // 4. Insert images
//         if (data.placePhotos?.images?.length) {
//             for (let i = 0; i < data.placePhotos.images.length; i++) {
//                 await connection.query(`
//                     INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)
//                 `, [
//                     propertyId,
//                     data.placePhotos.images[i],
//                     i === 0 ? 1 : 0
//                 ]);
//             }
//         }

//         // 5. Insert amenities
//         if (data.placehastooffer) {
//             const amenities = Object.keys(data.placehastooffer)
//                 .filter(k => data.placehastooffer[k] == '1');

//             for (const amenity of amenities) {
//                 const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenity]);
//                 if (rows.length) {
//                     await connection.query(`
//                         INSERT INTO property_amenities (property_id, amenity_id) VALUES (?,?)
//                     `, [propertyId, rows[0].amenity_id]);
//                 }
//             }
//         }

//         // 6. Insert "describe your apartment"
//         if (data.describeyourapartment) {
//             const amenitiesD = Object.keys(data.describeyourapartment)
//                 .filter(k => data.describeyourapartment[k] == '1');

//             for (const amenityD of amenitiesD) {
//                 const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityD]);
//                 if (rows.length) {
//                     await connection.query(`
//                         INSERT INTO property_amenities (property_id, amenity_id) VALUES (?,?)
//                     `, [propertyId, rows[0].amenity_id]);
//                 }
//             }
//         }

//         // 7. Insert booking settings
//         if (data.pickyourbookingsetting) {
//             await connection.query(`
//                 INSERT INTO property_booking_settings
//                 (property_id, approve5booking, instantbook)
//                 VALUES (?,?,?)
//             `, [
//                 propertyId,
//                 data.pickyourbookingsetting.approve5booking,
//                 data.pickyourbookingsetting.instantbook
//             ]);
//         }

//         // 8. Insert discounts
//         if (data.discount) {
//             await connection.query(`
//                 INSERT INTO property_discounts
//                 (property_id, newlistingpromotion, lastminutediscount, weeklydiscount, monthlydiscount)
//                 VALUES (?,?,?,?,?)
//             `, [
//                 propertyId,
//                 data.discount.newlistingpromotion,
//                 data.discount.lastminutediscount,
//                 data.discount.weeklydiscount,
//                 data.discount.monthlydiscount
//             ]);
//         }

//         // 9. Insert safety details
//         if (data.safetydetails) {
//             const amenitiesS = Object.keys(data.safetydetails)
//                 .filter(k => data.safetydetails[k] == '1');

//             for (const amenityS of amenitiesS) {
//                 const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityS]);
//                 if (rows.length) {
//                     await connection.query(`
//                         INSERT INTO property_amenities (property_id, amenity_id) VALUES (?,?)
//                     `, [propertyId, rows[0].amenity_id]);
//                 }
//             }
//         }

//         await connection.commit();
//         res.json({ status: true, message: "Property added successfully", propertyId });

//     } catch (err) {
//         await connection.rollback();
//         console.error(err);
//         res.status(500).json({ status: false, message: "Failed to add property" });
//     } finally {
//         connection.release();
//     }
// });



const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/images/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });



router.post('/add-property', upload.array("placesPhotos", 10), async (req, res) => {
    const connection = await dbn.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.user_id;

        const hostId = req.user.host_id || 1;

        // Parse `data` JSON
        const data = JSON.parse(req.body.data);
        let status = 0;
        let statusStr = req.body.status;
        if (statusStr == "Approve") {
            status = 1;
        }
        // 
        console.log("Property Data:", data);
        // console.log("Uploaded Files:", req.files);
        // return;

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
            data.startwiththebasics.peoplecanstay?.guests || "0",
            data.startwiththebasics.peoplecanstay?.bedrooms || "0",
            data.startwiththebasics.havealock?.type || "",
            data.startwiththebasics.peoplecanstay?.beds || "0",
            parseInt(data.bathroomsareavailabletoguests.privateandatteched) + parseInt(data.bathroomsareavailabletoguests.dedicated) + parseInt(data.bathroomsareavailabletoguests.shared),
            data.bathroomsareavailabletoguests?.privateandatteched,
            data.bathroomsareavailabletoguests?.dedicated,
            data.bathroomsareavailabletoguests?.shared,
            data.placelocated?.latitude || 0,
            data.placelocated?.longitude || 0,
            data.weekdaybaseprice?.price || 0,
            data.weekendprice?.price || 0,
            status || 0,
            data?.reservationType
        ]);
        const propertyId = propertyResult.insertId;

        // 2. Insert property location
        if (data.placelocated) {
            await connection.query(`
            INSERT INTO property_addresses
            (property_id, street_address, city,district, state_province, postal_code, country, latitude, longitude)
            VALUES (?,?,?,?,?,?,?,?,?)
        `, [
                propertyId,
                data.placelocated.streetaddress,
                data.placelocated.city,
                data.placelocated.district,
                data.placelocated.state,
                data.placelocated.pincode,
                data.placelocated.country,
                data.placelocated.latitude,
                data.placelocated.longitude
            ]);
        }


        // 3. Insert host address
        if (data.residentailaddress) {
            await connection.query(`
            INSERT INTO host_addresses
            (host_id,flat, street_address, city, state_province, zip_code, country, landmark,district)
            VALUES (?,?,?,?,?,?,?,?,?)
        `, [
                hostId,
                data.residentailaddress.flat,
                data.residentailaddress.streetaddress,
                data.residentailaddress.city,
                data.residentailaddress.state,
                data.residentailaddress.pincode,
                data.residentailaddress.country,
                data.residentailaddress.landmark,
                data.residentailaddress.district
            ]);
        }

        // 4. Insert images
        if (req.files && req.files.length) {
            for (let i = 0; i < req.files.length; i++) {
                const imageUrl = `/uploads/images/${req.files[i].filename}`; // relative path
                await connection.query(`INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
                    [propertyId, imageUrl, i === 0 ? 1 : 0]);
            }
        }

        // 5. Insert amenities
        if (data.placehastooffer) {
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
                data.pickyourbookingsetting.approve5booking,
                data.pickyourbookingsetting.instantbook
            ]);
        }

        // 8. Insert discounts
        if (data.discount && Object.keys(data.discount).length > 0) {
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
        if (data.safetydetails && Object.keys(data.safetydetails).length > 0) {
            const amenitiesS = Object.keys(data.safetydetails)
                .filter(k => data.safetydetails[k] == '1');

            for (const amenityS of amenitiesS) {
                const [rows] = await connection.query(`SELECT amenity_id FROM amenities WHERE value=?`, [amenityS]);
                if (rows.length) {
                    await connection.query(`
                        INSERT INTO property_amenities (property_id, amenity_id,data_key) VALUES (?,?,?)
                    `, [propertyId, rows[0].amenity_id, "safetydetails"]);
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

// // // // // edit property 
router.post('/edit-property', async (req, res) => {
    const userId = req.user.user_id;
    const hostId = req.user.host_id;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host Not found pls re-login" });
    }

    const { type, propertyId, data } = req.body;
    if (!type || !propertyId) {
        return res.status(400).json({ status: false, message: "Property ID and type are required" });
    }

    try {
        let updateQuery = "";
        let updateValue = [];

        if (type == "liketohost") {
            updateQuery = `UPDATE properties SET property_type = ? WHERE host_id = ? AND property_id=?`;
            updateValue = [data.liketohost.type, hostId, propertyId];
        }
        else if (type == "describeyourplace") {
            updateQuery = `UPDATE properties SET describe_apartment = ? WHERE host_id = ? AND property_id=?`;
            updateValue = [data.describeyourplace.type, hostId, propertyId];
        }
        else if (type == "typeofplaceguesthave") {
            updateQuery = `UPDATE properties SET room_type = ? WHERE host_id = ? AND property_id=?`;
            updateValue = [data.typeofplaceguesthave.type, hostId, propertyId];
        }
        else if (type == "placelocated") {
            updateQuery = `UPDATE property_addresses 
                           SET street_address=?, city=?, state_province=?, postal_code=?, country=?, latitude=?, longitude=? 
                           WHERE property_id=?`;
            updateValue = [
                data.placelocated.streetaddress,
                data.placelocated.district,
                data.placelocated.state,
                data.placelocated.pincode,
                data.placelocated.country,
                data.placelocated.latitude,
                data.placelocated.longitude,
                propertyId
            ];
        }
        else if (type == "startwiththebasics") {
            updateQuery = `UPDATE properties SET max_guests=?, bedrooms=?, bedroom_look=?, beds=? WHERE property_id=?`;
            updateValue = [
                data.startwiththebasics.peoplecanstay.guests,
                data.startwiththebasics.peoplecanstay.bedrooms,
                data.startwiththebasics.havealock.type,
                data.startwiththebasics.peoplecanstay.beds,
                propertyId
            ];
        }
        else if (type == "bathroomsareavailabletoguests") {
            updateQuery = `UPDATE properties SET bathrooms=?, attached_bathrooms=?, dedicated_bathrooms=?, shard_bathrooms=? WHERE property_id=?`;
            updateValue = [
                parseInt(data.bathroomsareavailabletoguests.privateandatteched) +
                parseInt(data.bathroomsareavailabletoguests.dedicated) +
                parseInt(data.bathroomsareavailabletoguests.shared),
                data.bathroomsareavailabletoguests.privateandatteched,
                data.bathroomsareavailabletoguests.dedicated,
                data.bathroomsareavailabletoguests.shared,
                propertyId
            ];
        }
        else if (type == "elsemightbethere") {
            updateQuery = `UPDATE properties SET other_people=? WHERE property_id=?`;
            updateValue = [data.elsemightbethere.type, propertyId];
        }
        else if (type == "apartmenttitle") {
            updateQuery = `UPDATE properties SET title=? WHERE property_id=?`;
            updateValue = [data.apartmenttitle.title, propertyId];
        }
        else if (type == "apartmentdescription") {
            updateQuery = `UPDATE properties SET description=? WHERE property_id=?`;
            updateValue = [data.apartmentdescription.description, propertyId];
        }
        else if (type == "pickyourbookingsetting") {
            updateQuery = `UPDATE property_booking_settings SET approve5booking=?, instantbook=? WHERE property_id=?`;
            updateValue = [
                data.pickyourbookingsetting.approve5booking,
                data.pickyourbookingsetting.instantbook,
                propertyId
            ];
        }
        else if (type == "weekdaybaseprice") {
            updateQuery = `UPDATE properties SET weekday_price=? WHERE property_id=?`;
            updateValue = [data.weekdaybaseprice.price, propertyId];
        }
        else if (type == "weekendprice") {
            updateQuery = `UPDATE properties SET weekend_price=? WHERE property_id=?`;
            updateValue = [data.weekendprice.price, propertyId];
        }
        else if (type == "discount") {
            updateQuery = `UPDATE property_discounts 
                           SET newlistingpromotion=?, lastminutediscount=?, weeklydiscount=?, monthlydiscount=? 
                           WHERE property_id=?`;
            updateValue = [
                data.discount.newlistingpromotion,
                data.discount.lastminutediscount,
                data.discount.weeklydiscount,
                data.discount.monthlydiscount,
                propertyId
            ];
        }
        else if (type == "residentailaddress") {
            updateQuery = `UPDATE host_addresses 
                           SET flat=?,street_address=?, city=?, state_province=?, zip_code=?, country=?, landmark=?, district=? 
                           WHERE host_id=?`;
            updateValue = [
                data.residentailaddress.flat,
                data.residentailaddress.streetaddress,
                data.residentailaddress.city,
                data.residentailaddress.state,
                data.residentailaddress.pincode,
                data.residentailaddress.country,
                data.residentailaddress.landmark,
                data.residentailaddress.district,
                hostId
            ];
        }

        // ✅ Pending Parts
        else if (type == "placePhotos") {
            // delete old and insert new
            await db.promise().query(`DELETE FROM property_images WHERE property_id=?`, [propertyId]);
            if (data.placePhotos?.images?.length) {
                for (let i = 0; i < data.placePhotos.images.length; i++) {
                    await db.promise().query(
                        `INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?,?,?)`,
                        [propertyId, data.placePhotos.images[i], i === 0 ? 1 : 0]
                    );
                }
            }
        }

        else if (type == "placehastooffer" || type == "describeyourapartment" || type == "safetydetails") {
            await db.promise().query(`DELETE FROM property_amenities WHERE property_id=?`, [propertyId]);
            const items = Object.keys(data[type]).filter(k => data[type][k] == '1');
            for (const item of items) {
                const [rows] = await db.promise().query(`SELECT amenity_id FROM amenities WHERE value=?`, [item]);
                if (rows.length) {
                    await db.promise().query(
                        `INSERT INTO property_amenities (property_id, amenity_id) VALUES (?,?)`,
                        [propertyId, rows[0].amenity_id]
                    );
                }
            }
        }

        if (updateQuery) {
            await db.promise().query(updateQuery, updateValue);
        }

        res.json({ status: true, message: "Property updated successfully" });
    } catch (err) {
        console.error("Edit property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



// view property

router.get('/view-property', async (req, res) => {
    const { propertyId } = req.query;
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

        // 4. Images
        const [imageRows] = await db.promise().query(`
            SELECT * FROM property_images WHERE property_id = ?`, [propertyId]);
        const images = imageRows.map(img => img.image_url);

        // 5. Amenities
        const [amenityRows] = await db.promise().query(`
            SELECT a.value ,pa.data_key
            FROM property_amenities pa 
            JOIN amenities a ON pa.amenity_id=a.amenity_id 
            WHERE pa.property_id=?
        `, [propertyId]);
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

        // 🏗️ Map amenities into categories like add-API expects
        const placehastooffer = {};
        const describeyourapartment = {};
        const safetydetails = {};

        // // Example mapping: you can extend logic to split based on category
        // for (const a of amenitiesList) {
        //                 if (["wifi", "tv"].includes(a)) {
        //         placehastooffer[a] = "1";
        //     } else if (["sofa", "kitchen"].includes(a)) {
        //         describeyourapartment[a] = "1";
        //     } else {
        //         safetydetails[a] = "1";
        //     }           
        // }

        for (const row of amenityRows) {
            const { value, data_key } = row;
            if (data_key == "placehastooffer") {
                placehastooffer[value] = "1";
            } else if (data_key == "describeyourapartment") {
                describeyourapartment[value] = "1";
            } else if (data_key == "safetydetails") {
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
            reservationType: property.reservation_type

        };

        res.json({ status: true, message: "Property fetched successfully", data });

    } catch (err) {
        console.error("View property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});



router.get('/viewPropertyList', async (req, res) => {
    const hostId = req.user.host_id;

    if (!hostId) {
        return res.status(400).json({ status: false, message: "Host Not found pls re-login" });
    }

    try {
        // 1. Fetch property details
        const [property] = await db.promise().query(`SELECT property_id,title,status FROM properties WHERE host_id = ?`, [hostId]);
        if (!property.length) {
            return res.status(200).json({ status: false, message: "Property not found" });
        }
        res.json({ status: true, message: "Property fetched successfully", data: property });
    } catch (err) {
        console.error("View property error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


// Export the router
module.exports = router;
















// SELECT val.value
// FROM (
//     SELECT 'wifi' AS value UNION ALL
//     SELECT 'tv' UNION ALL
//      SELECT 'weapon'
// ) AS val
// LEFT JOIN amenities a ON a.value = val.value
// WHERE a.value IS NULL;