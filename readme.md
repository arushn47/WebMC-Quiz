WebMC: A Web-based Multiple Choice Assessment System
Welcome to WebMC! This is a full-stack application designed for creating and taking multiple-choice quizzes. It features separate dashboards for teachers and students and is built to be deployed seamlessly on Vercel.

Tech Stack
Frontend: HTML, Tailwind CSS, Vanilla JavaScript

Backend: Node.js, Express.js

Database: MongoDB Atlas

Deployment: Vercel

Features
Teacher Dashboard:

Create new quizzes with titles and descriptions.

Add multiple-choice questions to any quiz.

View all created quizzes.

Student Dashboard:

View all available quizzes.

Take quizzes with a clean, focused interface.

View a history of past quiz results and scores.

Local Development Setup
Clone the repository:

git clone <your-repo-url>
cd webmc-assessment-system

Install dependencies:

npm install

Setup MongoDB:

Go to MongoDB Atlas and create a free database cluster.

In your database deployment, go to Connect -> Drivers and copy the connection string.

Create a file named .env in the root of the project.

Add your connection string to the .env file:

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority

Start the server:

npm start

The application will be running on http://localhost:3000.

How to Use
Navigate to the homepage.

Enter teacher as the username to access the Teacher Dashboard.

Enter any other name (e.g., student or your name) to access the Student Dashboard.

Deployment to Vercel
Push your project code to a GitHub/GitLab/Bitbucket repository.

Go to your Vercel dashboard and create a new project by importing your repository.

Vercel will automatically detect the vercel.json file and configure the build settings.

Before deploying, go to the project's Settings -> Environment Variables. Add a new variable:

Key: MONGODB_URI

Value: Your MongoDB Atlas connection string.

Trigger a new deployment. Your WebMC system is now live!