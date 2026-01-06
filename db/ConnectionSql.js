const mysql = require('mysql2');

// const db = mysql.createConnection({
//     host: '103.175.163.186',
//     user: 'rentiinew',
//     password: 'rentii@id@123',
//     database: 'rentiiNew'
// });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentalnew'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});
// Export the connection
module.exports = db;



