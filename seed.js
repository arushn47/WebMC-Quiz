const mongoose = require('mongoose');
const dotenv = require('dotenv');

// We need to define the Mongoose models exactly as they are in `api/index.js`
// so this script knows how to save the data.
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher'], required: true }
});
const User = mongoose.model('User', userSchema);

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswerIndex: { type: Number, required: true }
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    author: { type: String, required: true },
    questions: [questionSchema]
});
const Quiz = mongoose.model('Quiz', quizSchema);


dotenv.config();

// Your original, human-readable data format with all questions included.
const sourceQuizData = [
    {
        question: "Which component in the Web System Architecture is responsible for listening for HTTP requests and sending back resources?",
        options: [
            { text: "Web Browser", isCorrect: false, feedback: "Incorrect. The Web Browser acts as the 'client'. It sends requests and renders the response it gets from the server." },
            { text: "DNS Server", isCorrect: false, feedback: "Incorrect. A DNS (Domain Name System) server's job is to translate human-readable domain names (like google.com) into IP addresses." },
            { text: "Web Server", isCorrect: true, feedback: "Correct! A Web Server (e.g., Apache, Nginx) is software that waits for requests from clients (browsers) and serves them the requested web page files." },
            { text: "URL", isCorrect: false, feedback: "Incorrect. A URL (Uniform Resource Locator) is the address of a resource on the web, not a component that processes requests." }
        ],
        furtherInfo: "This interaction is the foundation of the client-server model. Your browser (the client) sends a request, and the web server processes that request and sends a response, typically an HTML file, which the browser then displays."
    },
    {
        question: "In the CSS Box Model, what is the correct order of layers from the inside out?",
        options: [
            { text: "Margin, Border, Padding, Content", isCorrect: false, feedback: "Incorrect. This is the reverse order, from the outermost layer to the innermost." },
            { text: "Content, Padding, Border, Margin", isCorrect: true, feedback: "Correct! The content is at the core, surrounded by padding, then a border, and finally the margin which creates space around the element." },
            { text: "Content, Margin, Padding, Border", isCorrect: false, feedback: "Incorrect. The margin is always the outermost layer of the box model." },
            { text: "Padding, Content, Margin, Border", isCorrect: false, feedback: "Incorrect. The content is always the innermost part of the box." }
        ],
        furtherInfo: "Understanding the Box Model is fundamental to CSS. The 'content' is your text or image, 'padding' is the transparent space around the content, 'border' goes around the padding, and 'margin' is the transparent space outside the border."
    },
    {
        question: "Which HTML5 tag is most semantically appropriate for the main, unique content of a webpage?",
        options: [
            { text: "<div>", isCorrect: false, feedback: "Incorrect. `<div>` is a generic container with no semantic meaning. It should be used when no other semantic element is suitable." },
            { text: "<section>", isCorrect: false, feedback: "Incorrect. A `<section>` is for grouping related content, and a page can have multiple sections." },
            { text: "<article>", isCorrect: false, feedback: "Incorrect. An `<article>` is for self-contained content that could be distributed independently, like a blog post or news story." },
            { text: "<main>", isCorrect: true, feedback: "Correct! The `<main>` tag is specifically designed to contain the dominant content of the `<body>` of a document." }
        ],
        furtherInfo: "Using semantic tags like <main>, <nav>, <header>, and <footer> helps search engines and screen readers understand the structure and importance of your content, improving SEO and accessibility."
    },
    {
        question: "In JavaScript, which method is used to select a single HTML element using its unique ID?",
        options: [
            { text: "document.querySelector('.myClass')", isCorrect: false, feedback: "Incorrect. querySelector is a versatile method, but using a '.' selects an element by its class name, not its ID." },
            { text: "document.getElementById('myId')", isCorrect: true, feedback: "Correct! This is the most direct and efficient method to get a reference to an element when you know its unique ID." },
            { text: "document.getElementsByTagName('p')", isCorrect: false, feedback: "Incorrect. This method returns a live HTMLCollection of all elements with the specified tag name (e.g., all <p> tags)." },
            { text: "document.getElementsByClassName('myClass')", isCorrect: false, feedback: "Incorrect. This returns a collection of all elements that have the specified class name." }
        ],
        furtherInfo: "The Document Object Model (DOM) is a programming interface for web documents. JavaScript can access and manipulate the DOM, allowing you to change the document's structure, style, and content dynamically."
    },
    {
        question: "What does JSON stand for and what is its primary use?",
        options: [
            { text: "JavaScript Object Notation; for data interchange", isCorrect: true, feedback: "Correct! JSON is a lightweight, text-based format that is easy for humans to read and for machines to parse. It is the most common format for data exchange between clients and servers." },
            { text: "Java Standard Object Naming; a naming convention", isCorrect: false, feedback: "Incorrect. JSON is not specific to Java and is not a naming convention, but a data format." },
            { text: "JavaScript Oriented Networking; a network protocol", isCorrect: false, feedback: "Incorrect. JSON is a data format, not a protocol like HTTP or TCP/IP. It is often transmitted *over* HTTP." },
            { text: "Java Source Object Notation; for writing Java objects", isCorrect: false, feedback: "Incorrect. While its syntax is a subset of JavaScript's object literal syntax, JSON is language-independent." }
        ],
        furtherInfo: "JSON's simple key-value pair structure makes it a universal standard for APIs. When you fetch data from a server in a modern web application, it's almost always formatted as JSON."
    },
    {
        question: "What is the primary purpose of the `<!DOCTYPE html>` declaration at the beginning of an HTML file?",
        options: [
            { text: "It is a comment that provides metadata for developers.", isCorrect: false, feedback: "Incorrect. While it looks like a comment, it is a crucial instruction for the browser." },
            { text: "It tells the browser to render the page in standards mode.", isCorrect: true, feedback: "Correct! This declaration prevents the browser from switching to 'quirks mode', ensuring more predictable rendering across different browsers." },
            { text: "It links the document to the official HTML5 stylesheet.", isCorrect: false, feedback: "Incorrect. The doctype declaration does not link to any external files like stylesheets." },
            { text: "It declares the primary language of the webpage content.", isCorrect: false, feedback: "Incorrect. The language is declared using the `lang` attribute on the `<html>` tag, like `<html lang='en'>`." }
        ],
        furtherInfo: "The DOCTYPE is a historical artifact that has been simplified in HTML5. Its presence ensures that the browser interprets the HTML according to the latest standards. Without it, browsers might enter 'quirks mode' to support older, non-standard code, leading to inconsistent layouts and behavior."
    },
    {
        question: "Which HTTP status code indicates that the requested resource could not be found on the server?",
        options: [
            { text: "200 OK", isCorrect: false, feedback: "Incorrect. A `200 OK` status means the request was successful and the resource was found and sent." },
            { text: "500 Internal Server Error", isCorrect: false, feedback: "Incorrect. A `500` error means something went wrong on the server itself, but not necessarily that the resource is missing." },
            { text: "301 Moved Permanently", isCorrect: false, feedback: "Incorrect. A `301` status is a redirection, indicating the resource has been moved to a new URL." },
            { text: "404 Not Found", isCorrect: true, feedback: "Correct! The `404` code is the standard response for a client request to a URL that does not exist." }
        ],
        furtherInfo: "HTTP status codes are grouped into classes. `2xx` codes indicate success, `3xx` codes for redirection, `4xx` codes for client-side errors (like a typo in the URL), and `5xx` codes for server-side errors. Understanding these is vital for debugging web applications."
    },
    {
        question: "In CSS, which of the following selectors has the highest specificity?",
        options: [
            { text: "A class selector (e.g., `.my-class`)", isCorrect: false, feedback: "Incorrect. While more specific than a type selector, a class is less specific than an ID." },
            { text: "An ID selector (e.g., `#my-id`)", isCorrect: true, feedback: "Correct! An ID is meant to be unique within a page, so its selector has very high specificity, overriding class and type selectors." },
            { text: "A type selector (e.g., `p`)", isCorrect: false, feedback: "Incorrect. A type (or tag) selector is one of the least specific selectors." },
            { text: "A universal selector (*)", isCorrect: false, feedback: "Incorrect. The universal selector has zero specificity and is overridden by any other selector." }
        ],
        furtherInfo: "CSS Specificity is the algorithm browsers use to determine which style rule applies if multiple rules are targeting the same element. The hierarchy is generally: inline styles > IDs > classes/attributes/pseudo-classes > types/pseudo-elements. When in doubt, you can use a specificity calculator online."
    },
    {
        question: "In modern JavaScript (ES6+), what is the key difference between `let` and `const`?",
        options: [
            { text: "`let` is function-scoped while `const` is block-scoped.", isCorrect: false, feedback: "Incorrect. Both `let` and `const` are block-scoped, which is a major advantage over the function-scoped `var`." },
            { text: "Variables declared with `let` can be reassigned, while `const` variables cannot.", isCorrect: true, feedback: "Correct! A variable declared with `const` must be initialized at the time of declaration and its value cannot be reassigned. `let` allows for reassignment." },
            { text: "`const` can only be used for primitive types like numbers and strings.", isCorrect: false, feedback: "Incorrect. You can declare objects and arrays with `const`. While you cannot reassign the variable itself, you can still mutate the properties of the object or the elements of the array." },
            { text: "Variables declared with `let` are hoisted, but `const` variables are not.", isCorrect: false, feedback: "Incorrect. Both `let` and `const` are hoisted, but they are not initialized, leading to a 'Temporal Dead Zone' if you try to access them before declaration." }
        ],
        furtherInfo: "As a best practice, you should always declare variables with `const` by default. Only use `let` when you know ahead of time that you will need to reassign the variable's value, for example, in a loop counter."
    },
    {
        question: "Which JavaScript method is the modern, standard way to attach an event handler to an HTML element?",
        options: [
            { text: "`element.onclick = myFunction;`", isCorrect: false, feedback: "Incorrect. This is an older method. Its main limitation is that you can only assign one handler for each event on an element." },
            { text: "`<button onclick='myFunction()'>`", isCorrect: false, feedback: "Incorrect. This is known as an 'inline' event handler. It mixes HTML and JavaScript, which is considered bad practice and makes code harder to maintain." },
            { text: "`element.addEventListener('click', myFunction);`", isCorrect: true, feedback: "Correct! `addEventListener` is the modern standard. It allows you to attach multiple event listeners for the same event and provides more control over the event handling process." },
            { text: "`element.attachEvent('onclick', myFunction);`", isCorrect: false, feedback: "Incorrect. This was a proprietary method used only by older versions of Internet Explorer and is not part of any modern web standard." }
        ],
        furtherInfo: "The `addEventListener` method is more flexible than older methods. For instance, its third argument can be an options object that allows you to specify behaviors like `once` (the listener is removed after it runs once) or `passive` (improves scrolling performance)."
    }
];

