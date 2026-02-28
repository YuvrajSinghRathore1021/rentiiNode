const db = require("../../db/ConnectionSql");

/**
 * Save Single Image
 */
const addPropertyImage = async (propertyId, imageUrl) => {
    try {
        const [result] = await db.promise().query(
            `INSERT INTO property_images (property_id, image_url)
             VALUES (?, ?)`,
            [propertyId, imageUrl]
        );

        return result.insertId;

    } catch (error) {
        console.error("Add Property Image Error:", error);
        throw error;
    }
};


/**
 * Save Multiple Images (Bulk Insert - Recommended)
 */
const addMultiplePropertyImages = async (propertyId, imagesArray) => {
    try {
        if (!imagesArray || imagesArray.length === 0) {
            return false;
        }

        const values = imagesArray.map(img => [propertyId, img]);

        await db.promise().query(
            `INSERT INTO property_images (property_id, image_url)
             VALUES ?`,
            [values]
        );

        return true;

    } catch (error) {
        console.error("Bulk Image Insert Error:", error);
        throw error;
    }
};


/**
 * Delete Single Image
 */
const deletePropertyImage = async (propertyId, imageUrl) => {
    try {
        const [result] = await db.promise().query(
            `DELETE FROM property_images
             WHERE property_id = ? AND image_url = ?`,
            [propertyId, imageUrl]
        );

        return result.affectedRows > 0;

    } catch (error) {
        console.error("Delete Property Image Error:", error);
        throw error;
    }
};


/**
 * Delete All Images of Property
 */
const deleteAllPropertyImages = async (propertyId) => {
    try {
        await db.promise().query(
            `DELETE FROM property_images
             WHERE property_id = ?`,
            [propertyId]
        );

        return true;

    } catch (error) {
        console.error("Delete All Property Images Error:", error);
        throw error;
    }
};


module.exports = {
    addPropertyImage,
    addMultiplePropertyImages,
    deletePropertyImage,
    deleteAllPropertyImages
};