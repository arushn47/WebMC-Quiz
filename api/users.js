const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

let cached = global.mongoose;

if (!cached) cached = global.mongoose = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

// Simple User model
const UserSchema = new mongoose.Schema({ username: String, password: String });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = async (req, res) => {
  await connectDB();
  const { method, body } = req;

  if (method === 'POST' && req.url.endsWith('/register')) {
    const { username, password } = body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed });
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    return res.status(200).json({ token });
  }

  if (method === 'POST' && req.url.endsWith('/login')) {
    const { username, password } = body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    return res.status(200).json({ token });
  }

  if (method === 'GET' && req.url.endsWith('/me/results')) {
    // For simplicity: return empty array
    return res.status(200).json([]);
  }

  res.status(405).json({ msg: 'Method not allowed' });
};
