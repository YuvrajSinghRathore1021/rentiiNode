// db.js
const mysql = require('mysql2/promise');

const dbn = mysql.createPool({
    
   host: '72.60.219.1',
    user: 'myuser',
    password: 'StrongPass@#123',
    database: 'mydb'

    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'rentalnew'

});


module.exports = dbn;
