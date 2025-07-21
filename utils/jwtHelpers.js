const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'default_jwt_secret';
const expiresIn = process.env.JWT_TOKEN_EXPIRES_IN || '1d';

// دالة لإنشاء التوكن
// تستقبل حمولة payload كاملة، مثل { sub: userId, roles: [...] }
exports.sign = (payload) => {
  return jwt.sign(payload, secret, { expiresIn });
};

// دالة للتحقق من صحة التوكن
exports.verify = (token) => {
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
};
