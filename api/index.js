require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- MongoDB Connection ---
if (mongoose.connection.readyState !== 1) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB connected successfully.'))
        .catch(err => console.error('MongoDB connection error:', err));
}

// --- Mongoose Schemas & Models ---
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
    feedback: [{ text: String, isCorrect: Boolean, feedback: String }]
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

// --- Authentication Middleware ---
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
        return res.status(403).json({ message: 'Access denied. Only teachers can perform this action.'});
    }
    next();
};

// --- API Routes ---

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Username already exists' });
        }
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
        const tokenPayload = { username: user.username, role: user.role };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: tokenPayload });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// QUIZ ROUTES
app.get('/api/quizzes', authenticateToken, async (req, res) => {
    try {
        let query = Quiz.find();
        if (req.user.role === 'student') {
            query = query.select('-questions.correctAnswerIndex -questions.feedback');
        }
        const quizzes = await query.exec();
        res.json(quizzes);
    } catch (error) {
        console.error("Fetch Quizzes Error:", error);
        res.status(500).json({ message: 'Error fetching quizzes' });
    }
});

app.get('/api/quizzes/:id', authenticateToken, async (req, res) => {
    try {
        let query = Quiz.findById(req.params.id);
        if (req.user.role === 'student') {
             query = query.select('-questions.correctAnswerIndex -questions.feedback');
        }
        const quiz = await query.exec();
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        console.error("Fetch Single Quiz Error:", error);
        res.status(500).json({ message: 'Error fetching quiz' });
    }
});

// POST /api/quizzes - Create a new quiz
app.post('/api/quizzes', authenticateToken, isTeacher, async (req, res) => {
    try {
        const { title, description } = req.body;
        const newQuiz = new Quiz({
            title,
            description,
            author: req.user.username, // Associate with the logged-in teacher
            questions: []
        });
        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) {
        console.error("Create Quiz Error:", error);
        res.status(500).json({ message: 'Error creating quiz' });
    }
});

// PUT /api/quizzes/:id - Update a quiz's details
app.put('/api/quizzes/:id', authenticateToken, isTeacher, async (req, res) => {
    try {
        const { title, description } = req.body;
        const updatedQuiz = await Quiz.findOneAndUpdate(
            // Find a quiz that has the correct ID AND is owned by the logged-in teacher
            { _id: req.params.id, author: req.user.username },
            { title, description },
            { new: true } // Return the updated document
        );

        if (!updatedQuiz) {
            return res.status(404).json({ message: 'Quiz not found or you do not have permission to edit it.' });
        }
        res.json(updatedQuiz);
    } catch (error) {
        console.error("Update Quiz Error:", error);
        res.status(500).json({ message: 'Error updating quiz' });
    }
});

// DELETE /api/quizzes/:id - Delete a quiz
app.delete('/api/quizzes/:id', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, author: req.user.username });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or you do not have permission to delete it.' });
        }
        // Also delete any student results associated with this quiz
        await Result.deleteMany({ quizId: req.params.id });
        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ message: 'Quiz and associated results deleted successfully.' });
    } catch (error) {
        console.error("Delete Quiz Error:", error);
        res.status(500).json({ message: 'Error deleting quiz' });
    }
});

// POST /api/quizzes/:id/questions - Add a new question to a quiz
app.post('/api/quizzes/:id/questions', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, author: req.user.username });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or permission denied.' });
        }
        const { text, options, correctAnswerIndex } = req.body;
        quiz.questions.push({ text, options, correctAnswerIndex });
        await quiz.save();
        res.status(201).json(quiz);
    } catch (error) {
        console.error("Add Question Error:", error);
        res.status(500).json({ message: 'Error adding question' });
    }
});

// PUT /api/quizzes/:quizId/questions/:questionId - Update an existing question
app.put('/api/quizzes/:quizId/questions/:questionId', authenticateToken, isTeacher, async (req, res) => {
    try {
        const { text, options, correctAnswerIndex } = req.body;
        const quiz = await Quiz.findOne({ _id: req.params.quizId, author: req.user.username });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or permission denied.' });
        }
        // Mongoose's .id() method is a convenient way to find a subdocument by its _id
        const question = quiz.questions.id(req.params.questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        // Update the question's properties
        question.text = text;
        question.options = options;
        question.correctAnswerIndex = correctAnswerIndex;
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        console.error("Update Question Error:", error);
        res.status(500).json({ message: 'Error updating question' });
    }
});

// DELETE /api/quizzes/:quizId/questions/:questionId - Delete a question from a quiz
app.delete('/api/quizzes/:quizId/questions/:questionId', authenticateToken, isTeacher, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.quizId, author: req.user.username });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or permission denied.' });
        }
        const question = quiz.questions.id(req.params.questionId);
        if (question) {
            // Mongoose's .remove() method on a subdocument removes it from its parent array
            question.remove();
        } else {
             return res.status(404).json({ message: 'Question not found.' });
        }
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        console.error("Delete Question Error:", error);
        res.status(500).json({ message: 'Error deleting question' });
    }
});


// RESULT ROUTES
app.post('/api/results', authenticateToken, async (req, res) => {
    try {
        const { quizId, answers } = req.body;
        const studentUsername = req.user.username;

        console.log(`[POST /api/results] Student: ${studentUsername}, Quiz: ${quizId}`);
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            console.error(`[POST /api/results] Quiz not found with ID: ${quizId}`);
            return res.status(404).json({ message: 'Quiz not found' });
        }

        let score = 0;
        quiz.questions.forEach(question => {
            // Using a loose equality check (==) is safer if answer values are numbers vs strings
            if (answers[question._id] == question.correctAnswerIndex) {
                score++;
            }
        });
        console.log(`[POST /api/results] Calculated score: ${score}/${quiz.questions.length}`);

        // More robust logic: Explicitly find, then update or create.
        let result = await Result.findOne({ quizId: quizId, studentUsername: studentUsername });

        if (result) {
            // If result exists, update it
            console.log(`[POST /api/results] Found existing result. Updating score.`);
            result.score = score;
            result.submittedAt = new Date();
            await result.save();
        } else {
            // If result does not exist, create a new one
            console.log(`[POST /api/results] No existing result found. Creating new one.`);
            result = new Result({
                quizId: quizId,
                studentUsername: studentUsername,
                score: score,
                totalQuestions: quiz.questions.length
            });
            await result.save();
        }
        console.log(`[POST /api/results] Result saved successfully. ID: ${result._id}`);

        res.status(201).json({ 
            score, 
            totalQuestions: quiz.questions.length,
            quiz
        });
    } catch (error) {
        console.error("[POST /api/results] CRITICAL ERROR:", error);
        res.status(500).json({ message: 'An internal error occurred while submitting your result.' });
    }
});

app.get('/api/results', authenticateToken, async (req, res) => {
    try {
        const results = await Result.find({ studentUsername: req.user.username }).populate('quizId', 'title');
        
        const formattedResults = results.map(r => ({
            _id: r._id,
            quizId: r.quizId ? r.quizId._id : null,
            quizTitle: r.quizId ? r.quizId.title : 'Deleted Quiz',
            score: r.score,
            totalQuestions: r.totalQuestions,
            submittedAt: r.submittedAt
        }));
        
        res.json(formattedResults);
    } catch (error) {
        console.error("Fetch Results Error:", error);
        res.status(500).json({ message: 'Error fetching results' });
    }
});


// --- Server Start for Local Dev ---
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running for local development on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;

