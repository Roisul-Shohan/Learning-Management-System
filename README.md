**Learning Management System (LMS)**

- **Project:** Learning Management System (LMS)
- **Stack:** Node.js, Express, MongoDB (GridFS), EJS templates
 - **Live Demo:** https://learning-management-system-1-j300.onrender.com
- **Purpose:** A basic LMS platform with instructors, students, course content (video/file streaming via GridFS), quizzes, progress tracking, and certificate generation.

**Features**:
- **Authentication:** Student and Instructor sign-up/sign-in with JWT cookies.
- **Course Management:** Instructors can add courses and upload content (video/files stored in GridFS).
- **Video & File Streaming:** Video streaming with byte-range support using MongoDB GridFS.
- **Progress Tracking:** Course progress (watched seconds, completion) tracked per user.
- **Quizzes:** Quiz creation, submission and scoring.
- **Certificates:** Admin-approved certificate generation and PDF export.

**Prerequisites**:
- Node.js (v16+ recommended)
- MongoDB instance (Atlas or local)
- ffmpeg/ffprobe binaries (devDependencies include installers; runtime may require system access)

**Installation**:

1. Clone the repo (if not already):

```
git clone https://github.com/Roisul-Shohan/Learning-Management-System.git
cd Learning-Management-System
```

2. Install dependencies:

```
npm install
```

3. Create an `.env` file in the project root with the following variables (example):

```
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/lms?retryWrites=true&w=majority
JWT_KEY=your_jwt_secret
SESSION_SECRET=some_session_secret
```

4. Start the app (development):

```
npx nodemon app.js
```

Or with Node directly:

```
node app.js
```

The app listens on port `3000` by default.

**Important Environment Variables**:
- `MONGODB_URI`: connection string for MongoDB.
- `JWT_KEY`: secret used for signing JWT tokens for students/users.
- `SESSION_SECRET`: session secret used by `express-session`.

**Project Layout (important files)**:
- `app.js`: Application entry, routes mounting, views setup, server start.
- `package.json`: npm dependencies.
- `config/db.js`: MongoDB connection and GridFSBucket initialization.
- `controllers/`: Route handlers (e.g., `authController.js`).
- `routes/`: Express routers (`studentsRouter`, `instructorsRouter`, `progressRouter`, `quizRouter`).
- `models/`: Mongoose models for users, instructors, courses, content, progress, quizzes, certificates.
- `views/`: EJS templates for server-side rendering.
- `public/`: Static files (styles, client scripts, images).

**Routes Summary** (high-level)
- `GET /` — Home (list courses)
- `GET /signup`, `POST /signup` — Sign up for students/instructors
- `POST /student/...` & `POST /instructor/...` — Student and Instructor routes mounted in `routes/`
- `POST /progress/` — Update progress (requires authentication)
- `GET /progress/progress/student/:id` — Instructor-only: Get progress for a student
- `GET /progress/student/video/:id` and `/progress/teacher/video/:id` — Stream video content from GridFS
- `GET /progress/student/file/:id` — Stream file content from GridFS

Note: See `routes/` to inspect specific endpoints and middleware usage (`middlewares/isLoggedin.js`, `middlewares/isInstructor.js`).

**GridFS & Video Streaming**:
The app stores large media files in MongoDB using GridFS (bucket name: `videos`). Streaming endpoints support byte-range requests to enable seeking in video players.

**Admin**:
- Admin access is guarded by a special token cookie (`token` set to `aaaaaa` in `app.js` for the admin routes) — used for quick demo/admin pages.

**Development Notes & Troubleshooting**:
- Make sure `MONGODB_URI` is correct and accessible. GridFSBucket is initialized after DB connection.
- If video streaming fails, confirm `file_id` values in `course_content` docs are valid ObjectIds referencing GridFS files.
- If JWT auth fails, check `JWT_KEY` in `.env`.

**Pushing README to GitHub**

If you cloned the repo locally and want to push the README (or other changes) to the GitHub repository, use:

```
git add README.md
git commit -m "Add README.md"
git push origin HEAD
```

If `git push` asks for credentials and you prefer to use a PAT (personal access token), either configure a credential manager for your OS or use an HTTPS remote with a PAT.

**License**
- This project does not include a license file. Add a `LICENSE` file if you intend to apply an open-source license.

**Next steps** (suggested):
- Add tests and `npm run` scripts for start/dev.
- Add CI workflow and a `LICENSE` file.
- Add more detailed API docs or Swagger UI for the endpoints.

---
Generated README based on repository structure and code.
