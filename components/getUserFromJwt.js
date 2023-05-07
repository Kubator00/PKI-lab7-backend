const jwt = require('jsonwebtoken');


module.exports = async (req) => {
    let user;
    jwt.verify(req.headers?.['x-user-token'], process.env.PRIVATE_KEY, (err, res) => {
        if (err) {
            console.log(err);
            return;
        }
        user = res.user;
    });
    return user;
}