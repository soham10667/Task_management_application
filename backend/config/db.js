const mongoose = require('./mongoose');

const connectDB = async () => {
  try {
    const useRealMongo = mongoose.getUseRealMongo ? mongoose.getUseRealMongo() : true;
    
    if (useRealMongo) {
      console.log('Attempting to connect to MongoDB Atlas...');
      // Set serverSelectionTimeoutMS to 3 seconds to avoid waiting forever
      const conn = await mongoose.connect(
        process.env.MONGODB_URI || 
        process.env.MONGO_URI || 
        'mongodb://127.0.0.1:27017/taskmanager',
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

