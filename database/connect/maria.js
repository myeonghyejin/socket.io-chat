const maria = require('mysql');

const connection = maria.createConnection({
    host: '210.114.1.131',
    port: 3306,
    user: 'root',
    password: 'wemaginesoft0401',
    database: 'chat'
});

module.exports = connection;