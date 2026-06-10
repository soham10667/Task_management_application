const mongoose = require('./mongoose');
const dns = require('dns');

const checkHostReachable = (uri) => {
  return new Promise((resolve) => {
    try {
      const cleanedUri = uri.replace(/^mongodb\+srv:\/\//, 'http://').replace(/^mongodb:\/\//, 'http://');
      const parsed = new URL(cleanedUri);
      const host = parsed.hostname;

      if (!host || host === '127.0.0.1' || host === 'localhost') {
        return resolve(true);
      }

      const timer = setTimeout(() => {
        resolve(false);
      }, 500); // 500ms threshold for fast fallback

      dns.lookup(host, (err) => {
        clearTimeout(timer);
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      resolve(false);
    }
  });
};

const connectDB = async () => {
  try {
    let useRealMongo = mongoose.getUseRealMongo ? mongoose.getUseRealMongo() : true;
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskmanager';

    if (useRealMongo) {
      console.log('Checking database host reachability...');
      const isReachable = await checkHostReachable(uri);
      if (!isReachable) {
        console.warn('Database host is unreachable or offline.');
        if (mongoose.switchToMock) {
          mongoose.switchToMock();
          useRealMongo = false;
        }
      }
    }

    if (useRealMongo) {
      console.log('Attempting to connect to MongoDB Atlas...');
      // Set serverSelectionTimeoutMS to 3 seconds to avoid waiting forever
      const conn = await mongoose.connect(
        uri,
        { serverSelectionTimeoutMS: 3000 }
      );
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } else {
      const conn = await mongoose.connect();
      console.log(`MongoDB Connected (Mock): ${conn.connection.host}`);
    }
  } catch (error) {
    console.warn(`Database Connection Error: ${error.message}`);
    console.warn('Real database connection failed. Falling back to local mock JSON database instance (zero-setup)...');
    
    if (mongoose.switchToMock) {
      mongoose.switchToMock();
      try {
        const conn = await mongoose.connect();
        console.log(`MongoDB Connected (Mock Fallback): ${conn.connection.host}`);
      } catch (mockError) {
        console.error(`Mock Database Init Error: ${mockError.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;


