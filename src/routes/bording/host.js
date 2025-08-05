const express = require('express');
const router = express.Router();
const db = require('../../../db/ConnectionSql');

router.post('/test', (req, res) => {
    res.status(200).json({ status: true, data: '', message: 'service is running' });

});





// Export the router
module.exports = router;    