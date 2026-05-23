const User = require('../models/User');
const AppError = require('../utils/AppError');

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';

    if (query.length > 100) {
      throw new AppError('Search query cannot exceed 100 characters', 400);
    }

    const filter = {
      _id: { $ne: req.user._id }
    };

    if (query) {
      const regex = new RegExp(escapeRegex(query), 'i');
      filter.$or = [
        { name: regex },
        { email: regex }
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('name email isOnline lastSeen')
        .sort({ isOnline: -1, name: 1, email: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: {
        users,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers
};
