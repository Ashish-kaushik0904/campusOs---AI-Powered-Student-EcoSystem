"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { Users, Plus, LogIn, Copy, Check, Link, ExternalLink } from "lucide-react";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PeerInterviewPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState("");

  const shareableLink = generatedId
    ? (typeof window !== "undefined" ? window.location.origin : "") + "/peer-interview/room/" + generatedId
    : "";

  const createRoom = () => {
    const id = generateRoomId();
    setGeneratedId(id);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(generatedId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const enterRoom = (id: string) => {
    if (!id.trim()) { setError("Please enter a Room ID."); return; }
    router.push("/peer-interview/room/" + id.trim().toUpperCase());
  };

  return (
    <AppShell activePath="/peer-interview">
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" /> Peer Mock Interview
          </h1>
          <p className="text-slate-500 text-sm mt-1">Practice with a friend. One interviews, one answers. Share the link to invite.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Create Room */}
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-cyan-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Create a Room</h2>
            </div>
            <p className="text-slate-500 text-sm mb-6">You will be the <strong>Interviewer</strong>. Share the link with your friend to join as Candidate.</p>

            {!generatedId ? (
              <button onClick={createRoom}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Generate Room
              </button>
            ) : (
              <div className="space-y-3">

                {/* Room ID */}
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Room ID</p>
                  <p className="text-3xl font-black text-cyan-500 tracking-widest">{generatedId}</p>
                </div>

                {/* Shareable link box */}
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1"><Link className="w-3 h-3" />Shareable Link</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all leading-relaxed">{shareableLink}</p>
                </div>

                {/* Copy buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={copyRoomId}
                    className="flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:border-cyan-500/40 transition-all">
                    {copiedId ? <><Check className="w-4 h-4 text-green-500" />Copied!</> : <><Copy className="w-4 h-4" />Copy ID</>}
                  </button>
                  <button onClick={copyLink}
                    className="flex items-center justify-center gap-2 border border-cyan-500/30 bg-cyan-500/5 rounded-xl py-2.5 text-sm text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                    {copiedLink ? <><Check className="w-4 h-4" />Copied!</> : <><ExternalLink className="w-4 h-4" />Copy Link</>}
                  </button>
                </div>

                {/* Enter as interviewer */}
                <button onClick={() => enterRoom(generatedId)}
                  className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" /> Enter Room as Interviewer
                </button>

                {/* Instructions */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">How to invite your friend:</p>
                  <ol className="text-slate-500 text-xs space-y-1">
                    <li>1. Click "Copy Link" above</li>
                    <li>2. Send it on WhatsApp / Gmail to your friend</li>
                    <li>3. They open the link and join automatically</li>
                    <li>4. You both click "Enter Room" and interview starts</li>
                  </ol>
                </div>

              </div>
            )}
          </div>

          {/* Join Room */}
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="w-4 h-4 text-violet-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Join a Room</h2>
            </div>
            <p className="text-slate-500 text-sm mb-6">Got a Room ID from your friend? Enter it below. You will be the <strong>Candidate</strong>.</p>

            <div className="space-y-3">
              <input
                value={roomId}
                onChange={e => { setRoomId(e.target.value.toUpperCase()); setError(""); }}
                placeholder="e.g. ABC123"
                maxLength={6}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-slate-800 dark:text-white outline-none focus:border-cyan-500 transition-colors"
              />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button onClick={() => enterRoom(roomId)}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Join as Candidate
              </button>

              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
                <p className="text-violet-600 dark:text-violet-400 text-xs font-semibold mb-1">Got a link instead?</p>
                <p className="text-slate-500 text-xs">If your friend sent you a full link, just open it directly in your browser. No need to enter ID manually.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4">How it works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Create Room", desc: "Click Generate Room to get a unique ID and link" },
              { step: "2", title: "Share Link", desc: "Copy the link and send to your friend on WhatsApp or Gmail" },
              { step: "3", title: "Both Join", desc: "You enter as Interviewer, friend opens link as Candidate" },
              { step: "4", title: "Interview", desc: "Live video call starts, ask questions, give feedback at end" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 font-black text-lg mx-auto mb-2">{s.step}</div>
                <p className="font-semibold text-slate-800 dark:text-white text-sm">{s.title}</p>
                <p className="text-slate-400 text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
