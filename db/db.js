// db.js
const mysql = require('mysql2/promise');

const dbn = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentalnew'
});

module.exports = dbn;
