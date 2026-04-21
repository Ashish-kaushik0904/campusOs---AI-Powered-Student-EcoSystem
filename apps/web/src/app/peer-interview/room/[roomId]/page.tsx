"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Users, Wifi, WifiOff, Copy, Check } from "lucide-react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const INTERVIEW_QUESTIONS = [
  "Tell me about yourself.",
  "What is your strongest technical skill?",
  "Explain OOP concepts with examples.",
  "What is the difference between TCP and UDP?",
  "Describe a project you are proud of.",
  "How do you handle pressure and deadlines?",
  "What is Big O notation?",
  "Where do you see yourself in 5 years?",
];

type ChatMsg = { sender: string; message: string; time: string; };
type ConnectionStatus = "connecting" | "waiting" | "connected" | "disconnected" | "error";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.roomId as string).toUpperCase();

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [role, setRole] = useState<"interviewer" | "candidate" | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, notes: "" });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const setupPeerConnection = useCallback((socket: Socket) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("signal-ice", { roomId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setStatus("disconnected");
    };

    return pc;
  }, [roomId]);

  useEffect(() => {
    let socket: Socket;
    let isCreator = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setError("Camera/mic access denied. Please allow permissions.");
        setStatus("error");
        return;
      }

      socket = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("create-room", roomId);
      });

      socket.on("room-created", () => {
        isCreator = true;
        setRole("interviewer");
        setStatus("waiting");
      });

      socket.on("room-error", () => {
        if (!isCreator) {
          socket.emit("join-room", roomId);
        } else {
          setError("Room is full.");
          setStatus("error");
        }
      });

      socket.on("room-joined", () => {
        setRole("candidate");
        setStatus("waiting");
      });

      socket.on("peer-joined", async () => {
        setStatus("connected");
        if (isCreator) {
          const pc = setupPeerConnection(socket);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("signal-offer", { roomId, offer });
        }
      });

      socket.on("signal-offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
        const pc = setupPeerConnection(socket);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal-answer", { roomId, answer });
        setStatus("connected");
      });

      socket.on("signal-answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("signal-ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      });

      socket.on("chat-message", (msg: ChatMsg) => {
        setChatMsgs(prev => [...prev, msg]);
      });

      socket.on("peer-left", () => {
        setStatus("disconnected");
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      });

      socket.on("interview-ended", () => setInterviewEnded(true));
    };

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      socket?.disconnect();
    };
  }, [roomId, setupPeerConnection]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(p => !p);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(p => !p);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("chat-message", { roomId, message: chatInput.trim(), sender: role || "user" });
    setChatInput("");
  };

  const endInterview = () => {
    socketRef.current?.emit("end-interview", roomId);
    setInterviewEnded(true);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors: Record<ConnectionStatus, string> = {
    connecting: "text-amber-500",
    waiting: "text-blue-500",
    connected: "text-green-500",
    disconnected: "text-red-500",
    error: "text-red-500",
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    connecting: "Connecting...",
    waiting: "Waiting for peer to join...",
    connected: "Connected",
    disconnected: "Peer disconnected",
    error: "Error",
  };

  if (interviewEnded && !feedbackSubmitted) {
    return (
      <AppShell activePath="/peer-interview">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Interview Ended</h2>
          <p className="text-slate-500 text-sm mb-6">Leave feedback for your peer.</p>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rating (1-5)</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFeedback(f => ({ ...f, rating: n }))}
                    className={"w-10 h-10 rounded-xl border font-bold text-sm transition-all " + (feedback.rating >= n ? "bg-cyan-500 border-cyan-500 text-white" : "border-slate-200 dark:border-white/10 text-slate-400")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes for your peer</p>
              <textarea rows={4} value={feedback.notes} onChange={e => setFeedback(f => ({ ...f, notes: e.target.value }))}
                placeholder="What went well? What can they improve?"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none outline-none focus:border-cyan-500" />
            </div>
            <button onClick={() => setFeedbackSubmitted(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-xl text-sm transition-all">
              Submit Feedback
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (feedbackSubmitted) {
    return (
      <AppShell activePath="/peer-interview">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-8 text-center shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 max-w-lg mx-auto">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Great session!</h2>
          <p className="text-slate-500 text-sm mb-2">You rated this session <strong>{feedback.rating}/5</strong></p>
          {feedback.notes && <p className="text-slate-400 text-sm italic mb-6">"{feedback.notes}"</p>}
          <button onClick={() => router.push("/peer-interview")}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all">
            Start Another Session
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activePath="/peer-interview">
      <div className="space-y-4">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-cyan-500" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Room: {roomId}</span>
                  <button onClick={copyRoomId} className="text-slate-400 hover:text-cyan-500 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {status === "connected" ? <Wifi className={"w-3 h-3 " + statusColors[status]} /> : <WifiOff className={"w-3 h-3 " + statusColors[status]} />}
                  <span className={"text-xs font-medium " + statusColors[status]}>{statusLabels[status]}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {role && <span className={"text-xs font-bold px-3 py-1 rounded-full " + (role === "interviewer" ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20" : "bg-violet-500/10 text-violet-500 border border-violet-500/20")}>{role === "interviewer" ? "Interviewer" : "Candidate"}</span>}
              {error && <span className="text-red-400 text-xs">{error}</span>}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">You ({role || "..."})</div>
                {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><VideoOff className="w-8 h-8 text-slate-400" /></div>}
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">{role === "interviewer" ? "Candidate" : "Interviewer"}</div>
                {status !== "connected" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 gap-2">
                    <Users className="w-8 h-8 text-slate-500" />
                    <p className="text-slate-400 text-xs">{statusLabels[status]}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button onClick={toggleMic} className={"h-12 w-12 flex items-center justify-center rounded-2xl border transition-all " + (micOn ? "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300" : "bg-red-500 border-red-500 text-white")}>
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button onClick={toggleCam} className={"h-12 w-12 flex items-center justify-center rounded-2xl border transition-all " + (camOn ? "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300" : "bg-red-500 border-red-500 text-white")}>
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button onClick={endInterview} className="h-12 px-6 flex items-center gap-2 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all">
                <PhoneOff className="w-4 h-4" /> End Interview
              </button>
            </div>

            {role === "interviewer" && (
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Question {qIndex + 1} of {INTERVIEW_QUESTIONS.length}</p>
                <p className="text-slate-800 dark:text-white font-semibold text-sm leading-relaxed mb-4">{INTERVIEW_QUESTIONS[qIndex]}</p>
                <div className="flex gap-2">
                  <button onClick={() => setQIndex(i => Math.max(0, i - 1))} disabled={qIndex === 0}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 disabled:opacity-30 hover:border-cyan-500/30 transition-all">
                    Prev
                  </button>
                  <button onClick={() => setQIndex(i => Math.min(INTERVIEW_QUESTIONS.length - 1, i + 1))} disabled={qIndex === INTERVIEW_QUESTIONS.length - 1}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm transition-all">
                    Next Question
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 flex flex-col" style={{ height: "500px" }}>
            <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interview Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMsgs.length === 0 && <p className="text-slate-400 text-xs text-center mt-8">No messages yet.</p>}
              {chatMsgs.map((msg, i) => (
                <div key={i} className={"flex flex-col " + (msg.sender === role ? "items-end" : "items-start")}>
                  <span className="text-xs text-slate-400 mb-1">{msg.sender}</span>
                  <div className={"px-3 py-2 rounded-xl text-sm max-w-[85%] " + (msg.sender === role ? "bg-cyan-600 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300")}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-slate-200/80 dark:border-white/10 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <button onClick={sendChat} className="h-9 w-9 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition-all">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
