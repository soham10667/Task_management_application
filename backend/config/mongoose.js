const dotenv = require('dotenv');
dotenv.config();

const useRealMongo = !!(process.env.MONGODB_URI || process.env.MONGO_URI);

const mongoose = useRealMongo ? require('mongoose') : require('./mockMongoose');

console.log(
  useRealMongo
    ? 'Database Config: Using real MongoDB database instance.'
    : 'Database Config: Using local mock JSON file database instance (zero-setup).'
);

module.exports = mongoose;
