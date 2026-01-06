// db.js
const mysql = require('mysql2/promise');

const dbn = mysql.createPool({
    // host: '103.175.163.186',
    // user: 'rentiinew',
    // password: 'rentii@id@123',
    // database: 'rentiiNew'

    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentalnew'
});


module.exports = dbn;
