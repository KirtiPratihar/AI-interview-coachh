import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Video, Play, CheckCircle, AlertCircle, Loader2, ChevronRight, RefreshCw, Star, Brain, ShieldCheck, Timer, Volume2, Settings2, UserCircle, Briefcase, GraduationCap, LogOut, History, LayoutDashboard, Clock } from 'lucide-react';
import CameraView, { CameraViewHandle } from './CameraView';
import { generateQuestions, analyzeResponse, speakQuestion, InterviewQuestion, InterviewFeedback } from '../lib/gemini';
import { auth, loginWithGoogle, logout, saveSession, subscribeToSessions, SessionData } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';

type InterviewState = 'welcome' | 'setup' | 'questioning' | 'analyzing' | 'feedback' | 'history';

const TOPICS = ["AI & Machine Learning", "Frontend Development", "Backend Systems", "Data Structures & Algorithms", "Behavioral & Leadership"];
const DIFFICULTIES = ["Junior", "Mid-Level", "Senior"];

const InterviewSession: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<InterviewState>('welcome');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [feedbacks, setFeedbacks] = useState<InterviewFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<string[][]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTIES[0]);
  const [history, setHistory] = useState<SessionData[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<SessionData | null>(null);
  
  const cameraRef = useRef<CameraViewHandle>(null);
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        subscribeToSessions(u.uid, (sessions) => {
          setHistory(sessions);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopAnswering();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const qs = await generateQuestions(selectedDifficulty, selectedTopic);
      setQuestions(qs);
      setState('questioning');
      playQuestionVoice(qs[0].text);
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const playQuestionVoice = async (text: string) => {
    const base64Audio = await speakQuestion(text);
    if (base64Audio) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768.0;
        }
        const buffer = audioContext.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
      } catch (err) {
        console.error("Error playing TTS audio:", err);
      }
    }
  };

  const startAnswering = () => {
    setIsRecording(true);
    setTimeLeft(120);
    setSnapshots([]);
    cameraRef.current?.startRecording();
    
    snapshotIntervalRef.current = setInterval(() => {
      const snapshot = cameraRef.current?.takeSnapshot();
      if (snapshot) {
        setSnapshots(prev => [...prev.slice(-4), snapshot]);
      }
    }, 3000);
  };

  const stopAnswering = async () => {
    setIsRecording(false);
    if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    
    setLoading(true);
    const audioBase64 = await cameraRef.current?.stopRecording();
    
    if (audioBase64) {
      try {
        const feedback = await analyzeResponse(
          questions[currentQuestionIndex].text,
          audioBase64,
          snapshots
        );
        const updatedFeedbacks = [...feedbacks, feedback];
        setFeedbacks(updatedFeedbacks);
        setAllSnapshots(prev => [...prev, snapshots]);
        
        if (currentQuestionIndex < questions.length - 1) {
          const nextIdx = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIdx);
          playQuestionVoice(questions[nextIdx].text);
        } else {
          // Final question done, save to Firebase
          if (user) {
            const avgScore = Math.round(updatedFeedbacks.reduce((acc, f) => acc + f.score, 0) / updatedFeedbacks.length);
            await saveSession({
              userId: user.uid,
              topic: selectedTopic,
              difficulty: selectedDifficulty,
              score: avgScore,
              feedbacks: updatedFeedbacks.map((f, i) => ({
                ...f,
                question: questions[i].text
              }))
            });
          }
          setState('feedback');
        }
      } catch (err) {
        setError("Failed to analyze your response. Let's try the next question.");
        if (currentQuestionIndex < questions.length - 1) {
          const nextIdx = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIdx);
          playQuestionVoice(questions[nextIdx].text);
        } else {
          setState('feedback');
        }
      }
    }
    setLoading(false);
  };

  const resetInterview = () => {
    setState('welcome');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setFeedbacks([]);
    setAllSnapshots([]);
    setError(null);
    setTimeLeft(120);
    setSelectedHistorySession(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-12 border-b border-zinc-800 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="text-zinc-950" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Interview Coach</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setState('history')}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                >
                  <History size={16} /> History
                </button>
                <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                  <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-medium">{user.displayName?.split(' ')[0]}</span>
                </div>
                <button onClick={logout} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors"
              >
                <UserCircle size={18} /> Sign In
              </button>
            )}
            {state !== 'welcome' && (
              <button 
                onClick={resetInterview}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
              >
                <RefreshCw size={16} /> Reset
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {state === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="mb-8 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-500/20">
                <ShieldCheck size={16} />
                Private & Secure AI Analysis
              </div>
              <h2 className="text-6xl font-extrabold mb-6 leading-tight">
                Level up your <span className="text-emerald-500">Interview Game</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-12 leading-relaxed">
                Experience a realistic interview simulation. Our AI evaluates your technical accuracy, vocal confidence, and body language to help you land your dream job.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                {[
                  { icon: <Video size={20} />, title: "Visual Analysis", desc: "Body language, eye contact & posture" },
                  { icon: <Volume2 size={20} />, title: "Voice Analysis", desc: "Tone, pace, clarity & confidence" },
                  { icon: <CheckCircle size={20} />, title: "Content Review", desc: "Technical accuracy & STAR method" }
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-emerald-500/30 transition-colors">
                    <div className="text-emerald-500 mb-4">{item.icon}</div>
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {!user ? (
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 max-w-md mx-auto">
                  <h3 className="text-xl font-bold mb-4">Ready to start?</h3>
                  <p className="text-zinc-500 text-sm mb-6">Sign in to save your progress and track your improvement over time.</p>
                  <button
                    onClick={loginWithGoogle}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all active:scale-95"
                  >
                    <UserCircle size={24} />
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setState('setup')}
                  className="group relative inline-flex items-center gap-3 bg-zinc-100 text-zinc-950 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white transition-all active:scale-95"
                >
                  <Play fill="currentColor" size={24} />
                  Start Session
                </button>
              )}
            </motion.div>
          )}

          {state === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto space-y-12"
            >
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Configure Your Session</h2>
                <p className="text-zinc-400">Select your target role and experience level.</p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Interview Topic</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {TOPICS.map(topic => (
                      <button
                        key={topic}
                        onClick={() => setSelectedTopic(topic)}
                        className={`p-4 rounded-xl border text-left transition-all ${selectedTopic === topic ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                      >
                        <div className="font-bold">{topic}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Experience Level</label>
                  <div className="flex gap-4">
                    {DIFFICULTIES.map(diff => (
                      <button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`flex-1 p-4 rounded-xl border transition-all ${selectedDifficulty === diff ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                      >
                        <div className="font-bold">{diff}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={startInterview}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-zinc-950 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <ChevronRight size={24} />}
                {loading ? 'Generating Questions...' : 'Start Interview'}
              </button>
            </motion.div>
          )}

          {state === 'questioning' && (
            <motion.div
              key="questioning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <CameraView ref={cameraRef} isRecording={isRecording} />
                
                <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-500 font-mono text-sm font-bold uppercase tracking-widest">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <button 
                        onClick={() => playQuestionVoice(questions[currentQuestionIndex].text)}
                        className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
                        title="Play Question Audio"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                    {isRecording && (
                      <div className={`flex items-center gap-2 font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`}>
                        <Timer size={18} />
                        {formatTime(timeLeft)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-10 leading-snug">
                    {questions[currentQuestionIndex]?.text}
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    {!isRecording ? (
                      <button
                        onClick={startAnswering}
                        className="flex-1 flex items-center justify-center gap-3 bg-emerald-500 text-zinc-950 py-5 rounded-xl font-bold text-lg hover:bg-emerald-400 transition-all active:scale-95"
                      >
                        <Mic size={24} /> Start Answering
                      </button>
                    ) : (
                      <button
                        onClick={stopAnswering}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 bg-red-500 text-white py-5 rounded-xl font-bold text-lg hover:bg-red-400 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
                        {loading ? 'Analyzing...' : 'Submit Answer'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Star size={18} className="text-emerald-500" /> Interview Tips
                  </h4>
                  <ul className="space-y-4 text-sm text-zinc-400">
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      Look directly into the camera lens to simulate eye contact.
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      Take a deep breath before starting your answer.
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      Structure your answer: Situation, Task, Action, Result.
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      Try to minimize filler words like "um" and "ah".
                    </li>
                  </ul>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Settings2 size={18} className="text-zinc-500" /> Session Info
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Topic:</span>
                      <span className="text-zinc-300 font-bold">{selectedTopic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Level:</span>
                      <span className="text-zinc-300 font-bold">{selectedDifficulty}</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 text-red-400 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {state === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-12"
            >
              <div className="text-center mb-12">
                <h2 className="text-5xl font-extrabold mb-4">Performance Report</h2>
                <p className="text-zinc-400 text-lg">Comprehensive analysis of your {selectedTopic} session.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">
                  <div className="text-5xl font-black text-emerald-500 mb-2">
                    {Math.round(feedbacks.reduce((acc, f) => acc + f.score, 0) / feedbacks.length)}
                    <span className="text-2xl text-zinc-600">/10</span>
                  </div>
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Overall Score</div>
                </div>
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">
                  <div className="text-2xl font-bold text-zinc-100 mb-2">
                    {feedbacks[feedbacks.length - 1]?.confidence || 'N/A'}
                  </div>
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Confidence</div>
                </div>
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">
                  <div className="text-2xl font-bold text-zinc-100 mb-2">
                    {feedbacks[feedbacks.length - 1]?.nervousness || 'N/A'}
                  </div>
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Nervousness</div>
                </div>
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">
                  <div className="text-2xl font-bold text-zinc-100 mb-2">
                    {selectedDifficulty}
                  </div>
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Level Tested</div>
                </div>
              </div>

              <div className="space-y-12">
                {feedbacks.map((f, i) => (
                  <div key={i} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
                    <div className="bg-zinc-800/50 px-8 py-6 flex items-center justify-between border-b border-zinc-800">
                      <h4 className="font-bold text-lg flex items-center gap-4">
                        <span className="w-8 h-8 bg-emerald-500 text-zinc-950 rounded-lg flex items-center justify-center text-sm font-black">{i + 1}</span>
                        {questions[i]?.text}
                      </h4>
                      <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-sm font-black border border-emerald-500/20">
                        SCORE: {f.score}/10
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-10">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                          <div>
                            <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <ShieldCheck size={16} className="text-emerald-500" /> Answer Correctness
                            </h5>
                            <div className="prose prose-invert prose-sm max-w-none text-zinc-300 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                              <ReactMarkdown>{f.answerCorrectness}</ReactMarkdown>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Executive Summary</h5>
                            <p className="text-zinc-300 leading-relaxed italic">"{f.overallSummary}"</p>
                          </div>
                        </div>
                        <div className="space-y-8">
                          <div>
                            <h5 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-4">Key Strengths</h5>
                            <div className="grid grid-cols-1 gap-3">
                              {f.strengths.map((s, si) => (
                                <div key={si} className="bg-emerald-500/5 text-emerald-400 px-5 py-3 rounded-xl text-sm border border-emerald-500/10 flex items-center gap-3">
                                  <CheckCircle size={14} /> {s}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Areas for Improvement</h5>
                            <div className="grid grid-cols-1 gap-3">
                              {f.improvements.map((imp, imi) => (
                                <div key={imi} className="bg-amber-500/5 text-amber-400 px-5 py-3 rounded-xl text-sm border border-amber-500/10 flex items-center gap-3">
                                  <AlertCircle size={14} /> {imp}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-12">
                <button
                  onClick={resetInterview}
                  className="flex items-center gap-3 bg-zinc-100 text-zinc-950 px-12 py-5 rounded-2xl font-bold text-lg hover:bg-white transition-all active:scale-95 shadow-xl shadow-white/5"
                >
                  <RefreshCw size={20} /> Start New Session
                </button>
              </div>
            </motion.div>
          )}

          {state === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Interview History</h2>
                  <p className="text-zinc-500">Track your progress over time.</p>
                </div>
                <button 
                  onClick={() => setState('welcome')}
                  className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl text-sm font-bold border border-zinc-800 hover:bg-zinc-800 transition-colors"
                >
                  <LayoutDashboard size={18} /> Dashboard
                </button>
              </div>

              {selectedHistorySession ? (
                <div className="space-y-8">
                  <button 
                    onClick={() => setSelectedHistorySession(null)}
                    className="text-emerald-500 text-sm font-bold hover:underline mb-4"
                  >
                    ← Back to History List
                  </button>
                  <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-bold">{selectedHistorySession.topic}</h3>
                        <p className="text-zinc-500">{selectedHistorySession.difficulty} Level • {new Date(selectedHistorySession.timestamp?.toDate()).toLocaleDateString()}</p>
                      </div>
                      <div className="text-4xl font-black text-emerald-500">
                        {selectedHistorySession.score}<span className="text-xl text-zinc-600">/10</span>
                      </div>
                    </div>
                    <div className="space-y-8">
                      {selectedHistorySession.feedbacks.map((f, i) => (
                        <div key={i} className="border-t border-zinc-800 pt-8">
                          <h4 className="font-bold mb-4">{f.question}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="prose prose-invert prose-sm text-zinc-400">
                              <ReactMarkdown>{f.answerCorrectness}</ReactMarkdown>
                            </div>
                            <div className="space-y-4">
                              <div className="text-sm"><span className="text-zinc-500">Confidence:</span> {f.confidence}</div>
                              <div className="text-sm"><span className="text-zinc-500">Nervousness:</span> {f.nervousness}</div>
                              <p className="text-sm italic text-zinc-500">"{f.overallSummary}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                      <Clock size={48} className="mx-auto text-zinc-700 mb-4" />
                      <p className="text-zinc-500">No sessions recorded yet. Start your first interview!</p>
                    </div>
                  ) : (
                    history.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedHistorySession(session)}
                        className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-left hover:border-emerald-500/50 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold">
                            {session.score}/10
                          </div>
                          <span className="text-xs text-zinc-600">
                            {session.timestamp?.toDate() ? new Date(session.timestamp.toDate()).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        <h3 className="font-bold mb-1 group-hover:text-emerald-400 transition-colors">{session.topic}</h3>
                        <p className="text-xs text-zinc-500 mb-4">{session.difficulty} Level</p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                          <span>{session.feedbacks.length} Questions</span>
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InterviewSession;
