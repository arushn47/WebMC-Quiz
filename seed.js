const mongoose = require('mongoose');
const dotenv = require('dotenv');

const userSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, role: { type: String, enum: ['student', 'teacher'], required: true }});
const User = mongoose.models.User || mongoose.model('User', userSchema);
const questionSchema = new mongoose.Schema({ text: { type: String, required: true }, options: [{ type: String, required: true }], correctAnswerIndex: { type: Number, required: true }, feedback: { type: String } });
const quizSchema = new mongoose.Schema({ title: { type: String, required: true }, description: String, author: { type: String, required: true }, questions: [questionSchema] });
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);

dotenv.config();

const sourceQuizData = [
    {
        question: "Which component in the Web System Architecture is responsible for listening for HTTP requests and sending back resources?",
        options: [ "Web Browser", "DNS Server", "Web Server", "URL" ],
        correctAnswerIndex: 2,
        explanation: "A Web Server (e.g., Apache, Nginx) is software that waits for requests from clients (browsers) and serves them the requested web page files."
    },
    {
        question: "In the CSS Box Model, what is the correct order of layers from the inside out?",
        options: [ "Margin, Border, Padding, Content", "Content, Padding, Border, Margin", "Content, Margin, Padding, Border", "Padding, Content, Margin, Border" ],
        correctAnswerIndex: 1,
        explanation: "The content is at the core, surrounded by padding, then a border, and finally the margin which creates space around the element."
    },
    {
        question: "Which HTML5 tag is most semantically appropriate for the main, unique content of a webpage?",
        options: [ "<div>", "<section>", "<article>", "<main>" ],
        correctAnswerIndex: 3,
        explanation: "The `<main>` tag is specifically designed to contain the dominant content of the `<body>` of a document."
    },
    {
        question: "In JavaScript, which method is used to select a single HTML element using its unique ID?",
        options: [ "document.querySelector('.myClass')", "document.getElementById('myId')", "document.getElementsByTagName('p')", "document.getElementsByClassName('myClass')" ],
        correctAnswerIndex: 1,
        explanation: "This is the most direct and efficient method to get a reference to an element when you know its unique ID."
    },
    {
        question: "What does JSON stand for and what is its primary use?",
        options: [ "JavaScript Object Notation; for data interchange", "Java Standard Object Naming; a naming convention", "JavaScript Oriented Networking; a network protocol", "Java Source Object Notation; for writing Java objects" ],
        correctAnswerIndex: 0,
        explanation: "JSON is a lightweight, text-based format that is easy for humans to read and for machines to parse. It is the most common format for data exchange between clients and servers."
    },
    {
        question: "What is the primary purpose of the `<!DOCTYPE html>` declaration at the beginning of an HTML file?",
        options: [ "It is a comment that provides metadata for developers.", "It tells the browser to render the page in standards mode.", "It links the document to the official HTML5 stylesheet.", "It declares the primary language of the webpage content." ],
        correctAnswerIndex: 1,
        explanation: "This declaration prevents the browser from switching to 'quirks mode', ensuring more predictable rendering across different browsers."
    },
    {
        question: "Which HTTP status code indicates that the requested resource could not be found on the server?",
        options: [ "200 OK", "500 Internal Server Error", "301 Moved Permanently", "404 Not Found" ],
        correctAnswerIndex: 3,
        explanation: "The `404` code is the standard response for a client request to a URL that does not exist."
    },
    {
        question: "In CSS, which of the following selectors has the highest specificity?",
        options: [ "A class selector (e.g., `.my-class`)", "An ID selector (e.g., `#my-id`)", "A type selector (e.g., `p`)", "A universal selector (*)" ],
        correctAnswerIndex: 1,
        explanation: "An ID is meant to be unique within a page, so its selector has very high specificity, overriding class and type selectors."
    },
    {
        question: "In modern JavaScript (ES6+), what is the key difference between `let` and `const`?",
        options: [ "`let` is function-scoped while `const` is block-scoped.", "Variables declared with `let` can be reassigned, while `const` variables cannot.", "`const` can only be used for primitive types like numbers and strings.", "Variables declared with `let` are hoisted, but `const` variables are not." ],
        correctAnswerIndex: 1,
        explanation: "A variable declared with `const` must be initialized at the time of declaration and its value cannot be reassigned. `let` allows for reassignment."
    },
    {
        question: "Which JavaScript method is the modern, standard way to attach an event handler to an HTML element?",
        options: [ "`element.onclick = myFunction;`", "`<button onclick='myFunction()'>`", "`element.addEventListener('click', myFunction);`", "`element.attachEvent('onclick', myFunction);`" ],
        correctAnswerIndex: 2,
        explanation: "`addEventListener` is the modern standard. It allows you to attach multiple event listeners for the same event and provides more control over the event handling process."
    }
];

const transformQuizData = (data) => {
    return data.map(q => ({
        text: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        feedback: q.explanation
    }));
};

const seedDB = async () => {
    try {
        if (!process.env.MONGODB_URI) { throw new Error("MONGODB_URI is not defined."); }
        await mongoose.connect(process.env.MONGODB_URI);
        const authorUsername = "teacher";
        await Quiz.deleteOne({ title: "IWP Formative Assessment", author: authorUsername });
        const formattedQuestions = transformQuizData(sourceQuizData);
        const iwpQuiz = new Quiz({ title: "IWP Formative Assessment", description: "A practice quiz for IWP Modules 1-3.", author: authorUsername, questions: formattedQuestions });
        await iwpQuiz.save();
        console.log('Database seeded successfully!');
    } catch (err) {
        console.error("Seeding failed:", err.message);
    } finally {
        await mongoose.connection.close();
    }
};

seedDB();

