require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

if (mongoose.connection.readyState !== 1) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB connected successfully.'))
        .catch(err => console.error('MongoDB connection error:', err));
}

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher'], required: true }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswerIndex: { type: Number, required: true },
    feedback: { type: String } // Simplified to a single string for the correct answer
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    author: { type: String, required: true },
    questions: [questionSchema]
});
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);

const resultSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentUsername: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now }
});
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isTeacher = (req, res, next) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Access denied.'});
    }
    next();
};

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) { return res.status(400).json({ message: 'All fields are required' }); }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        if (error.code === 11000) { return res.status(409).json({ message: 'Username already exists' }); }
        res.status(500).json({ message: 'Error registering user' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const tokenPayload = { username: user.username, role: user.role };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: tokenPayload });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.get('/api/quizzes', authenticateToken, async (req, res) => {
    try {
        const query = (req.user.role === 'teacher')
            ? Quiz.find()
            : Quiz.find().select('title description author');
        const quizzes = await query.exec();
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quizzes' });
    }
});

app.get('/api/quizzes/:id', authenticateToken, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz' });
    }
});

app.post('/api/quizzes', authenticateToken, isTeacher, async (req, res) => {
    try {
        const { title, description } = req.body;
        const newQuiz = new Quiz({ title, description, author: req.user.username, questions: [] });
        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) {
        res.status(500).json({ message: 'Error creating quiz' });
    }
});
app.put('/api/quizzes/:id', authenticateToken, isTeacher, async (req, res) => {
    try {
        const { title, description } = req.body;
        const updatedQuiz = await Quiz.findOneAndUpdate( { _id: req.params.id, author: req.user.username }, { title, description }, { new: true });
        if (!updatedQuiz) { return res.status(404).json({ message: 'Quiz not found or permission denied.' }); }
        res.json(updatedQuiz);
    } catch (error) {
        res.status(500).json({ message: 'Error updating quiz.' });
    }
});
app.delete('/api/quizzes/:id', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, author: req.user.username });
        if (!quiz) { return res.status(404).json({ message: 'Quiz not found or permission denied.' }); }
        await Result.deleteMany({ quizId: req.params.id });
        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ message: 'Quiz deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quiz.' });
    }
});
app.post('/api/quizzes/:id/questions', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, author: req.user.username });
        if (!quiz) { return res.status(404).json({ message: 'Quiz not found or permission denied.' }); }
        const { text, options, correctAnswerIndex, feedback } = req.body;
        quiz.questions.push({ text, options, correctAnswerIndex, feedback });
        await quiz.save();
        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error adding question' });
    }
});
app.put('/api/quizzes/:quizId/questions/:questionId', authenticateToken, isTeacher, async (req, res) => {
    try {
        const { text, options, correctAnswerIndex, feedback } = req.body;
        const quiz = await Quiz.findOne({ _id: req.params.quizId, author: req.user.username });
        if (!quiz) { return res.status(404).json({ message: 'Quiz not found or permission denied.' }); }
        const question = quiz.questions.id(req.params.questionId);
        if (!question) { return res.status(404).json({ message: 'Question not found.' }); }
        question.text = text; question.options = options; question.correctAnswerIndex = correctAnswerIndex; question.feedback = feedback;
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error updating question' });
    }
});
app.delete('/api/quizzes/:quizId/questions/:questionId', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.quizId, author: req.user.username });
        if (!quiz) { return res.status(404).json({ message: 'Quiz not found or permission denied.' }); }
        const question = quiz.questions.id(req.params.questionId);
        if (question) { question.remove(); }
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting question' });
    }
});
app.get('/api/quizzes/:id/results', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, author: req.user.username });
        if (!quiz) { return res.status(404).json({ message: 'Quiz not found or permission denied.' }); }
        const results = await Result.find({ quizId: req.params.id }).sort({ studentUsername: 1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz results.' });
    }
});
app.post('/api/results', authenticateToken, async (req, res) => {
    try {
        const { quizId, score, totalQuestions } = req.body;
        await Result.findOneAndUpdate(
            { quizId: quizId, studentUsername: req.user.username },
            { score, totalQuestions, submittedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Result saved.' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting result' });
    }
});
app.get('/api/results', authenticateToken, async (req, res) => {
    try {
        const results = await Result.find({ studentUsername: req.user.username }).populate('quizId', 'title');
        res.json(results.map(r => ({ _id: r._id, quizId: r.quizId ? r.quizId._id : null, quizTitle: r.quizId ? r.quizId.title : 'Deleted Quiz', score: r.score, totalQuestions: r.totalQuestions, submittedAt: r.submittedAt })));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching results' });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => { console.log(`Server is running on http://localhost:${PORT}`); });
}

module.exports = app;

