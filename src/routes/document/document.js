// const express = require('express');
// const router = express.Router();
// const db = require('../../../db/ConnectionSql');

// /** * Upload document */
// router.post("/documentUpload", async (req, res) => {

//     const { property_id, title, description, file_path, status = "active", user_id = 0 } = req.body;
//     const userIdGEt = req.user.user_id;
//     const userId = user_id || userIdGEt;
//     if (!title || !file_path) {
//         return res.status(400).json({
//             status: false,
//             message: "title and file_path are required"
//         });
//     }
//     let type = "user";
//     if (property_id > 0) {
//         type = "property";
//     }

//     try {
//         // Optional: Check property exists
//         if (type === "property") {
//             const [property] = await db.promise().query(
//                 `SELECT property_id FROM properties WHERE property_id = ?`,
//                 [property_id]
//             );

//             if (property.length === 0) {
//                 return res.status(404).json({
//                     status: false,
//                     message: "Property not found"
//                 });
//             }
//         }
//         // Insert document
//         const [result] = await db.promise().query(
//             `INSERT INTO documents 
//             (user_id, property_id, type, title, description, file_path, status, is_deleted, uploaded_by, uploaded_at)
//             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
//             [
//                 userId,
//                 property_id,
//                 type,
//                 title,
//                 description,
//                 file_path,
//                 status,
//                 userId
//             ]
//         );

//         res.json({
//             status: true,
//             message: "Document uploaded successfully",
//             document_id: result.insertId
//         });
//     } catch (err) {
//         console.error("Document upload error:", err);
//         res.status(500).json({
//             status: false,
//             message: "Server error"
//         });
//     }
// });

// router.get("/documentDetails", async (req, res) => {
//     const { page = 1, limit = 10, search = "", status = "", userId = 0, propertyId = 0 } = req.query;

//     try {
//         let query = `SELECT document_id, user_id, property_id, type, title,description, file_path, status, uploaded_at FROM documents WHERE is_deleted = 0`;
//         let queryParams = [];

//         // Status filter
//         if (status) {
//             query += " AND status = ?";
//             queryParams.push(status);
//         }

//         // Search filter
//         if (search) {
//             query += " AND (title LIKE ? OR description LIKE ?)";
//             const searchPattern = `%${search}%`;
//             queryParams.push(searchPattern, searchPattern);
//         }

//         // Pagination
//         query += " ORDER BY uploaded_at DESC LIMIT ? OFFSET ?";
//         queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

//         const [documents] = await db.promise().query(query, queryParams);

//         // Count query
//         let countQuery = `SELECT COUNT(*) AS total FROM documents WHERE is_deleted = 0 `;
//         let countParams = [];

//         if (status) {
//             countQuery += " AND status = ?";
//             countParams.push(status);
//         }

//         if (userId) {
//             countQuery += " AND user_id = ?";
//             countParams.push(userId);
//         }

//         if (propertyId) {
//             countQuery += " AND property_id = ?";
//             countParams.push(propertyId);
//         }
//         if (search) {
//             countQuery += " AND (title LIKE ? OR description LIKE ?)";
//             const searchPattern = `%${search}%`;
//             countParams.push(searchPattern, searchPattern);
//         }
//         const [countResult] = await db.promise().query(countQuery, countParams);

//         res.json({
//             status: true,
//             data: documents,
//             total: countResult[0].total,
//             page: parseInt(page),
//             limit: parseInt(limit)
//         });
//     } catch (err) {
//         console.error("Get documents error:", err);
//         res.status(500).json({
//             status: false,
//             message: "Server error"
//         });
//     }
// });

// router.delete("/deleteDocument/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         await db.promise().query(`UPDATE documents SET is_deleted = 1 WHERE document_id = ?`, [id]);
//         res.json({
//             status: true,
//             message: "Document deleted successfully"
//         });
//     } catch (err) {
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

// router.put("/updateDocumentStatus", async (req, res) => {
//     const { document_id, status } = req.body;

//     try {
//         await db.promise().query(
//             `UPDATE documents SET status = ? WHERE document_id = ?`,
//             [status, document_id]
//         );

