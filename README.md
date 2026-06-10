# 🚀 TaskFlow — Premium Task Management System

TaskFlow is a premium, modern, glassmorphism-themed task management application. It features a responsive React 19 / Vite 8 frontend and a Node.js/Express backend running a zero-setup local JSON database database wrapper alongside support for real MongoDB instances.

---

## ✨ Key Features

*   🛠️ **Smooth CRUD Operations**: Create, read, update, and delete tasks instantly with real-time stats updates.
*   📅 **Date & Time Tracking**: Set precise due dates and times utilizing customized side-by-side selectors. Due dates are elegantly formatted showing the weekday, calendar date, and localized time.
*   🔐 **Secure User Authentication**: Complete Register and Sign In pages featuring Confirm Password validation, interactive show/hide password toggles, and token-based persistent logins.
*   📊 **Live Statistics Dashboard**: Real-time progress trackers that compute Total Tasks, Completed Tasks, Pending Tasks, and Completion Rate.
*   🔍 **Debounced Search & Filtering**: Fast status filtering (All, Pending, Completed, On Hold) combined with debounced keyword searching.
*   📑 **Persistent Pagination**: Pagination control at the bottom of the dashboard that maintains layout consistency.
*   📎 **Base64 File Attachments**: Supports uploading files under 5MB, encoding them directly to base64 JSON objects, and saving them to the database.

---

## 🛠️ Technology Stack

### Frontend
*   **React 19** & **Vite 8**
*   **Vanilla CSS** featuring a dark glassmorphism design system, smooth hover translations, and micro-animations.

### Backend
*   **Node.js** & **Express**
*   **JSON Local Storage Database** utilizing a custom `mockMongoose` database wrapper inside `backend/config/mockMongoose.js` to support local file persistence out-of-the-box (no database setup required for local testing).
*   **MongoDB & Mongoose** support when a `MONGODB_URI` environment variable is defined.
*   **JWT (JSON Web Token)** for secure endpoint protection and user authorization.
*   **bcryptjs** for hashing passwords.

---

## 📂 Project Structure

```
├── backend/                  # Node.js/Express backend
│   ├── config/               # Database config & mockMongoose wrapper
│   │   ├── db.js             # Database entrypoint
│   │   ├── mongoose.js       # Dynamic database resolver (mock vs. real)
│   │   └── mockMongoose.js   # Custom JSON local storage DB wrapper
│   ├── controllers/          # API controllers (auth/tasks logic)
│   ├── data/                 # Data directory
│   │   └── db.json           # Local JSON mock database store
│   ├── middleware/           # Token validation middleware
│   ├── models/               # User and Task schemas
│   ├── routes/               # API router mapping
│   ├── .env.example          # Environment template
│   └── server.js             # Express application entrypoint
│
├── frontend/                 # React/Vite frontend
│   ├── src/
│   │   ├── context/          # Auth context and API utilities
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx           # Main application dashboard shell
│   │   ├── App.css           # Additional layout styles
│   │   └── index.css         # Dark glassmorphic design system
│   └── index.html            # Application viewport entrypoint
│
├── package.json              # Workspace orchestration configurations
└── playground-1.mongodb.js   # Database query sandbox
```

---

## 🚀 Installation & Setup Processes

### Step 1: Install Workspace Orchestrator
From the root directory of the project, run the installation command. This installs the dev tool `concurrently` which allows you to run both frontend and backend concurrently in a single terminal.

```bash
npm install
```

### Step 2: Install Backend Dependencies
Navigate to the `backend` folder and run `npm install`:

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
Navigate to the `frontend` folder and run `npm install`:

```bash
cd ../frontend
npm install
```

### Step 4: Configure Environment Variables
Inside the `backend` directory, create a `.env` file based on `.env.example`.

```bash
cd ../backend
cp .env.example .env
```

