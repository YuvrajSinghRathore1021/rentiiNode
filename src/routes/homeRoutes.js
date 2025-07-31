const express = require('express');
const router = express.Router();
const db = require('../../db/ConnectionSql');

router.post('/view', async (req, res) => {
    return res.status(200).json({
        status: true,
        message: 'this is a test response',
    })
});
router.get('/viewGet', async (req, res) => {
    return res.status(200).json({
        status: true,
        message: 'this is a test response',
    })
});

// Export the router
module.exports = router;