# 🎯 AI Interview Coach

> **Ace your next interview — practice smarter, not harder.**

An AI-powered mock interview platform that simulates real interview sessions, listens to your spoken answers, evaluates them in real time, and gives you detailed feedback to help you improve — all from your browser.

---

## 🌐 Live Demo

🔗 [**Try it here →**](https://your-deployment-link.com)

---

## ✨ Features

- 🎤 **Voice / Speech Support** — Answer questions out loud just like a real interview; your speech is captured and transcribed automatically
- 🤖 **AI-Generated Interview Questions** — Role-specific questions tailored to your job title, domain, and experience level
- 📊 **Instant AI Feedback** — Every answer gets scored and analyzed for clarity, depth, and relevance — with specific tips to improve
- 🗂️ **Multiple Interview Modes** — Practice Technical, Behavioral, or HR rounds
- 📝 **End-of-Session Report** — Full summary with your overall score, strengths, and areas to work on
- 🌙 **Distraction-Free UI** — Clean, focused interface built to simulate a real interview environment

---

## 🛠️ Tech Stack

_

| Layer | Technology |
|---|---|
| Frontend | React.js / Next.js |
| Backend | Node.js / Express |
| AI Engine | OpenAI API (GPT-4) |
| Speech-to-Text | Web Speech API / Whisper |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## 📸 Screenshots


---

## ⚙️ Getting Started

### Prerequisites

- Node.js v18+
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- A modern browser with microphone access (for voice features)

### Installation

```bash
# Clone the repository
git clone https://github.com/KirtiPratihar/AI-interview-coach.git
cd AI-interview-coach

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Add your API key to `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and allow microphone access when prompted.

---

## 📁 Project Structure

```
AI-interview-coach/
├── app/                  # Next.js app directory
│   ├── page.jsx          # Home / landing page
│   └── interview/        # Interview session flow
├── components/           # Reusable UI components
│   ├── QuestionCard.jsx  # Displays each interview question
│   ├── VoiceRecorder.jsx # Handles mic input & transcription
│   └── FeedbackPanel.jsx # AI feedback display
├── lib/                  # API helpers and utilities
├── public/               # Static assets
├── .env.example          # Environment variable template
└── README.md
```

---

## 💡 How It Works

1. **Pick your role** — Select a job title, domain (frontend, backend, data, etc.), and experience level
2. **Start the session** — The AI generates a curated set of interview questions for you
3. **Speak your answer** — Hit the mic button and answer out loud, just like a real interview
4. **Get AI feedback** — Your answer is transcribed and evaluated instantly for clarity, correctness, and depth
5. **View your report** — See your full session summary with scores and improvement tips

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature idea:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add: your feature description'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Kirti Pratihar**

- GitHub: [@KirtiPratihar](https://github.com/KirtiPratihar)

