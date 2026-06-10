const dotenv = require('dotenv');
dotenv.config();

const realMongoose = require('mongoose');
const mockMongoose = require('./mockMongoose');

let useRealMongo = !!(process.env.MONGODB_URI || process.env.MONGO_URI);
let activeMongoose = useRealMongo ? realMongoose : mockMongoose;

console.log(
  useRealMongo
    ? 'Database Config: Using real MongoDB database instance.'
    : 'Database Config: Using local mock JSON file database instance (zero-setup).'
);

const handler = {
  get(target, prop, receiver) {
    const value = Reflect.get(activeMongoose, prop);
    if (typeof value === 'function') {
      const firstChar = prop.charAt(0);
      if (firstChar >= 'A' && firstChar <= 'Z') {
        return value;
      }
      return value.bind(activeMongoose);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    return Reflect.set(activeMongoose, prop, value);
  }
};

const mongooseProxy = new Proxy({}, handler);

function switchToMock() {
  activeMongoose = mockMongoose;
  useRealMongo = false;
  console.log('Database Config: Switched to local mock JSON file database instance.');
}

module.exports = mongooseProxy;
module.exports.switchToMock = switchToMock;
module.exports.getUseRealMongo = () => useRealMongo;

