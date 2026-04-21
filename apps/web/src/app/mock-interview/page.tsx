"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Mic, MicOff, Video, VideoOff, Send, Bot, User, Loader2, CheckCircle, AlertTriangle, Users, Move } from "lucide-react";

const QUESTIONS = [
  "Tell me about yourself and your background in computer science.",
  "What is the difference between a stack and a queue? Give a real-world example of each.",
  "Explain what REST APIs are and how they work.",
  "What is the time complexity of binary search and why?",
  "Describe a challenging project you worked on. What was your role and what did you learn?",
  "What is the difference between SQL and NoSQL databases?",
  "How does React virtual DOM work?",
  "What are the SOLID principles in software engineering?",
];

type Message = { role: "ai" | "user"; text: string; };
type Feedback = { score: number; strengths: string[]; improvements: string[]; summary: string; };
type Alert = { type: "movement" | "multiple" | "absent"; message: string; };

// Speak text using Web Speech Synthesis
function speakText(text: string, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1.05;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("google")) || voices.find(v => v.lang === "en-US") || voices[0];
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

export default function MockInterviewPage() {
  const [started, setStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [trackingReady, setTrackingReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);
  const trackingRef = useRef<any>(null);
  const prevBoxRef = useRef<any>(null);
  const alertTimeoutRef = useRef<any>(null);
  const movementCountRef = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Load voices on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const addAlert = useCallback((alert: Alert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 4)]);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setAlerts([]), 5000);
  }, []);

  // Load BlazeFace and start tracking
  const startTracking = useCallback(async () => {
    if (!videoRef.current || trackingRef.current) return;
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const blazeface = await import("@tensorflow-models/blazeface");
      const model = await blazeface.load();
      detectorRef.current = model;
      setTrackingReady(true);

      const detect = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          trackingRef.current = requestAnimationFrame(detect);
          return;
        }
        try {
          const predictions = await model.estimateFaces(videoRef.current, false);

          // Multiple people detection
          if (predictions.length > 1) {
            addAlert({ type: "multiple", message: "Multiple people detected in frame!" });
          }

          // No face detected
          if (predictions.length === 0 && camOn) {
            addAlert({ type: "absent", message: "No face detected - please stay in frame!" });
          }

          // Movement detection
          if (predictions.length === 1) {
            const box = predictions[0].topLeft as number[];
            if (prevBoxRef.current) {
              const dx = Math.abs(box[0] - prevBoxRef.current[0]);
              const dy = Math.abs(box[1] - prevBoxRef.current[1]);
              const movement = dx + dy;
              if (movement > 18) {
                movementCountRef.current += 1;
                if (movementCountRef.current > 3) {
                  addAlert({ type: "movement", message: "Excessive movement detected - please stay still!" });
                  movementCountRef.current = 0;
                }
              } else {
                movementCountRef.current = Math.max(0, movementCountRef.current - 1);
              }
            }
            prevBoxRef.current = box;
          }
        } catch {}
        trackingRef.current = requestAnimationFrame(detect);
      };
      trackingRef.current = requestAnimationFrame(detect);
    } catch (e) {
      console.log("Tracking not available:", e);
    }
  }, [camOn, addAlert]);

  const stopTracking = useCallback(() => {
    if (trackingRef.current) {
      cancelAnimationFrame(trackingRef.current);
      trackingRef.current = null;
    }
    setTrackingReady(false);
    prevBoxRef.current = null;
    movementCountRef.current = 0;
  }, []);

  const toggleCam = async () => {
    if (camOn && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setCamOn(false);
      stopTracking();
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(s);
        setCamOn(true);
        setTimeout(() => startTracking(), 1500);
      } catch {}
    }
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (micOn) {
      recognitionRef.current?.stop();
      setMicOn(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("");
        setInput(transcript);
      };
      rec.start();
      recognitionRef.current = rec;
      setMicOn(true);
    }
  };

  const askQuestion = useCallback((index: number, delay = 0) => {
    const question = QUESTIONS[index];
    setTimeout(() => {
      setIsSpeaking(true);
      speakText(question, () => setIsSpeaking(false));
    }, delay);
  }, []);

  const startInterview = () => {
    setStarted(true);
    const firstMsg = { role: "ai" as const, text: QUESTIONS[0] };
    setMessages([firstMsg]);
    askQuestion(0, 400);
  };

  const sendAnswer = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    if (micOn) { recognitionRef.current?.stop(); setMicOn(false); }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const newMessages: Message[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    const isLast = qIndex >= QUESTIONS.length - 1;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.NEXT_PUBLIC_GROQ_API_KEY },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content: "You are a technical interviewer giving spoken feedback. Keep response to 2-3 SHORT sentences max. Be conversational and natural, as this will be read aloud. " + (isLast ? "This is the last question. End warmly." : "End by smoothly introducing this next question: " + QUESTIONS[qIndex + 1])
            },
            { role: "user", content: "Question: " + QUESTIONS[qIndex] + "\nAnswer: " + userMsg }
          ],
        }),
      });
      const data = await res.json();
      const aiText = data.choices?.[0]?.message?.content || "Good answer! Let us continue.";
      const updatedMessages = [...newMessages, { role: "ai" as const, text: aiText }];
      setMessages(updatedMessages);

      // Speak the AI feedback
      setIsSpeaking(true);
      speakText(aiText, () => {
        setIsSpeaking(false);
        if (!isLast) {
          setQIndex(qIndex + 1);
        }
      });

      if (isLast) {
        setSessionComplete(true);
        generateFinalFeedback(updatedMessages);
      }
    } catch {
      const errMsg = "Something went wrong. Please try again.";
      setMessages([...newMessages, { role: "ai" as const, text: errMsg }]);
      speakText(errMsg);
    }
    setLoading(false);
  };

  const generateFinalFeedback = async (allMessages: Message[]) => {
    try {
      const transcript = allMessages.map(m => (m.role === "ai" ? "Interviewer" : "Candidate") + ": " + m.text).join("\n");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.NEXT_PUBLIC_GROQ_API_KEY },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Analyze this interview transcript. Return ONLY JSON: {score: number 0-100, strengths: string[3], improvements: string[3], summary: string}" },
            { role: "user", content: transcript }
          ],
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const fb = JSON.parse(jsonMatch[0]);
        setFeedback(fb);
        setTimeout(() => speakText("Interview complete! Your score is " + fb.score + " out of 100. " + (fb.summary || "")), 500);
      }
    } catch {}
  };

  const resetInterview = () => {
    window.speechSynthesis.cancel();
    setStarted(false);
    setQIndex(0);
    setMessages([]);
    setFeedback(null);
    setSessionComplete(false);
    setAlerts([]);
    setIsSpeaking(false);
  };

  const alertColors: Record<string, string> = {
    movement: "border-amber-500 bg-amber-500/10 text-amber-600",
    multiple: "border-red-500 bg-red-500/10 text-red-600",
    absent: "border-orange-500 bg-orange-500/10 text-orange-600",
  };

  const alertIcons: Record<string, any> = {
    movement: Move,
    multiple: Users,
    absent: AlertTriangle,
  };

  return (
    <AppShell activePath="/mock-interview">
      <div className="space-y-4">

        {/* Header */}
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-500" /> AI Mock Interview
              </h1>
              <p className="text-slate-500 text-sm mt-1">AI speaks questions aloud. Answer by voice or text. Cheating detection active.</p>
            </div>
            {started && !sessionComplete && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Question <span className="font-bold text-cyan-500">{qIndex + 1}</span> of {QUESTIONS.length}
              </div>
            )}
          </div>
        </div>

        {/* Cheating alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const Icon = alertIcons[alert.type];
              return (
                <div key={i} className={"flex items-center gap-3 rounded-2xl border-2 px-5 py-3 font-semibold text-sm animate-pulse " + alertColors[alert.type]}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>CHEATING ALERT: {alert.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-5 py-3">
            <div className="flex gap-1">
              {[0,1,2,3].map(i => (
                <div key={i} className="w-1 bg-cyan-500 rounded-full animate-bounce" style={{ height: "16px", animationDelay: i * 100 + "ms" }} />
              ))}
            </div>
            <span className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold">AI Interviewer is speaking...</span>
          </div>
        )}

        {!started ? (
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-cyan-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ready to practice?</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              The AI interviewer will speak each question aloud. Reply by voice or text. Your camera will monitor for cheating.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto mb-8">
              {["AI Speaks Questions", "Voice Answers", "Score Report", "Cheat Detection"].map(f => (
                <div key={f} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-center text-xs font-medium text-slate-500">{f}</div>
              ))}
            </div>
            <button onClick={startInterview} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all">
              Start Interview
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_280px] gap-4">
            <div className="space-y-4">
              {/* Chat */}
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 flex flex-col" style={{ height: "460px" }}>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={"flex gap-3 " + (msg.role === "user" ? "flex-row-reverse" : "")}>
                      <div className={"w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center " + (msg.role === "ai" ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10")}>
                        {msg.role === "ai" ? <Bot className="w-4 h-4 text-cyan-500" /> : <User className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className={"max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed " + (msg.role === "ai" ? "bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10" : "bg-cyan-600 text-white")}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                        <Bot className="w-4 h-4 text-cyan-500" />
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl px-4 py-3">
                        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {!sessionComplete && (
                  <div className="border-t border-slate-200/80 dark:border-white/10 p-4">
                    <div className="flex gap-2">
                      <button onClick={toggleMic} disabled={isSpeaking}
                        className={"h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all " + (micOn ? "bg-cyan-500 border-cyan-500 text-white" : "border-slate-200 dark:border-white/10 text-slate-500 hover:border-cyan-500/30") + (isSpeaking ? " opacity-40 cursor-not-allowed" : "")}>
                        {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                      <input
                        className="flex-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:border-cyan-500/50"
                        placeholder={isSpeaking ? "Wait for AI to finish speaking..." : "Type your answer or use the mic..."}
                        value={input}
                        disabled={isSpeaking}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && !isSpeaking && sendAnswer()}
                      />
                      <button onClick={sendAnswer} disabled={!input.trim() || loading || isSpeaking}
                        className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Final report */}
              {sessionComplete && feedback && (
                <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h2 className="font-bold text-slate-900 dark:text-white">Interview Complete - Your Report</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 text-center border border-slate-200 dark:border-white/10">
                      <div className={"text-5xl font-black " + (feedback.score >= 75 ? "text-green-500" : feedback.score >= 50 ? "text-amber-500" : "text-red-500")}>{feedback.score}</div>
                      <div className="text-slate-400 text-xs mt-1">Overall Score</div>
                    </div>
                    <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4">
                      <p className="text-green-500 font-semibold text-xs uppercase tracking-wider mb-2">Strengths</p>
                      {feedback.strengths?.map((s, i) => <p key={i} className="text-slate-600 dark:text-slate-300 text-xs mb-1">+ {s}</p>)}
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                      <p className="text-red-500 font-semibold text-xs uppercase tracking-wider mb-2">To Improve</p>
                      {feedback.improvements?.map((m, i) => <p key={i} className="text-slate-600 dark:text-slate-300 text-xs mb-1">- {m}</p>)}
                    </div>
                  </div>
                  {feedback.summary && <p className="text-slate-500 text-sm mt-4 leading-relaxed">{feedback.summary}</p>}
                  <button onClick={resetInterview} className="mt-4 text-cyan-500 text-sm font-semibold hover:underline">
                    Start new interview
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Camera */}
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Camera</p>
                    {trackingReady && <p className="text-xs text-green-500 mt-0.5">Cheat detection active</p>}
                  </div>
                  <button onClick={toggleCam} className={"h-8 w-8 flex items-center justify-center rounded-xl border transition-all " + (camOn ? "bg-cyan-500 border-cyan-500 text-white" : "border-slate-200 dark:border-white/10 text-slate-500 hover:border-cyan-500/30")}>
                    {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 aspect-video flex items-center justify-center relative">
                  {camOn ? (
                    <>
                      <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />
                    </>
                  ) : (
                    <div className="text-center">
                      <VideoOff className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">Enable for cheat detection</p>
                    </div>
                  )}
                </div>
                {camOn && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={"w-2 h-2 rounded-full " + (trackingReady ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
                    <p className="text-xs text-slate-400">{trackingReady ? "Face tracking active" : "Loading face model..."}</p>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Progress</p>
                <div className="space-y-1.5">
                  {QUESTIONS.map((_, i) => (
                    <div key={i} className={"h-1.5 rounded-full transition-all " + (i < qIndex ? "bg-green-500" : i === qIndex ? "bg-cyan-500" : "bg-slate-200 dark:bg-white/10")} />
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">{qIndex} of {QUESTIONS.length} answered</p>
              </div>

              {/* Tips */}
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tips</p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                  <li>- Wait for AI to finish speaking before answering</li>
                  <li>- Use STAR method for behavioral questions</li>
                  <li>- Think out loud when solving problems</li>
                  <li>- Stay centered in camera frame</li>
                  <li>- Avoid excessive movement</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
