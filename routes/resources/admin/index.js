const express = require('express');
const router = express.Router();
const getUserFromToken = require('../../../components/getUserFromJwt');
const pool = require('../../../index').pool;

router.use(async (req, res, next) => {
    const user = await getUserFromToken(req);
    if (!user)
        return res.status(403).send({ message: "Provided JWT token is not properly" });
    if (user?.roles.find(role => role === "ADMIN"))
        next();
    else
        return res.status(403).send({ message: "User doesn't have admin role" });
})

router.get('/users/list', async (req, res) => {
    const client = await pool.connect();
    let users, userRoles;
    try {
        users = (await client.query(`SELECT id, username,  email, is_active as active FROM public.users`)).rows;
        userRoles = (await client.query(`SELECT ur.user_id as userid, r.name from user_roles as ur join roles as r on ur.role_id = r.id`)).rows;
    } catch (err) {
        return res.status(500).send(err.message);
    }
    finally {
        client.release();
    }
    users.forEach(user => user.roles = userRoles.filter(role => role.userid === user.id).map(role => role.name));
    res.send({ users: users })
})

router.post('/users/modify', async (req, res) => {
    const client = await pool.connect();
    let users;
    try {
        users = await client.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [req.body.active, req.body.userId]);
    } catch (err) {
        console.log(err)
        return res.status(500).send(err.message);
    }
    finally {
        client.release();
    }
    res.send({ message: "User sucesfully updated" });
})




router.get('/', async (req, res) => {

    return res.send({
        message: "Admin panel"
    });
})

module.exports = router;