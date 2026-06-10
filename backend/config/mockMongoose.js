const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

// Ensure database file exists
function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], tasks: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    return { users: [], tasks: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

class Schema {
  constructor(definition, options) {
    this.definition = definition;
    this.options = options;
    this.hooks = { pre: {} };
    this.methods = {};
  }

  pre(hookName, fn) {
    if (!this.hooks.pre[hookName]) {
      this.hooks.pre[hookName] = [];
    }
    this.hooks.pre[hookName].push(fn);
  }
}

// Stub for Schema types
Schema.Types = {
  ObjectId: 'ObjectId'
};

const models = {};

function createModelClass(modelName, schema) {
  const collectionName = modelName.toLowerCase() + 's'; // 'users' or 'tasks'

  class Document {
    constructor(properties) {
      Object.assign(this, properties);
      // Bind methods
      for (const methodName in schema.methods) {
        this[methodName] = schema.methods[methodName].bind(this);
      }
    }

    isModified(field) {
      // For password hashing, return true on create since password is being set
      return true;
    }

    toObject() {
      const obj = { ...this };
      for (const methodName in schema.methods) {
        delete obj[methodName];
      }
      return obj;
    }
  }

  class Model {
    constructor(properties) {
      return new Document(properties);
    }

    static async findOne(query) {
      const db = readDb();
      const items = db[collectionName] || [];
      const found = items.find(item => {
        for (const key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      });
      return found ? new Document(found) : null;
    }

    static async findById(id) {
      if (!id) return null;
      const db = readDb();
      const items = db[collectionName] || [];
      const found = items.find(item => item._id === id.toString());
      return found ? new Document(found) : null;
    }

    static async create(properties) {
      const db = readDb();
      if (!db[collectionName]) db[collectionName] = [];

      const doc = new Document({
        _id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...properties
      });

      // Run pre-save hooks
      if (schema.hooks.pre['save']) {
        for (const hookFn of schema.hooks.pre['save']) {
          await new Promise((resolve, reject) => {
            hookFn.call(doc, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      db[collectionName].push(JSON.parse(JSON.stringify(doc.toObject ? doc.toObject() : doc)));
      writeDb(db);
      return doc;
    }

    static async countDocuments(query) {
      const db = readDb();
      const items = db[collectionName] || [];
      const filtered = items.filter(item => {
        for (const key in query) {
          if (key === 'userId') {
            if (item.userId !== query.userId.toString()) return false;
          } else if (key === 'status') {
            if (item.status !== query.status) return false;
          } else if (key === 'title' && query.title && query.title.$regex) {
            const regex = new RegExp(query.title.$regex, query.title.$options || 'i');
            if (!regex.test(item.title)) return false;
          } else if (item[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
      return filtered.length;
    }

    static find(query) {
      const db = readDb();
      const items = db[collectionName] || [];
      let filtered = items.filter(item => {
        for (const key in query) {
          if (key === 'userId') {
            if (item.userId !== query.userId.toString()) return false;
          } else if (key === 'status') {
            if (item.status !== query.status) return false;
          } else if (key === 'title' && query.title && query.title.$regex) {
            const regex = new RegExp(query.title.$regex, query.title.$options || 'i');
            if (!regex.test(item.title)) return false;
          } else if (item[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });

      const queryChain = {
        sort(sortObj) {
          if (sortObj) {
            const field = Object.keys(sortObj)[0];
            const direction = sortObj[field];
            filtered.sort((a, b) => {
              if (a[field] < b[field]) return direction === -1 ? 1 : -1;
              if (a[field] > b[field]) return direction === -1 ? -1 : 1;
              return 0;
            });
          }
          return this;
        },
        skip(n) {
          filtered = filtered.slice(n);
          return this;
        },
        limit(n) {
          filtered = filtered.slice(0, n);
          return this;
        },
        select(fieldsStr) {
          return this;
        },
        then(resolve, reject) {
          resolve(filtered.map(item => new Document(item)));
        }
      };

      return queryChain;
    }

    static async findByIdAndUpdate(id, updatedData, options) {
      const db = readDb();
      const items = db[collectionName] || [];
      const index = items.findIndex(item => item._id === id.toString());
      if (index === -1) return null;

      const updatedItem = {
        ...items[index],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      items[index] = updatedItem;
      writeDb(db);
      return new Document(updatedItem);
    }

    static async findByIdAndDelete(id) {
      const db = readDb();
      const items = db[collectionName] || [];
      const index = items.findIndex(item => item._id === id.toString());
      if (index === -1) return null;

      const deleted = items.splice(index, 1)[0];
      writeDb(db);
      return new Document(deleted);
    }
  }

  return Model;
}

const mockMongoose = {
  Schema,
  connect: async (uri) => {
    return {
      connection: {
        host: 'mock-memory-db'
      }
    };
  },
  model: (name, schema) => {
    if (!models[name]) {
      models[name] = createModelClass(name, schema);
    }
    return models[name];
  }
};

module.exports = mockMongoose;
