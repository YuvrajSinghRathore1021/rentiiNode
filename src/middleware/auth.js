const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: false, message: 'Token not found.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ status: false, message: '`Invalid` token.' });
        }
        req.user = user;
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        req.user = {
            "user_id": 0,
            "host_id": 0
        };
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = {
                "user_id": 0,
                "host_id": 0
            };
        } else {
            req.user = user;
        }
    });
    next();
};

module.exports = {
    authenticateToken, optionalAuth
};