# Database Records Access Guide

## 📊 Overview
Your application uses **MongoDB** for all database operations. Here's how to view and manage your data.

---

## 🔐 1. MongoDB Connection Details

Your MongoDB URI is stored in the `.env` file in your `backend` folder:

```
MONGO_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority
```

---

## 📍 2. Where to View Database Records

### **Option A: MongoDB Atlas Web Interface (Recommended)**

#### Step 1: Go to MongoDB Atlas
1. Visit [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in with your account (the email used when creating the cluster)
3. Navigate to your **Project** and **Cluster**

#### Step 2: Open Data Explorer
1. Click on **"Browse Collections"** button in your cluster
2. This opens the **Data Explorer** where you can see all databases and collections

#### Step 3: View Collections
Your EduMarket app has these **main collections**:

- **`users`** - User accounts, profiles, credentials
  - Fields: fullName, email, password, avatar, educationLevel, bio, rating, notesUploaded, totalDownloads, isOnline, createdAt, updatedAt

- **`notes`** - Study notes uploaded by users
  - Fields: title, subject, educationLevel, description, price, pages, isHandwritten, hasDigitalized, digitalizedContent, qualityScore, plagiarismScore, plagiarismDetails, fileUrl, thumbnail, tags, downloads, rating, reviews, createdAt, updatedAt

- **`conversations`** - Chat conversations between users
  - Fields: participants, messages (array), createdAt, updatedAt

- **`messages`** - Individual chat messages
  - Fields: conversationId, senderId, text, timestamp, isRead

- **`notifications`** - User notifications
  - Fields: userId, type, message, relatedUser, relatedNote, isRead, createdAt

- **`payments`** - Payment/Transaction records
  - Fields: userId, noteId, amount, razorpayOrderId, razorpayPaymentId, status, createdAt

---

## 🖥️ **Option B: MongoDB Compass (Local GUI Client)**

### Download & Install
1. Download from [https://www.mongodb.com/products/compass](https://www.mongodb.com/products/compass)
2. Install and launch Compass

### Connect to Your Database
1. Click **"New Connection"**
2. Paste your `MONGO_URI` from `.env`
3. Click **"Connect"**
4. Browse all collections visually with filtering, sorting, and editing capabilities

---

## 💻 **Option C: MongoDB CLI (Command Line)**

### Using mongosh
```bash
# Install mongosh if not already installed
# Then connect:
mongosh "mongodb+srv://[username]:[password]@[cluster].mongodb.net/"

# Switch to your database
use your_database_name

# View all collections
show collections

# Query examples:
db.notes.find().limit(10)
db.users.find({ email: "user@example.com" })
db.payments.find().sort({ createdAt: -1 })
```

---

## 🎯 **Option D: Backend REST API (Using Your App)**

Your backend provides APIs to query data:

### Get All Notes
```
GET /api/notes?page=1&limit=20&sort=popular
```

### Get User Notes
```
GET /api/notes/seller/[userId]
```

### Get Single Note
```
GET /api/notes/[noteId]
```

### Get User Profile
```
GET /api/users/[userId]
```

You can access these through:
- Your browser: `http://localhost:5000/api/notes`
- Postman/Insomnia
- cURL commands

---

## 🔍 **Common Queries**

### Find All Study Notes on Physics
```javascript
// MongoDB Compass or mongosh
db.notes.find({ subject: "Physics" })
```

### Find All High-Quality Notes (Rating > 4)
```javascript
db.notes.find({ rating: { $gt: 4 } })
```

### Find Most Downloaded Notes
```javascript
db.notes.find().sort({ downloads: -1 }).limit(10)
```

### Find Your Plagiarism Score Details
```javascript
db.notes.find({}, { title: 1, plagiarismScore: 1, plagiarismDetails: 1 })
```

### Find User's Payment History
```javascript
db.payments.find({ userId: ObjectId("[userId]") })
```

### Find Recent Messages in a Conversation
```javascript
db.messages.find({ conversationId: ObjectId("[conversationId]") }).sort({ timestamp: -1 })
```

---

## 📈 **View Statistics & Analytics**

### Total Notes Uploaded
```javascript
db.notes.countDocuments()
```

### Total Users
```javascript
db.users.countDocuments()
```

### Average Note Quality Score
```javascript
db.notes.aggregate([
  { $group: { _id: null, avgQuality: { $avg: "$qualityScore" } } }
])
```

### Top 5 Most Downloaded Notes
```javascript
db.notes.find().sort({ downloads: -1 }).limit(5)
```

### Notes with High Plagiarism Risk
```javascript
db.notes.find({ 
  plagiarismScore: { $lt: 70 },
  "plagiarismDetails.riskLevel": "HIGH"
})
```

---

## 🛡️ **Important Security Notes**

⚠️ **Never share your MONGO_URI publicly!**

- Keep `.env` file out of version control (add to `.gitignore`)
- Your MongoDB credentials are sensitive
- Only authorized users should have database access
- Use MongoDB's IP Whitelist feature in Atlas

---

## 📝 **Backup Your Data**

### Using MongoDB Atlas
1. Go to your **Cluster**
2. Click **"Backup"** in the left menu
3. Create manual backups or enable automated daily backups

### Using CLI
```bash
# Export data
mongodump --uri "mongodb+srv://[user]:[password]@[cluster]..." --out ./backup

# Import data
mongorestore --uri "mongodb+srv://[user]:[password]@[cluster]..." ./backup
```

---

## 🐛 **Troubleshooting**

### Can't Connect to MongoDB?
- ✓ Check your internet connection
- ✓ Verify `MONGO_URI` is correct in `.env`
- ✓ Ensure your IP is whitelisted in MongoDB Atlas security settings
- ✓ Check if cluster is active (not paused)

### Can't See Collections?
- ✓ Make sure data has been uploaded through your app
- ✓ Refresh the page/client
- ✓ Verify you're in the correct database and cluster

### Data Looks Incorrect?
- ✓ Check timestamps (MongoDB stores UTC time)
- ✓ Verify ObjectId references between collections
- ✓ Check user permissions and data ownership

---

## 📚 **Learn More**

- [MongoDB Documentation](https://docs.mongodb.com/)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [MongoDB Compass Guide](https://docs.mongodb.com/compass/current/)
- [MongoDB Query Language](https://docs.mongodb.com/manual/reference/operator/query/)

---

## 🎓 **Schema Documentation**

All database schemas are defined in these files:
- [User.js](../backend/models/User.js)
- [Note.js](../backend/models/Note.js)
- [Conversation.js](../backend/models/Conversation.js)
- [Message.js](../backend/models/Message.js)
- [Notification.js](../backend/models/Notification.js)
- [Payment.js](../backend/models/Payment.js)
