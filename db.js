const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "ftest",
    password: "zipzipL_neden1",
    port: 5432
});

module.exports = pool;