const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

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

// Quiz schema
const QuizSchema = new mongoose.Schema({
  title: String,
  questions: Array
});
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);

module.exports = async (req, res) => {
  await connectDB();
  const { method, url, body } = req;

  if (method === 'GET') {
    // fetch quiz by title
    const title = url.split('/')[1];
    const quiz = await Quiz.findOne({ title }) || { questions: [] };
    return res.status(200).json({ questions: quiz.questions });
  }

  if (method === 'POST' && url.endsWith('/submit')) {
    const { answers } = body;
    // minimal logic: return score = number of answers
    const totalQuestions = Object.keys(answers).length;
    return res.status(200).json({ score: totalQuestions, totalQuestions });
  }

  res.status(405).json({ msg: 'Method not allowed' });
};
