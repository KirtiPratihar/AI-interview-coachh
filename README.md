# 🎯 AI Interview Coach

An intelligent, web-based interview simulation platform that provides real-time feedback on technical accuracy, vocal delivery, and visual non-verbal cues (body language, eye contact, and posture). 

## 🌟 Features
* **Computer Vision Analysis:** Captures periodic snapshots from the user's webcam and utilizes multimodal AI to evaluate eye contact, posture, and visible signs of nervousness.
* **Vocal & Speech Analysis:** Processes audio input to evaluate tone, pace, and verbal confidence.
* **Content Evaluation:** Generates dynamic, difficulty-scaled questions and grades the technical accuracy of the user's response using the STAR method.
* **Secure Authentication & Tracking:** Powered by Firebase Authentication and Firestore to save session history and track improvement over time.

## 🛠️ Tech Stack
* **Frontend:** React.js, Vite, Tailwind CSS
* **Backend/Database:** Firebase (Authentication, Cloud Firestore)
* **AI & Vision Model:** Google Gemini 2.5 Flash (Multimodal capabilities for processing Audio + Image snapshots)

## 🚀 Setup and Installation

**1. Clone the repository**
\`\`\`bash
git clone https://github.com/KirtiPratihar/ai-interview-coachh.git
cd ai-interview-coach
\`\`\`

**2. Install dependencies**
\`\`\`bash
npm install
\`\`\`

**3. Environment Variables**
Create a `.env` file in the root directory and add your Firebase and Gemini API keys:
\`\`\`env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_key
\`\`\`

**4. Run the development server**
\`\`\`bash
npm run dev
\`\`\`

## 💻 Usage
1. Click **Sign in with Google** to authenticate.
2. Select your target role (e.g., AI & Machine Learning, Frontend) and experience level.
3. Grant the browser permission to access your Camera and Microphone.
4. Answer the generated questions. The app will record your audio and capture visual frames.
5. Receive your comprehensive feedback score, detailing your technical correctness and non-verbal visual communication.