// --- TRANSFORMATION LOGIC ---
// This function converts your data into the format the application expects.
const transformQuizData = (data) => {
    return data.map(q => {
        // Find the index of the correct answer
        const correctIndex = q.options.findIndex(opt => opt.isCorrect === true);
        
        // Extract just the text from the options objects
        const optionTexts = q.options.map(opt => opt.text);

        // Return the new object in the correct format
        return {
            text: q.question, // Renamed from 'question' to 'text'
            options: optionTexts, // Now an array of strings
            correctAnswerIndex: correctIndex // The new required field
        };
    });
};


const seedDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in your .env file.");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected for seeding...");

        // IMPORTANT: Set the teacher's username who will own this quiz.
        // This MUST match a username in your 'users' collection.
        const authorUsername = "teacher"; // <<-- CHANGE THIS if your teacher username is different

        // Clear any existing quiz with the same title by this author to avoid duplicates
        await Quiz.deleteOne({ title: "IWP Formative Assessment", author: authorUsername });
        console.log("Deleted any old version of the quiz.");

        // Here we call the transformation function
        const formattedQuestions = transformQuizData(sourceQuizData);
        
        const iwpQuiz = new Quiz({
            title: "IWP Formative Assessment",
            description: "A quiz covering Modules 1-3 of the Internet and Web Programming syllabus.",
            author: authorUsername,
            questions: formattedQuestions // Use the newly formatted questions
        });
        
        await iwpQuiz.save();
        console.log('Database seeded successfully with transformed data!');
        
    } catch (err) {
        console.error("Seeding failed:", err.message);
    } finally {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
};

seedDB();