//         res.json({
//             status: true,
//             message: "Status updated successfully"
//         });
//     } catch (err) {
//         res.status(500).json({ status: false, message: "Server error" });
//     }
// });

// // Export the router
// module.exports = router;







const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

/** * Upload document */
router.post("/documentUpload", async (req, res) => {
    const { property_id, title, description, file_path, status = 0, user_id = 0, type = 1 } = req.body;
    const userIdGEt = req.user.user_id;
    const userId = user_id || userIdGEt;

    if (!title || !file_path) {
        return res.status(400).json({
            status: false,
            message: "Title and file_path are required"
        });
    }

    try {
        // Check property exists if type is property
        if (type == 2 && property_id) {
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

        // Check user exists if user_id provided
        if (userId) {
            const [user] = await db.promise().query(
                `SELECT user_id FROM users WHERE user_id = ?`,
                [userId]
            );

            if (user.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "User not found"
                });
            }
        }

        // Insert document
        const [result] = await db.promise().query(
            `INSERT INTO documents 
            (user_id, property_id, type, title, description, file_path, status, is_deleted, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
            [
                userId || null,
                property_id || null,
                type,
                title,
                description,
                file_path,
                status,
                userIdGEt
            ]
        );

        res.json({
            status: true,
            message: "Document uploaded successfully",
            document_id: result.insertId,
            file_path: file_path
        });
    } catch (err) {
        console.error("Document upload error:", err);
        res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message
        });
    }
});

// Get document details with filters
router.get("/documentDetails", async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "", type = "all", propertyId = "", start_date = "", end_date = "" } = req.query;
    let { userId = "" } = req.query;


    try {
        let query = `
            SELECT d.*,
                u.name as user_name,
                u.email as user_email,
                p.title as property_title
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.user_id
            LEFT JOIN properties p ON d.property_id = p.property_id
            WHERE d.is_deleted = 0
        `;
        let queryParams = [];
        let queryNew = ``
        // Type filter
        if (type !== "all") {
            queryNew += " AND d.type = ?";
            queryParams.push(type === 'user' ? 1 : 2);
        }

        // Status filter
        if (status !== "") {
            queryNew += " AND d.status = ?";
            queryParams.push(status);
        }

        // User ID filter
        if (userId > 0) {
            queryNew += " AND d.user_id = ?";
            queryParams.push(userId);
        }

        // Property ID filter
        if (propertyId) {
            queryNew += " AND d.property_id = ?";
            queryParams.push(propertyId);
        }

        // Date range filter
        if (start_date) {
            queryNew += " AND DATE(d.uploaded_at) >= ?";
            queryParams.push(start_date);
        }
        if (end_date) {
            queryNew += " AND DATE(d.uploaded_at) <= ?";
            queryParams.push(end_date);
        }

        // Search filter
        if (search) {
            queryNew += " AND (d.title LIKE ? OR d.description LIKE ? OR u.name LIKE ? OR p.title LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) AS total 
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.user_id
            LEFT JOIN properties p ON d.property_id = p.property_id
            WHERE d.is_deleted = 0
        `;
        query += queryNew
        countQuery += queryNew

        let countParams = [...queryParams];

        // Add pagination
        query += " ORDER BY d.uploaded_at DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        // Execute queries
        const [documents] = await db.promise().query(query, queryParams);
        const [countResult] = await db.promise().query(countQuery, countParams);

        // Get statistics
        let statsQuery = `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN type = 1 THEN 1 ELSE 0 END) as user_docs,
                SUM(CASE WHEN type = 2 THEN 1 ELSE 0 END) as property_docs
            FROM documents
            WHERE is_deleted = 0`;

        let statsParams = [];

        if (propertyId) {
            statsQuery += " AND property_id = ?";
            statsParams.push(propertyId);
        }


        const [stats] = await db.promise().query(statsQuery, statsParams);

        res.json({
            status: true,
            data: documents,
            total: countResult[0].total,
            stats: stats[0] || {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                user_docs: 0,
                property_docs: 0
            },
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get documents error:", err);
        res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message
        });
    }
});

