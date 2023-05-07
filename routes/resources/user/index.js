const express = require('express');
const router = express.Router();
const getUserFromToken = require('../../../components/getUserFromJwt');
const pool = require('../../../index').pool;

router.use(async (req, res, next) => {
    const user = await getUserFromToken(req);
    if (!user)
        return res.status(403).send({ message: "Provided JWT token is not properly" });
    if (user?.roles.find(role => role === "USER")) {
        req.headers['user'] = user;
        next();
    }
    else
        return res.status(403).send({ message: "User doesn't have user role" });
})

router.post('/info', async (req, res) => {
    let user;
    const client = await pool.connect();
    console.log(req.headers)
    try {
        user = await client.query(`SELECT  u.id, username,  email, r.name as role
        FROM public.users as u inner join public.user_roles as ur on u.id = ur.user_id join roles as r on ur.role_id = r.id where u.email = $1;`, [req.headers.user.email]);
    } catch (err) {
        return res.status(500).send(err.message);
    }
    finally {
        client.release();
    }
    if (user.rows.length < 1)
        return res.status(404).send({ message: "User not found" });

    const roles = [];
    console.log(user.rows)
    user.rows.forEach(element => {
        roles.push(element.role)
    });
    user = user.rows[0];
    user.roles = roles;

    return res.send({
        user
    });
})

router.get('/general-info/list', async (req, res) => {
    let users;
    const client = await pool.connect();
    try {
        users = await client.query(`SELECT id, name, joined, lastvisit, counter FROM public.users_info;`);
        console.log(users.rows)
    } catch (err) {
        return res.status(500).send(err.message);
    }finally{
        client.release()
    }
    return res.send({
        usersGeneralInfo: users.rows
    });
})


router.get('/', async (req, res) => {

    return res.send({
        message: "User panel"
    });
})

module.exports = router;