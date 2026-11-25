# ⏭️ SkipTo – AI YouTube Timestamps

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Python](https://img.shields.io/badge/Python_3.13-3776AB?logo=python&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?logo=googlegemini&logoColor=white)
![YouTube Data API](https://img.shields.io/badge/YouTube_Data_API-FF0000?logo=youtube&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

**🔗 Live app: [skiptoai.web.app](https://skiptoai.web.app)**

## 📖 Introduction

**SkipTo** turns any YouTube video into clickable chapter timestamps. Paste a link, and an AI watches the video and returns a list of timestamps with short titles, so you can jump straight to the part you care about instead of scrubbing through the whole thing.

It is a full-stack web app with a **React** frontend on **Firebase Hosting** and a **Python Cloud Functions** backend that calls **Google Gemini**. It was inspired by a YouTube tutorial series that used a paid video-AI API (Bumpups). I rebuilt the backend to use the **free Gemini API** instead, added reliability and security features the tutorial did not cover, and adapted the whole workflow to run on Windows.

## 🛠️ Technologies Used

**Frontend**
- React (Create React App)
- Firebase Web SDK: Functions, Authentication, App Check, Analytics
- YouTube Data API v3 for video titles and thumbnails
- Font Awesome icons
- Custom CSS (dark theme, shimmer loading states, responsive layout)
- `localStorage` for per-browser history

**Backend**
- Firebase Cloud Functions (2nd Gen) in **Python 3.13**
- Google Gemini API via the `google-genai` SDK
- Pydantic models for structured JSON output
- Firebase Admin SDK

**Security**
- Firebase App Check with **Fraud Defense** (reCAPTCHA Enterprise)
- Firebase Anonymous Authentication
- Server-side auth and App Check guards on every function
- API key restricted to the app's domains

**DevOps and growth**
- Firebase Hosting (custom site: `skiptoai.web.app`)
- GitHub Actions: preview deploys on pull requests, live deploys on merge to `main`
- GitHub repository secrets for build-time environment variables
- Google Analytics 4, Google AdSense, SEO and Open Graph meta tags

## ✨ Features

- **AI timestamps** for any public YouTube video (long or short titles, any language code)
- **Two-step flow:** load the video first (thumbnail and title), then generate timestamps, so you never spend an AI request on the wrong link
- **Popup results** with clickable timestamps that open YouTube at that exact second
- **Copy all** button that copies timestamps in YouTube's chapter format, ready to paste into a description
- **History** of past videos that reopens instantly without calling the AI again
- **Automatic model fallback:** uses the best Gemini model first and switches to a model with a higher free limit when the first one runs out
- **Automatic retries** when the AI is temporarily busy
- **Bot protection:** only real visitors on the official website can call the backend
- Polished loading states (animated wand, shimmering skeleton, spinner) and a mobile-friendly layout
- Link previews on WhatsApp, Facebook, LinkedIn and X

## 🙋 What Users Can Do

1. Paste a YouTube link and click **Load Video** to see the thumbnail and title.
2. Click **Generate Timestamps** and wait while the AI watches the video.
3. Click any timestamp to jump to that moment on YouTube, or **Copy all** to reuse them.
4. Reopen any past video from **History** instantly.

## 🏗️ How It Works

```
Browser (React on Firebase Hosting)
   │  1. Signs in anonymously + gets an App Check token
   │  2. Fetches title/thumbnail from the YouTube Data API
   │  3. Calls generate_timestamps (Firebase callable function)
   ▼
Cloud Function (Python 3.13)
   │  4. Rejects requests without a signed-in user or valid App Check token
   │  5. Sends the YouTube URL + prompt to Gemini with a JSON schema
   │  6. Falls back to a second model if the first hits its limit
   ▼
Google Gemini
   │  7. Watches the video and returns structured timestamps
   ▼
Browser shows the popup and saves the result to History
```

## 🧱 How I Built It

1. **Set up Firebase** with a React frontend and Python Cloud Functions, using a Python 3.13 virtual environment on Windows.
2. **Replaced the paid API with Gemini.** The tutorial used Bumpups, which needed a paid plan for API access. I wrote my own `generate_timestamps` function that returns the same response shape (`timestamps_list`, `timestamps_string`, `video_duration`), so the rest of the app did not need to change.
3. **Used structured output.** Gemini is asked to fill a Pydantic schema instead of writing free text, so the app always gets clean, predictable JSON.
4. **Made it reliable.** Added retries for temporary errors and a model fallback chain after hitting the free tier's daily limit during testing.
5. **Built the frontend:** two-step load/generate flow, popup, history, copy button and loading animations.
6. **Set up CI/CD** with GitHub Actions so pull requests get a preview URL and merging into `main` deploys the live site.
7. **Secured the backend** with anonymous sign-in, App Check and server-side guards, then verified that direct requests from outside the website are rejected.
8. **Prepared for launch** with SEO tags, link previews, Google Analytics and AdSense.

## 🐛 Problems I Solved

- **Windows blocked the Python virtual environment.** Smart App Control blocked `pip.exe` and the Functions emulator's executables. I ran pip through `python -m pip` and tested functions against the deployed backend instead of the local emulator.
- **"Client has been closed" error.** The Gemini client was being garbage-collected before the request finished because it was created inline. I changed it to a single cached client that is reused across requests.
- **Free tier ran out after 20 requests a day.** Reading the rate-limit dashboard showed the daily request cap (not tokens) was the bottleneck, so I added a fallback to a model with a 500-requests-a-day limit and stopped retrying on `429` errors.
- **Blank page after automatic deploys.** GitHub Actions built the app without my local `.env` file, so Firebase crashed with "Missing App configuration value: projectId". I moved the values into GitHub repository secrets and passed them to the build step.
- **reCAPTCHA Classic was deprecated.** Firebase no longer accepted new classic keys, so I switched App Check to Fraud Defense (reCAPTCHA Enterprise).
- **Safe rollout of security.** I deployed the frontend changes (which send tokens) before turning on enforcement in the backend, so the live site never broke during the switch.

## 📚 What I Learned

- Designing a serverless backend with Firebase Cloud Functions in Python
- Getting reliable, structured data from an LLM with JSON schemas
- Handling real-world API limits with retries, fallbacks and clear error messages
- Protecting a public API with App Check and authentication instead of trusting the frontend
- Keeping secrets out of the repository while still building in CI
- Working with Git branches, pull requests and preview deploys like a real team workflow
- Debugging from logs (Google Cloud Logging) and the browser console

## 🔮 How It Could Be Improved

- Language and title-style pickers in the UI (the backend already supports both)
- An **AI video chat** page using the existing `ask_about_video` function
- Save history in **Firestore** so it follows users across devices
- Cache results per video so popular videos do not use AI requests twice
- Per-user rate limiting
- Automated tests for the Cloud Functions and key React components

## 📁 Project Structure

```
my-app/
├── .github/workflows/        # GitHub Actions: preview + live deploys
├── functions/                # Python Cloud Functions
│   ├── main.py               # generate_timestamps, ask_about_video
│   └── requirements.txt
├── public/
│   ├── index.html            # SEO, Open Graph, AdSense
│   └── ads.txt
├── src/
│   ├── firebase.js           # Firebase app, App Check, Auth, Functions
│   ├── App.js
│   └── unAuth/
│       ├── LandingPage.js
│       ├── components/
│       │   └── Timestamp.js  # Main timestamps feature
│       └── timestampcomp/
│           ├── StampPop.js   # Results popup
│           └── VideoList.js  # History
└── firebase.json
```

## 🚀 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) and npm
- [Python 3.13](https://www.python.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A Firebase project on the Blaze plan (required for Cloud Functions)
- A free [Gemini API key](https://aistudio.google.com/) and a YouTube Data API key

### 1. Clone the repo
```bash
git clone https://github.com/arunraghavan-codewithme/my-app.git
cd my-app
```

### 2. Frontend
```bash
npm install
npm start
```
The app opens at `http://localhost:3000`.

### 3. Backend (Windows PowerShell)
```powershell
cd functions
py -3.13 -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
deactivate
cd ..
```

### 4. Deploy
```bash
npm run build
firebase deploy
```

### Environment variables

Create two `.env` files. **Never commit real values.**

`.env` (project root, used by React):
```env
REACT_APP_API_KEY=
REACT_APP_AUTH_DOMAIN=
REACT_APP_PROJECT_ID=
REACT_APP_STORAGE_BUCKET=
REACT_APP_MESSAGING_SENDER_ID=
REACT_APP_APP_ID=
REACT_APP_MEASUREMENT_ID=
REACT_APP_YOUTUBE_API_KEY=
REACT_APP_RECAPTCHA_SITE_KEY=
```

`functions/.env` (used by Cloud Functions):
```env
GEMINI_API_KEY=
```

For GitHub Actions deploys, add the same `REACT_APP_*` values as repository secrets.

## 🎥 Demo

<!-- TODO: Add a short screen recording or screenshots: paste a link, load the video, generate timestamps, open the popup, reopen from History. -->

**Try it live:** [skiptoai.web.app](https://skiptoai.web.app)

## 👤 Author

**Arunpillai A/L Raghavan** ([@arunraghavan-codewithme](https://github.com/arunraghavan-codewithme))
Computer Science student, Universiti Sains Malaysia

## 📄 License

Personal learning project.
