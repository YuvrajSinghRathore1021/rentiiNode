// routes/broker.js
const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');
// const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');


// Middleware to check if user is broker
const isBroker = async (req, res, next) => {
    try {

        const userId = req.user.user_id;

        const [rows] = await db.promise().query(
            `SELECT id FROM brokers WHERE user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {

            const [result] = await db.promise().query(
                `INSERT INTO brokers (user_id) VALUES (?)`,
                [userId]
            );

            req.brokerId = result.insertId;

        } else {

            req.brokerId = rows[0].id;

        }

        next();

    } catch (error) {

        console.error("Broker middleware error:", error);

        return res.status(500).json({
            status: 0,
            message: "Server error"
        });

    }
};
// Apply middleware to all routes
router.use(isBroker);

// ==================== PROFILE APIs ====================

// Get broker profile

router.get('/profile', async (req, res) => {
    try {

        const [rows] = await db.promise().query(
            `SELECT b.*, u.email, u.name, u.phone_number as phone 
             FROM brokers b 
             JOIN users u ON b.user_id = u.user_id 
             WHERE b.id = ?`,
            [req.brokerId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ status: 0, message: 'Profile not found' });
        }

        const profile = rows[0];

        // Safe JSON parsing
        if (profile.specialization && typeof profile.specialization === "string") {
            profile.specialization = JSON.parse(profile.specialization);
        }

        if (profile.languages && typeof profile.languages === "string") {
            profile.languages = JSON.parse(profile.languages);
        }

        res.json({
            status: 1,
            data: profile
        });

    } catch (error) {

        console.error('Get profile error:', error);

        res.status(500).json({
            status: 0,
            message: 'Server error'
        });

    }
});

// Update broker profile
router.put('/profile', [
    body('name').optional().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().notEmpty(),
    body('company_name').optional(),
    body('gst_number').optional(),
    body('pan_number').optional(),
    body('license_number').optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 0, errors: errors.array() });
    }

    try {
        const {
            name, email, phone, alternate_phone, company_name, company_address,
            city, state, pincode, gst_number, pan_number, license_number,
            experience_years, specialization, languages, profile_image, about
        } = req.body;

       

        try {
            // Update users table
            if (name || email || phone) {
                await db.promise().query(
                    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone_number = COALESCE(?, phone_number) WHERE user_id = (SELECT user_id FROM brokers WHERE id = ?)',
                    [name, email, phone, req.brokerId]
                );
            }

            // Update brokers table
            await db.promise().query(
                `UPDATE brokers SET 
                    alternate_phone = COALESCE(?, alternate_phone),
                    company_name = COALESCE(?, company_name),
                    company_address = COALESCE(?, company_address),
                    city = COALESCE(?, city),
                    state = COALESCE(?, state),
                    pincode = COALESCE(?, pincode),
                    gst_number = COALESCE(?, gst_number),
                    pan_number = COALESCE(?, pan_number),
                    license_number = COALESCE(?, license_number),
                    experience_years = COALESCE(?, experience_years),
                    specialization = COALESCE(?, specialization),
                    languages = COALESCE(?, languages),
                    profile_image = COALESCE(?, profile_image),
                    about = COALESCE(?, about)
                WHERE id = ?`,
                [
                    alternate_phone, company_name, company_address, city, state,
                    pincode, gst_number, pan_number, license_number, experience_years,
                    specialization ? JSON.stringify(specialization) : null,
                    languages ? JSON.stringify(languages) : null,
                    profile_image, about, req.brokerId
                ]
            );

            
            res.json({ status: 1, message: 'Profile updated successfully' });
        } catch (error) {
           
            throw error;
        } finally {
        }
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
    try {
        const [stats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total_properties,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_listings,
                SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_properties,
                SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) as rented_properties,
                SUM(CASE WHEN status = 'leased' THEN 1 ELSE 0 END) as leased_properties
             FROM brokerproperties WHERE broker_id = ?`,
            [req.brokerId]
        );

        const [leadStats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total_leads,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_leads,
                SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested_leads,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_leads,
                SUM(CASE WHEN status = 'follow-up' THEN 1 ELSE 0 END) as pending_leads
             FROM broker_property_inquiries WHERE broker_id = ?`,
            [req.brokerId]
        );

        res.json({
            status: 1,
            data: {
                ...stats[0],
                ...leadStats[0]
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get recent activities
router.get('/recent-activities', async (req, res) => {
    try {
        const [activities] = await db.promise().query(
            `SELECT 'property' as type, CONCAT('Added new property: ', title) as description, created_at 
             FROM brokerproperties WHERE broker_id = ? 
             UNION ALL
             SELECT 'lead', CONCAT('New lead from: ', name), created_at 
             FROM broker_property_inquiries WHERE broker_id = ?
             UNION ALL
             SELECT 'inquiry', CONCAT('Property inquiry for: ', name), created_at 
             FROM broker_property_inquiries WHERE broker_id = ? AND status = 'new'
             ORDER BY created_at DESC LIMIT 10`,
            [req.brokerId, req.brokerId, req.brokerId]
        );

        const formatted = activities.map(a => ({
            ...a,
            time: timeAgo(a.created_at),
            icon: getActivityIcon(a.type)
        }));

        res.json({ status: 1, data: formatted });
    } catch (error) {
        console.error('Recent activities error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get recent leads
router.get('/recent-leads', async (req, res) => {
    try {
        const [leads] = await db.promise().query(
            `SELECT pi.*, p.title as property_title 
             FROM broker_property_inquiries pi
             LEFT JOIN brokerproperties p ON pi.property_id = p.id
             WHERE pi.broker_id = ?
             ORDER BY pi.created_at DESC LIMIT 10`,
            [req.brokerId]
        );

        res.json({ status: 1, data: leads });
    } catch (error) {
        console.error('Recent leads error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// ==================== PROPERTY APIs ====================

// Get all brokerproperties with filters
router.get('/properties', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            property_type,
            category,
            status,
            city,
            search
        } = req.query;

        let query = 'SELECT * FROM brokerproperties WHERE broker_id = ?';
        const params = [req.brokerId];

        if (property_type) {
            query += ' AND property_type = ?';
            params.push(property_type);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (city) {
            query += ' AND city LIKE ?';
            params.push(`%${city}%`);
        }
        if (search) {
            query += ' AND (title LIKE ? OR description LIKE ? OR address LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await db.promise().query(countQuery, params);
        const total = countResult[0].total;

        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(parseInt(limit), offset);

        const [properties] = await db.promise().query(query, params);

        // Parse JSON fields
        properties.forEach(p => {
            if (p.features && typeof p.features === "string") p.features = JSON.parse(p.features);
            if (p.images && typeof p.images === "string") p.images = JSON.parse(p.images);
        });

        res.json({
            status: 1,
            data: properties,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get brokerproperties error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get brokerproperties by type (sale, rent, lease)
router.get('/properties/:type', async (req, res) => {
    try {
        const { type } = req.params;

        if (!['sale', 'rent', 'lease'].includes(type)) {
            return res.status(400).json({ status: 0, message: 'Invalid property type' });
        }

        const [properties] = await db.promise().query(
            `SELECT * FROM brokerproperties 
             WHERE broker_id = ? AND property_type = ? 
             ORDER BY created_at DESC`,
            [req.brokerId, type]
        );

        // Parse JSON fields
        properties.forEach(p => {
            if (p.features && typeof p.features === "string") p.features = JSON.parse(p.features);
            if (p.images && typeof p.images === "string") p.images = JSON.parse(p.images);
        });

        res.json({ status: 1, data: properties });
    } catch (error) {
        console.error('Get brokerproperties by type error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get property stats by type
router.get('/properties/:type/stats', async (req, res) => {
    try {
        const { type } = req.params;

        const [stats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as underProcess
             FROM brokerproperties 
             WHERE broker_id = ? AND property_type = ?`,
            [type === 'sale' ? 'sold' : type === 'rent' ? 'rented' : 'leased', req.brokerId, type]
        );

        // Add expiring soon for rent/lease
        if (type === 'rent' || type === 'lease') {
            const [expiring] = await db.promise().query(
                `SELECT COUNT(*) as expiringSoon FROM brokerproperties 
                 WHERE broker_id = ? AND property_type = ? AND status IN ('rented', 'leased')
                 AND DATE_SUB(updated_at, INTERVAL 30 DAY) <= NOW()`,
                [req.brokerId, type]
            );
            stats[0].expiringSoon = expiring[0].expiringSoon;
        }

        res.json({ status: 1, data: stats[0] });
    } catch (error) {
        console.error('Get property stats error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get single property
router.get('/properties/view/:id', async (req, res) => {
    try {

        const [property] = await db.promise().query(
            'SELECT * FROM brokerproperties WHERE id = ? AND broker_id = ?',
            [req.params.id, req.brokerId]
        );

        if (property.length === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        // Increment views
        await db.promise().query(
            'UPDATE brokerproperties SET views = views + 1 WHERE id = ?',
            [req.params.id]
        );

        const prop = property[0];
        if (prop.features && typeof prop.features === "string") prop.features = JSON.parse(prop.features);
        if (prop.images && typeof prop.images === "string") prop.images = JSON.parse(prop.images);

        res.json({ status: 1, data: prop });
    } catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Create new property
router.post('/properties', [
    body('title').notEmpty(),
    body('property_type').isIn(['sale', 'rent', 'lease']),
    body('category').isIn(['residential', 'commercial', 'land']),
    body('price').isNumeric(),
    body('address').notEmpty(),
    body('city').notEmpty(),
    body('state').notEmpty(),
    body('pincode').notEmpty(),
    body('contact_person').notEmpty(),
    body('contact_phone').notEmpty(),
    body('contact_email').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 0, errors: errors.array() });
    }

    try {
        const property = {
            broker_id: req.brokerId,
            ...req.body,
            features: req.body.features ? JSON.stringify(req.body.features) : null,
            images: req.body.images ? JSON.stringify(req.body.images) : null,
            videos: req.body.videos ? JSON.stringify(req.body.videos) : null,
            documents: req.body.documents ? JSON.stringify(req.body.documents) : null
        };

        const [result] = await db.promise().query(
            `INSERT INTO brokerproperties SET ?`,
            [property]
        );

        // Update broker stats
        await updateBrokerStats(req.brokerId);

        res.json({
            status: 1,
            message: 'Property created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Update property
router.put('/properties/:id', async (req, res) => {
    try {
        const property = { ...req.body };

        // Stringify JSON fields
        if (property.features) property.features = JSON.stringify(property.features);
        if (property.images) property.images = JSON.stringify(property.images);
        if (property.videos) property.videos = JSON.stringify(property.videos);
        if (property.documents) property.documents = JSON.stringify(property.documents);

        const [result] = await db.promise().query(
            'UPDATE brokerproperties SET ? WHERE id = ? AND broker_id = ?',
            [property, req.params.id, req.brokerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        res.json({ status: 1, message: 'Property updated successfully' });
    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Delete property
router.delete('/properties/:id', async (req, res) => {
    try {
        const [result] = await db.promise().query(
            'DELETE FROM brokerproperties WHERE id = ? AND broker_id = ?',
            [req.params.id, req.brokerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        // Update broker stats
        await updateBrokerStats(req.brokerId);

        res.json({ status: 1, message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Update property status
router.patch('/properties/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const [result] = await db.promise().query(
            'UPDATE brokerproperties SET status = ? WHERE id = ? AND broker_id = ?',
            [status, req.params.id, req.brokerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        // Update broker stats
        await updateBrokerStats(req.brokerId);

        res.json({ status: 1, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Mark property as sold/rented/leased
router.patch('/properties/:id/mark-:action', async (req, res) => {
    try {
        const { id, action } = req.params;

        let status;
        if (action === 'sold') status = 'sold';
        else if (action === 'rented') status = 'rented';
        else if (action === 'leased') status = 'leased';
        else return res.status(400).json({ status: 0, message: 'Invalid action' });

        const [result] = await db.promise().query(
            'UPDATE brokerproperties SET status = ? WHERE id = ? AND broker_id = ?',
            [status, id, req.brokerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        // Update broker stats
        await updateBrokerStats(req.brokerId);

        res.json({ status: 1, message: `Property marked as ${status}` });
    } catch (error) {
        console.error('Mark property error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get similar properties
router.get('/properties/:id/similar', async (req, res) => {
    try {
        const [property] = await db.promise().query(
            'SELECT property_type, category, city, price FROM brokerproperties WHERE id = ? AND broker_id = ?',
            [req.params.id, req.brokerId]
        );

        if (property.length === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        const p = property[0];
        const [similar] = await db.promise().query(
            `SELECT * FROM brokerproperties 
             WHERE broker_id = ? AND id != ? 
             AND property_type = ? AND category = ? 
             AND city = ? 
             AND price BETWEEN ? AND ?
             LIMIT 5`,
            [req.brokerId, req.params.id, p.property_type, p.category, p.city, p.price * 0.8, p.price * 1.2]
        );

        // Parse JSON fields
        similar.forEach(s => {
            if (s.images && typeof s.images === "string") s.images = JSON.parse(s.images);
        });

        res.json({ status: 1, data: similar });
    } catch (error) {
        console.error('Get similar brokerproperties error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get property inquiries
router.get('/properties/:id/inquiries', async (req, res) => {
    try {
        const [inquiries] = await db.promise().query(
            `SELECT * FROM broker_property_inquiries 
             WHERE property_id = ? AND broker_id = ?
             ORDER BY created_at DESC`,
            [req.params.id, req.brokerId]
        );

        res.json({ status: 1, data: inquiries });
    } catch (error) {
        console.error('Get inquiries error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// ==================== LEAD MANAGEMENT APIs ====================

// Get all leads with filters
router.get('/leads', async (req, res) => {
    try {
        const {
            status,
            property_type,
            search,
            page = 1,
            limit = 10
        } = req.query;

        let query = `
            SELECT pi.*, p.title as property_title, p.property_type 
            FROM broker_property_inquiries pi
            LEFT JOIN brokerproperties p ON pi.property_id = p.id
            WHERE pi.broker_id = ?
        `;
        const params = [req.brokerId];

        if (status) {
            query += ' AND pi.status = ?';
            params.push(status);
        }
        if (property_type) {
            query += ' AND p.property_type = ?';
            params.push(property_type);
        }
        if (search) {
            query += ' AND (pi.name LIKE ? OR pi.email LIKE ? OR pi.phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = query.replace('pi.*, p.title as property_title, p.property_type', 'COUNT(*) as total');
        const [countResult] = await db.promise().query(countQuery, params);
        const total = countResult[0].total;

        // Add pagination
        query += ' ORDER BY pi.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(parseInt(limit), offset);

        const [leads] = await db.promise().query(query, params);

        // Get latest note for each lead
        for (let lead of leads) {
            const [notes] = await db.promise().query(
                'SELECT content FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1',
                [lead.id]
            );
            lead.notes = notes;
        }

        res.json({
            status: 1,
            data: leads,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get lead stats
router.get('/leads/stats', async (req, res) => {
    try {
        const [stats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
                SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
                SUM(CASE WHEN status = 'follow-up' THEN 1 ELSE 0 END) as follow_up
             FROM broker_property_inquiries WHERE broker_id = ?`,
            [req.brokerId]
        );

        res.json({ status: 1, data: stats[0] });
    } catch (error) {
        console.error('Get lead stats error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get single lead
router.get('/leads/:id', async (req, res) => {
    try {
        const [lead] = await db.promise().query(
            `SELECT pi.*, p.title as property_title, p.property_type, p.price as property_price
             FROM broker_property_inquiries pi
             LEFT JOIN brokerproperties p ON pi.property_id = p.id
             WHERE pi.id = ? AND pi.broker_id = ?`,
            [req.params.id, req.brokerId]
        );

        if (lead.length === 0) {
            return res.status(404).json({ status: 0, message: 'Lead not found' });
        }

        res.json({ status: 1, data: lead[0] });
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Update lead status
router.patch('/leads/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const [result] = await db.promise().query(
            'UPDATE broker_property_inquiries SET status = ? WHERE id = ? AND broker_id = ?',
            [status, id, req.brokerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 0, message: 'Lead not found' });
        }

        // Add activity
        await db.promise().query(
            'INSERT INTO lead_activities (lead_id, broker_id, type, description) VALUES (?, ?, ?, ?)',
            [id, req.brokerId, 'status_change', `Status changed to ${status}`]
        );

        res.json({ status: 1, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Update lead status error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get lead notes
router.get('/leads/:id/notes', async (req, res) => {
    try {
        const [notes] = await db.promise().query(
            `SELECT ln.*, u.name as created_by 
             FROM lead_notes ln
             JOIN users u ON u.user_id = (SELECT user_id FROM brokers WHERE id = ln.broker_id)
             WHERE ln.lead_id = ?
             ORDER BY ln.created_at DESC`,
            [req.params.id]
        );

        res.json({ status: 1, data: notes });
    } catch (error) {
        console.error('Get lead notes error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Add lead note
router.post('/leads/:id/notes', [
    body('note').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 0, errors: errors.array() });
    }

    try {
        const { note } = req.body;
        const { id } = req.params;

        const [result] = await db.promise().query(
            'INSERT INTO lead_notes (lead_id, broker_id, content) VALUES (?, ?, ?)',
            [id, req.brokerId, note]
        );

        // Add activity
        await db.promise().query(
            'INSERT INTO lead_activities (lead_id, broker_id, type, description) VALUES (?, ?, ?, ?)',
            [id, req.brokerId, 'note', 'Note added']
        );

        res.json({ status: 1, message: 'Note added successfully', data: { id: result.insertId } });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Get lead activities
router.get('/leads/:id/activities', async (req, res) => {
    try {
        const [activities] = await db.promise().query(
            `SELECT la.*, u.name as performed_by 
             FROM lead_activities la
             JOIN users u ON u.user_id = (SELECT user_id FROM brokers WHERE id = la.broker_id)
             WHERE la.lead_id = ?
             ORDER BY la.created_at DESC`,
            [req.params.id]
        );

        res.json({ status: 1, data: activities });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Schedule follow-up
router.post('/leads/:id/follow-up', [
    body('follow_up_date').notEmpty().isISO8601()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 0, errors: errors.array() });
    }

    try {
        const { follow_up_date } = req.body;
        const { id } = req.params;

        const [result] = await db.promise().query(
            'UPDATE broker_property_inquiries SET follow_up_date = ? WHERE id = ? AND broker_id = ?',
            [follow_up_date, id, req.brokerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 0, message: 'Lead not found' });
        }

        // Add activity
        await db.promise().query(
            'INSERT INTO lead_activities (lead_id, broker_id, type, description) VALUES (?, ?, ?, ?)',
            [id, req.brokerId, 'follow_up', `Follow-up scheduled for ${new Date(follow_up_date).toLocaleString()}`]
        );

        res.json({ status: 1, message: 'Follow-up scheduled successfully' });
    } catch (error) {
        console.error('Schedule follow-up error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// Convert lead to client
router.post('/leads/:id/convert', async (req, res) => {
    try {
        const { id } = req.params;

       

        try {
            // Update lead status
            await db.promise().query(
                'UPDATE broker_property_inquiries SET status = ? WHERE id = ? AND broker_id = ?',
                ['converted', id, req.brokerId]
            );

            // Get lead details
            const [lead] = await db.promise().query(
                'SELECT * FROM broker_property_inquiries WHERE id = ?',
                [id]
            );

            // Add to clients table (if you have one)
            // await db.promise().query(
            //     'INSERT INTO clients (name, email, phone, lead_id, broker_id) VALUES (?, ?, ?, ?, ?)',
            //     [lead[0].name, lead[0].email, lead[0].phone, id, req.brokerId]
            // );

            // Add activity
            await db.promise().query(
                'INSERT INTO lead_activities (lead_id, broker_id, type, description) VALUES (?, ?, ?, ?)',
                [id, req.brokerId, 'status_change', 'Lead converted to client']
            );

            res.json({ status: 1, message: 'Lead converted to client successfully' });
        } catch (error) {
            throw error;
        } finally {
        }
    } catch (error) {
        console.error('Convert lead error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// ==================== PUBLIC INQUIRY API (No auth required) ====================

// Submit property inquiry (public)
router.post('/public/inquiry', [
    body('property_id').notEmpty(),
    body('name').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('message').optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 0, errors: errors.array() });
    }

    try {
        // Get property broker
        const [property] = await db.promise().query(
            'SELECT broker_id FROM brokerproperties WHERE id = ?',
            [req.body.property_id]
        );

        if (property.length === 0) {
            return res.status(404).json({ status: 0, message: 'Property not found' });
        }

        const inquiry = {
            property_id: req.body.property_id,
            broker_id: property[0].broker_id,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            message: req.body.message,
            status: 'new'
        };

        const [result] = await db.promise().query(
            'INSERT INTO broker_property_inquiries SET ?',
            [inquiry]
        );

        // Increment property inquiries count
        await db.promise().query(
            'UPDATE brokerproperties SET inquiries = inquiries + 1 WHERE id = ?',
            [req.body.property_id]
        );

        // Update broker stats
        await updateBrokerStats(property[0].broker_id);

        // Send email notification (implement your email service)
        // await sendInquiryEmail(inquiry);

        res.json({
            status: 1,
            message: 'Inquiry submitted successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Public inquiry error:', error);
        res.status(500).json({ status: 0, message: 'Server error' });
    }
});

// ==================== HELPER FUNCTIONS ====================

// Update broker statistics
async function updateBrokerStats(brokerId) {
    try {
        const [stats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total_properties,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_listings,
                SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_properties,
                SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) as rented_properties,
                SUM(CASE WHEN status = 'leased' THEN 1 ELSE 0 END) as leased_properties
             FROM brokerproperties WHERE broker_id = ?`,
            [brokerId]
        );

        const [leadStats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total_leads,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_leads
             FROM broker_property_inquiries WHERE broker_id = ?`,
            [brokerId]
        );

        await db.promise().query(
            `INSERT INTO broker_stats 
             (broker_id, total_properties, active_listings, sold_properties, rented_properties, leased_properties, total_leads, converted_leads)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_properties = VALUES(total_properties),
             active_listings = VALUES(active_listings),
             sold_properties = VALUES(sold_properties),
             rented_properties = VALUES(rented_properties),
             leased_properties = VALUES(leased_properties),
             total_leads = VALUES(total_leads),
             converted_leads = VALUES(converted_leads)`,
            [
                brokerId,
                stats[0].total_properties || 0,
                stats[0].active_listings || 0,
                stats[0].sold_properties || 0,
                stats[0].rented_properties || 0,
                stats[0].leased_properties || 0,
                leadStats[0].total_leads || 0,
                leadStats[0].converted_leads || 0
            ]
        );
    } catch (error) {
        console.error('Update broker stats error:', error);
    }
}

// Time ago formatter
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';

    return 'just now';
}

// Activity icon getter
function getActivityIcon(type) {
    const icons = {
        'property': '🏠',
        'lead': '👤',
        'inquiry': '📞',
        'call': '📞',
        'email': '📧',
        'meeting': '🤝',
        'note': '📝',
        'status_change': '🔄',
        'follow_up': '⏰'
    };
    return icons[type] || '📌';
}

module.exports = router;