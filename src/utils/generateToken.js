const jwt = require('jsonwebtoken');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'siteledger_jwt_secret', {
    expiresIn: '30d',
  });

module.exports = generateToken;
