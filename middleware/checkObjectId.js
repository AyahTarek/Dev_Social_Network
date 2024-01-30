const mongoose = require('mongoose');

// Middleware to check for a valid DB objectID

const checkObjectId = (idToCheck) => (req, res, next) => {
  if(!mongoose.Types.ObjectId.isValid(req.params[idToCheck]))
    return res.status(400).json({msg: 'Invalid ID'});
  next();
};

module.exports = checkObjectId;