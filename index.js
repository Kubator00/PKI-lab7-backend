const express = require('express')
const app = express()
const PORT = 8080
const cors = require('cors')
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const corsOptions = {
    exposedHeaders: 'Authorization',
};

app.use(cors(corsOptions));
app.use(express.json())


app.get('/', (req, res) => {
    res.send('Server')
})


app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
})



const Pool = require('pg').Pool
const pool = new Pool({
    host: process.env.NEON_HOST,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    port: 5432,
    ssl: {
        require: true
    }
})
module.exports.pool = pool;


(async function () {
    const client = await pool.connect()
    await client.query(`
    
        CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        username VARCHAR (50) UNIQUE NOT NULL,
        password VARCHAR (256) NOT NULL,
        email VARCHAR (255) UNIQUE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS roles(
        id SERIAL PRIMARY KEY,
        name VARCHAR (50) UNIQUE NOT NULL);

        CREATE TABLE IF NOT EXISTS user_roles(
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        role_id INTEGER);

        INSERT INTO roles (name)
        SELECT 'USER' UNION ALL
        SELECT 'ADMIN'
        WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE name IN ('USER', 'ADMIN')
        ) 
        ON CONFLICT (name) DO NOTHING
        RETURNING *;
                
        CREATE TABLE IF NOT EXISTS users_info (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            joined TIMESTAMP NOT NULL DEFAULT NOW(),
            lastvisit TIMESTAMP NOT NULL DEFAULT NOW(),
            counter INTEGER NOT NULL DEFAULT 0
          );
          
        `)
    client.release()
})();

const routesPath = path.join(__dirname, 'routes');
function loadRoutes(directory) {
    fs.readdirSync(directory).forEach(file => {
        const routePath = path.join(directory, file);
        const stats = fs.statSync(routePath);
        if (stats.isDirectory()) {
            loadRoutes(routePath);
        } else if (stats.isFile()) {
            const route = require(routePath);
            const parsedPath = path.parse(routePath);
            let relativePath = parsedPath.dir.replace(__dirname + '\\routes', '') + '\\' + parsedPath.base;
            relativePath = relativePath.replace('.js', '');
            relativePath = relativePath.replace(/\\/g, '/');
            app.use(relativePath, route);
        }
    });
}

loadRoutes(routesPath);
