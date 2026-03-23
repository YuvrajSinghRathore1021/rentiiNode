// const mysql = require('mysql2');
// const db = mysql.createConnection({
// host: '72.60.219.1',
// user: 'myuser',
// password: 'StrongPass@#123',
// database: 'mydb'
// });

// // const db = mysql.createConnection({
// //     host: '103.175.163.186',
// //     user: 'rentiinew',
// //     password: 'rentii@id@123',
// //     database: 'rentiiNew'
// // });

// // const db = mysql.createConnection({
// //     host: 'localhost',
// //     user: 'root',
// //     password: '',
// //     database: 'rentalnew'
// // });

// db.connect(err => {
//     if (err) {
//         console.error('Database connection failed:', err);
//         return;
//     }
//     console.log('Connected to the MySQL database.');
// });

// // Export the connection
// module.exports = db;


// new 
const mysql = require('mysql2');
require('dotenv').config();
// ✅ Create a MySQL connection pool
const pool = mysql.createPool({
    host: '72.60.219.1',
    user: 'myuser',
    password: 'StrongPass@#123',
    database: 'mydb',

    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0


    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'hrms',
    // port: 3306,
    // waitForConnections: true,
    // connectionLimit: 10,
    // queueLimit: 0

});

// ✅ Test initial connection and handle errors
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL database.');
        connection.release(); // release back to pool
    }
});

// ✅ Handle unexpected MySQL disconnections gracefully
pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconnecting MySQL pool...');
    } else {
        throw err;
    }
});

// ✅ Export promise-based pool for async/await usage
module.exports = pool;