// Get single document by ID
router.get("/document/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [documents] = await db.promise().query(`
            SELECT 
                d.*,
                u.name as user_name,
                u.email as user_email,
                p.title as property_title
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.user_id
            LEFT JOIN properties p ON d.property_id = p.property_id
            WHERE d.document_id = ? AND d.is_deleted = 0
        `, [id]);

        if (documents.length === 0) {
            return res.status(404).json({
                status: false,
                message: "Document not found"
            });
        }

        res.json({
            status: true,
            data: documents[0]
        });
    } catch (err) {
        console.error("Get document error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Update document
router.put("/updateDocument", async (req, res) => {
    const { document_id, title, description, file_path, status } = req.body;

    if (!document_id || !title) {
        return res.status(400).json({
            status: false,
            message: "Document ID and title are required"
        });
    }

    try {
        let query = "UPDATE documents SET title = ?, description = ?, status = ?";
        let params = [title, description, status];

        if (file_path) {
            query += ", file_path = ?";
            params.push(file_path);
        }

        query += " WHERE document_id = ?";
        params.push(document_id);

        await db.promise().query(query, params);

        res.json({
            status: true,
            message: "Document updated successfully"
        });
    } catch (err) {
        console.error("Update document error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Soft delete document
router.delete("/deleteDocument/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.promise().query(
            `UPDATE documents SET is_deleted = 1 WHERE document_id = ?`,
            [id]
        );

        res.json({
            status: true,
            message: "Document deleted successfully"
        });
    } catch (err) {
        console.error("Delete document error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Update document status
router.put("/updateDocumentStatus", async (req, res) => {
    const { document_id, status } = req.body;

    if (!document_id || status === undefined) {
        return res.status(400).json({
            status: false,
            message: "Document ID and status are required"
        });
    }

    try {
        await db.promise().query(
            `UPDATE documents SET status = ? WHERE document_id = ?`,
            [status, document_id]
        );

        // Get updated document for response
        const [documents] = await db.promise().query(
            `SELECT * FROM documents WHERE document_id = ?`,
            [document_id]
        );

        res.json({
            status: true,
            message: "Status updated successfully",
            data: documents[0]
        });
    } catch (err) {
        console.error("Update status error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Get documents by user
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const [documents] = await db.promise().query(`
            SELECT * FROM documents 
            WHERE user_id = ? AND is_deleted = 0
            ORDER BY uploaded_at DESC
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);

        const [countResult] = await db.promise().query(
            `SELECT COUNT(*) as total FROM documents WHERE user_id = ? AND is_deleted = 0`,
            [userId]
        );

        res.json({
            status: true,
            data: documents,
            total: countResult[0].total
        });
    } catch (err) {
        console.error("Get user documents error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Get documents by property
router.get("/property/:propertyId", async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const [documents] = await db.promise().query(`
            SELECT * FROM documents 
            WHERE property_id = ? AND is_deleted = 0
            ORDER BY uploaded_at DESC
            LIMIT ? OFFSET ?
        `, [propertyId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);

        const [countResult] = await db.promise().query(
            `SELECT COUNT(*) as total FROM documents WHERE property_id = ? AND is_deleted = 0`,
            [propertyId]
        );

        res.json({
            status: true,
            data: documents,
            total: countResult[0].total
        });
    } catch (err) {
        console.error("Get property documents error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Get document statistics
router.get("/stats", async (req, res) => {
    try {
        const [stats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN type = 1 THEN 1 ELSE 0 END) as user_documents,
                SUM(CASE WHEN type = 2 THEN 1 ELSE 0 END) as property_documents,
                SUM(CASE WHEN DATE(uploaded_at) = CURDATE() THEN 1 ELSE 0 END) as uploaded_today,
                SUM(CASE WHEN WEEK(uploaded_at) = WEEK(NOW()) THEN 1 ELSE 0 END) as uploaded_this_week,
                SUM(CASE WHEN MONTH(uploaded_at) = MONTH(NOW()) THEN 1 ELSE 0 END) as uploaded_this_month
            FROM documents
            WHERE is_deleted = 0
        `);

        res.json({
            status: true,
            data: stats[0] || {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                user_documents: 0,
                property_documents: 0,
                uploaded_today: 0,
                uploaded_this_week: 0,
                uploaded_this_month: 0
            }
        });
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

module.exports = router;
