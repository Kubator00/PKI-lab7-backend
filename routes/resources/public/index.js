const express = require('express');
const router = express.Router();
const getUserFromToken = require('../../../components/getUserFromJwt');

router.get('/', async (req, res) => {
    return res.send({
        message: "Public resources"
    });
})



module.exports = router;