Set the variables inside `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/taskmanager  # (Optional: Local URI)
# OR use MONGO_URI (both MONGODB_URI and MONGO_URI are supported)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

---

## 💻 Running the Project

### Option A: Running Concurrently (Recommended)
You can launch both the frontend and backend servers together with a single command from the root workspace directory:

```bash
# In the root workspace folder:
npm run dev
```
*   **Frontend Client**: Accessible at `http://localhost:5173`
*   **Backend API**: Accessible at `http://localhost:5000`

### Option B: Running Separately
If you want to view logs separately, open two terminal windows:

*   **Terminal 1 (Backend)**:
    ```bash
    cd backend
    npm run dev
    ```
*   **Terminal 2 (Frontend)**:
    ```bash
    cd frontend
    npm run dev
    ```

---

## 🔑 Crucial Code Architectures

### 1. Root Workspace Orchestrator (`package.json`)
The root `package.json` coordinates running both projects simultaneously using `concurrently`:
```json
{
  "name": "task-management-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:frontend": "npm run dev --prefix frontend",
    "dev:backend": "npm run dev --prefix backend",
    "dev": "concurrently \"npm run dev --prefix frontend\" \"npm run dev --prefix backend\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "dependencies": {
    "mongodb": "^7.3.0"
  }
}
```

### 2. Zero-Setup Local Database Resolver (`backend/config/mongoose.js`)
This code dynamically checks if `MONGODB_URI` or `MONGO_URI` exists in `.env`. If either does, the backend connects to the real MongoDB instance. Otherwise, it falls back seamlessly to the local JSON file database wrapper (`mockMongoose.js`):
```javascript
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
```

### 3. JWT Route Protection Middleware (`backend/middleware/auth.js`)
Express middleware that extracts user authorization tokens, decodes the user payload, and injects user context into request routes:
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret');

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      req.user = user;
      if (req.user.password) {
        delete req.user.password;
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
```

### 4. Client-Side Attachment Encoding (`frontend/src/App.jsx`)
Converts uploaded attachments into base64 strings so they can be saved directly inside JSON database payloads:
```javascript
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('File size must be under 5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    const fileObj = {
      name: file.name,
      type: file.type,
      data: reader.result
    };
    setTaskAttachment(JSON.stringify(fileObj));
  };
  reader.readAsDataURL(file);
};
```

---

## 📡 API Reference & Endpoints

All endpoints are prefixed with `/api`.

### Authentication Endpoints
| HTTP Method | Route | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Authenticate user & get token | Public |
| `GET` | `/api/auth/profile` | Get current user's profile | Bearer Token |

#### Register / Login Payload Structure
```json
{
  "name": "John Doe",       // (Register only)
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Task Endpoints
All task endpoints require a valid JWT bearer token.

| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks?page=1&limit=6&status=all&search=key` | Get paginated, filtered user tasks |
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/:id` | Update an existing task details / status |
| `DELETE` | `/api/tasks/:id` | Delete a task |

#### Task Schema / Create Payload Structure
```json
{
  "title": "Build UI Mockup",
  "description": "Design glassmorphism layouts",
  "status": "In Progress",     // Options: 'Not Started', 'In Progress', 'Completed', 'On Hold'
  "priority": "High",          // Options: 'Low', 'Medium', 'High'
  "assignedTo": "Alice Smith", 
  "dueDate": "2026-06-25T16:30:00.000Z", // Combined ISO date-time representation
  "attachment": "",            // Base64 encoded stringified file object
  "comments": "Need client feedback on spacing"
}
```

---

## 🧪 Manual Verification & Testing
To verify the system is fully up and running:
1. Hit the health check endpoint: `GET http://localhost:5000/api/health`. You should receive:
   ```json
   { "status": "ok", "message": "Task Management API is running" }
   ```
2. Open `http://localhost:5173` in a web browser.
3. Register a test user and log in.
4. Try creating a task, toggling its status by clicking its status badge on the card, and uploading a small image file.
