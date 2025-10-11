const asyncHandler = require('express-async-handler');

const checkRole = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Not authorized for this role');
    }

    next();
  });
};

module.exports = { checkRole };