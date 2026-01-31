const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

//// user book property 


/** * Upload document */
router.post("/documentUpload", async (req, res) => {

    const { property_id, title, description, file_path, status = "active", user_id = 0 } = req.body;
    const userIdGEt = req.user.user_id;
    const userId = user_id || userIdGEt;
    if (!title || !file_path) {
        return res.status(400).json({
            status: false,
            message: "title and file_path are required"
        });
    }
    let type = "user";
    if (property_id > 0) {
        type = "property";
    }

    try {
        // Optional: Check property exists
        if (type === "property") {
            const [property] = await db.promise().query(
                `SELECT property_id FROM properties WHERE property_id = ?`,
                [property_id]
            );

            if (property.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Property not found"
                });
            }
        }
        // Insert document
        const [result] = await db.promise().query(
            `INSERT INTO documents 
            (user_id, property_id, type, title, description, file_path, status, is_deleted, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
            [
                userId,
                property_id,
                type,
                title,
                description,
                file_path,
                status,
                userId
            ]
        );

        res.json({
            status: true,
            message: "Document uploaded successfully",
            document_id: result.insertId
        });
    } catch (err) {
        console.error("Document upload error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});


router.get("/documentDetails", async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "", userId = 0, propertyId = 0 } = req.query;

    try {
        let query = `SELECT document_id, user_id, property_id, type, title,description, file_path, status, uploaded_at FROM documents WHERE is_deleted = 0`;
        let queryParams = [];

        // Status filter
        if (status) {
            query += " AND status = ?";
            queryParams.push(status);
        }

        // Search filter
        if (search) {
            query += " AND (title LIKE ? OR description LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        // Pagination
        query += " ORDER BY uploaded_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [documents] = await db.promise().query(query, queryParams);

        // Count query
        let countQuery = `SELECT COUNT(*) AS total FROM documents WHERE is_deleted = 0 `;
        let countParams = [];

        if (status) {
            countQuery += " AND status = ?";
            countParams.push(status);
        }

        if (userId) {
            countQuery += " AND user_id = ?";
            countParams.push(userId);
        }

        if (propertyId) {
            countQuery += " AND property_id = ?";
            countParams.push(propertyId);
        }
        if (search) {
            countQuery += " AND (title LIKE ? OR description LIKE ?)";
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }
        const [countResult] = await db.promise().query(countQuery, countParams);

        res.json({
            status: true,
            data: documents,
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get documents error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});



router.delete("/deleteDocument/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.promise().query(`UPDATE documents SET is_deleted = 1 WHERE document_id = ?`, [id]);
        res.json({
            status: true,
            message: "Document deleted successfully"
        });
    } catch (err) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});


router.put("/updateDocumentStatus", async (req, res) => {
    const { document_id, status } = req.body;

    try {
        await db.promise().query(
            `UPDATE documents SET status = ? WHERE document_id = ?`,
            [status, document_id]
        );

        res.json({
            status: true,
            message: "Status updated successfully"
        });
    } catch (err) {
        res.status(500).json({ status: false, message: "Server error" });
    }
});



// Export the router
module.exports = router;
































