const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../index').pool;
const jwt = require('jsonwebtoken');



router.post('/signup', async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    let newAccount, newAccountId, newAccountRole;
    let client = await pool.connect();
    try {
        newAccount = await client.query(`INSERT INTO users(username ,email, password)  VALUES ($1, $2, $3) RETURNING *;`, [req.body.username, req.body.email, hashedPassword]);
        newAccountId = newAccount.rows[0].id;
        newAccountRole = await client.query(`INSERT INTO user_roles(user_id, role_id)  VALUES ($1, $2) RETURNING *;`, [newAccountId, 1]);
    } catch (err) {
        return res.status(500).send(err.message);
    }
    finally {
        client.release();
    }

    res.send({ message: "Registration completed successfully" });

    setTimeout(async () => {
        client = await pool.connect();
        try {
            const account = (await client.query(`SELECT  id, is_active as active from users where id = $1`, [newAccountId])).rows;
            if (account.length < 1 || account[0].active)
                return;
            const deleteAccount = (await client.query(`DELETE FROM users WHERE id = $1`, [newAccountId]));
            console.log(`Account deleted ${newAccountId}`)
        }
        catch (err) {
            console.error(err.message)
        }
        finally {
            client.release();
        }
    }, 60 * 1000);

});

router.post('/signin', async (req, res) => {
    console.log(req.body)
    const client = await pool.connect();
    let user, userInfo;
    try {
        user = await client.query(`SELECT  u.id, username, password, email, is_active as active, r.name as role
        FROM public.users as u inner join public.user_roles as ur on u.id = ur.user_id join roles as r on ur.role_id = r.id where u.email = $1;`, [req.body.email]);

        if (user.rows.length < 1 || !await bcrypt.compare(req.body.password, user.rows[0].password))
            return res.status(401).send({ message: "Incorrenct email or password" });

        if (!user.rows[0].active)
            return res.status(401).send({ message: "User is not actived" });

        const userDefault = user.rows[0];
        const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION add_user(p_name VARCHAR(255))
        RETURNS VOID AS $$
        DECLARE
          v_id INTEGER;
          v_counter INTEGER;
        BEGIN
          SELECT id, counter INTO v_id, v_counter FROM users_info WHERE name = p_name;
          IF v_id IS NULL THEN
            INSERT INTO users_info(name, joined, lastvisit, counter)
            VALUES (p_name, NOW(), NOW(), 1);
          ELSE
            UPDATE users_info SET lastvisit = NOW(), counter = v_counter + 1 WHERE id = v_id;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `;
        await client.query(createFunctionQuery);

        const callFunctionQuery = 'SELECT add_user($1);';
        await client.query(callFunctionQuery, [userDefault.username]);


    } catch (err) {
        console.error(err)
        return res.status(500).send(err.message);
    }
    finally {
        client.release();
    }



    const roles = [];
    user.rows.forEach(element => {
        roles.push(element.role)
    });
    user = user.rows[0];
    delete user.password;
    delete user.role;
    user.roles = roles;

    const token = jwt.sign({ user: { email: user.email, roles: roles } }, process.env.PRIVATE_KEY, { expiresIn: 20000 });


    res.header({ Authorization: token }).send({ message: "Sigin completed successfully", user: { ...user, token: token } });
});

router.get('/', (req, res) => {
    res.send('auth get');
})

router.post('/', (req, res) => {
    res.send('auth post');
})
module.exports = router;