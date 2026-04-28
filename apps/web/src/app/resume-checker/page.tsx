"use client";
import { useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { getUser, updateUserResume } from "@/lib/auth";
import { ExternalLink, Download, RefreshCw, CheckCircle, XCircle, AlertCircle, BookOpen, PlayCircle, Lightbulb, Target, TrendingUp, Award, Briefcase, FileText } from "lucide-react";

const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

const VIDEO_MAP = {
  "dsa": { title: "DSA Full Course", url: "https://www.youtube.com/watch?v=8hly31xKli0", channel: "freeCodeCamp" },
  "data structures": { title: "Data Structures", url: "https://www.youtube.com/watch?v=RBSGKlAvoiM", channel: "freeCodeCamp" },
  "algorithms": { title: "Algorithms Course", url: "https://www.youtube.com/watch?v=kgBjXUE_Nwc", channel: "freeCodeCamp" },
  "react": { title: "React Full Course", url: "https://www.youtube.com/watch?v=bMknfKXIFA8", channel: "freeCodeCamp" },
  "javascript": { title: "JavaScript Full Course", url: "https://www.youtube.com/watch?v=jS4aFq5-91M", channel: "freeCodeCamp" },
  "python": { title: "Python Full Course", url: "https://www.youtube.com/watch?v=eWRfhZUzrAc", channel: "freeCodeCamp" },
  "node": { title: "Node.js Full Course", url: "https://www.youtube.com/watch?v=Oe421EPjeBE", channel: "freeCodeCamp" },
  "sql": { title: "SQL Full Course", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", channel: "freeCodeCamp" },
  "dbms": { title: "DBMS Full Course", url: "https://www.youtube.com/watch?v=dl00fOOYLOM", channel: "Gate Smashers" },
  "system design": { title: "System Design Interview", url: "https://www.youtube.com/watch?v=i53Gi_K3o7I", channel: "Gaurav Sen" },
  "os": { title: "Operating Systems", url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p", channel: "Gate Smashers" },
  "networking": { title: "Computer Networks", url: "https://www.youtube.com/watch?v=IPvYjXCsTg8", channel: "freeCodeCamp" },
  "machine learning": { title: "ML Full Course", url: "https://www.youtube.com/watch?v=NWONeJKn9Kc", channel: "freeCodeCamp" },
  "docker": { title: "Docker Full Course", url: "https://www.youtube.com/watch?v=fqMOX6JJhGo", channel: "freeCodeCamp" },
  "git": { title: "Git & GitHub", url: "https://www.youtube.com/watch?v=RGOj5yH7evk", channel: "freeCodeCamp" },
  "java": { title: "Java Full Course", url: "https://www.youtube.com/watch?v=A74TOX803D0", channel: "freeCodeCamp" },
  "cpp": { title: "C++ Full Course", url: "https://www.youtube.com/watch?v=vLnPwxZdW4Y", channel: "freeCodeCamp" },
  "css": { title: "CSS Full Course", url: "https://www.youtube.com/watch?v=OXGznpKZ_sA", channel: "freeCodeCamp" },
  "typescript": { title: "TypeScript Full Course", url: "https://www.youtube.com/watch?v=30LWjhZzg50", channel: "freeCodeCamp" },
  "default": { title: "CS Fundamentals", url: "https://www.youtube.com/c/freecodecamp", channel: "freeCodeCamp" },
};

function getVideo(task: string) {
  const t = (task || "").toLowerCase();
  for (const key of Object.keys(VIDEO_MAP)) {
    if (key !== "default" && t.includes(key)) return VIDEO_MAP[key as keyof typeof VIDEO_MAP];
  }
  return VIDEO_MAP["default"];
}

async function analyzeResume(text: string, role: string) {
  const targetRole = role || "Software Engineer";
  const fmt = {
    score: 75,
    verdict: "One line summary",
    strengths: ["strength1", "strength2", "strength3"],
    missing: ["skill1", "skill2", "skill3"],
    priority_skills: ["most important skill to learn first", "second priority"],
    companies: [{ name: "Google", role: "SWE Intern", match: 60, reason: "why this company matches" }],
    roadmap: [{ week: "Week 1-2", task: "Learn X", resources: "resource name or link" }],
    ats_tips: ["tip1", "tip2", "tip3"],
    interview_tips: ["interview tip1", "interview tip2", "interview tip3"],
    linkedin_tips: ["linkedin tip1", "linkedin tip2"],
    project_ideas: [{ title: "Project Name", description: "What to build and why it helps", tech: "Tech stack to use" }],
    overall_grade: "B+",
    summary: "2-3 sentence detailed summary of the resume quality and what needs most improvement"
  };
  const promptText = "You are an expert ATS resume analyzer and career coach. Analyze this resume for the role: " + targetRole + ". Resume content: " + text + " Reply ONLY in this exact JSON format with no extra text or markdown: " + JSON.stringify(fmt);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GROQ_KEY },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: promptText }], max_tokens: 2048 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  return JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
}

export default function ResumeCheckerPage() {
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file);
  };

  const run = async () => {
    if (!text.trim()) { setError("Please paste your resume text first."); return; }
    if (!GROQ_KEY) { setError("API key missing! Check .env.local file"); return; }
    setError(""); setLoading(true); setResult(null); setActiveTab("overview");
    try { const r = await analyzeResume(text, role); setResult(r); updateUserResume({ resumeScore: r.score, resumeVerdict: r.verdict, resumeStrengths: r.strengths, resumeMissing: r.missing }); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  const col = (s) => s >= 75 ? "text-green-500" : s >= 50 ? "text-amber-500" : "text-red-500";
  const bgc = (s) => s >= 75 ? "bg-green-500" : s >= 50 ? "bg-amber-500" : "bg-red-500";
  const borderCol = (s) => s >= 75 ? "border-green-500/30" : s >= 50 ? "border-amber-500/30" : "border-red-500/30";

  const downloadReport = () => {
    const sep = String.fromCharCode(10);
    const parts = ["CampusOS Resume Report", "========================", "Score: " + result.score + "/100", "Grade: " + (result.overall_grade || "N/A"), "Verdict: " + result.verdict, "", "Summary:", result.summary || "", "", "STRENGTHS:"];
    (result.strengths || []).forEach(function(s) { parts.push("+ " + s); });
    parts.push(""); parts.push("MISSING SKILLS:");
    (result.missing || []).forEach(function(m) { parts.push("- " + m); });
    parts.push(""); parts.push("PRIORITY SKILLS TO LEARN:");
    (result.priority_skills || []).forEach(function(p) { parts.push("* " + p); });
    parts.push(""); parts.push("ROADMAP:");
    (result.roadmap || []).forEach(function(r) { parts.push(r.week + ": " + r.task + " | " + r.resources); });
    parts.push(""); parts.push("ATS TIPS:");
    (result.ats_tips || []).forEach(function(t) { parts.push("- " + t); });
    parts.push(""); parts.push("INTERVIEW TIPS:");
    (result.interview_tips || []).forEach(function(t) { parts.push("- " + t); });
    parts.push(""); parts.push("PROJECT IDEAS:");
    (result.project_ideas || []).forEach(function(p) { parts.push(p.title + ": " + p.description + " | Tech: " + p.tech); });
    const blob = new Blob([parts.join(sep)]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resume-report.txt";
    a.click();
  };

  const tabs = ["overview", "roadmap", "tips", "projects"];

  return (
    <AppShell activePath="/resume-checker">
      <div className="space-y-5">

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Resume Analyzer</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Deep analysis with roadmap, videos, tips and project ideas</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-slate-500 dark:text-slate-400 text-xs mb-2 block font-medium">Upload Resume (.txt)</label>
              <input type="file" accept=".txt" onChange={handleFile} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-600 dark:text-slate-300 text-sm cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:bg-cyan-600 file:text-white file:text-xs" />
            </div>
            <div className="text-center text-slate-400 text-xs">� OR paste resume text below �</div>
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your full resume text here..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-slate-700 dark:text-slate-300 text-sm resize-none focus:outline-none focus:border-cyan-500 transition-colors" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role (e.g. Full Stack Developer, Data Analyst, DevOps)" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3"><p className="text-red-400 text-sm">Error: {error}</p></div>}
            <button onClick={run} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2">
              {loading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing your resume...</>) : (<><TrendingUp className="w-4 h-4" />Analyze My Resume</>)}
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-12 text-center dark:border-white/10 dark:bg-white/5">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-cyan-500 font-semibold text-lg mb-2">AI is analyzing your resume...</p>
            <p className="text-slate-400 text-sm">Checking skills, finding gaps, matching companies, building roadmap</p>
          </div>
        )}

        {result && (
          <div className="space-y-5">

            <div className={"rounded-[2rem] border-2 " + borderCol(result.score) + " bg-white/70 p-6 dark:bg-white/5"}>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="text-center flex-shrink-0">
                  <div className={col(result.score) + " text-8xl font-black leading-none"}>{result.score}</div>
                  <div className="text-slate-400 text-xs mt-2">out of 100</div>
                  <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 mx-auto overflow-hidden">
                    <div className={bgc(result.score) + " h-full rounded-full transition-all duration-1000"} style={{ width: result.score + "%" }} />
                  </div>
                  <div className={"mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold border " + (result.score >= 75 ? "bg-green-500/10 text-green-500 border-green-500/30" : result.score >= 50 ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-red-500/10 text-red-500 border-red-500/30")}>
                    {result.score >= 75 ? "Strong Resume" : result.score >= 50 ? "Needs Work" : "Needs Major Improvement"}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-cyan-500" />
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Grade: {result.overall_grade || "N/A"}</span>
                  </div>
                  <p className="text-slate-800 dark:text-white font-bold text-lg mb-3">{result.verdict}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{result.summary}</p>
                  {(result.priority_skills || []).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Top Priority Skills to Learn</p>
                      <div className="flex flex-wrap gap-2">
                        {(result.priority_skills || []).map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold rounded-full">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={"px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap " + (activeTab === tab ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" : "bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-cyan-500/30")}>
                  {tab === "overview" && "Overview"}
                  {tab === "roadmap" && "Roadmap + Videos"}
                  {tab === "tips" && "All Tips"}
                  {tab === "projects" && "Project Ideas"}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <h3 className="text-green-500 font-semibold text-sm uppercase tracking-wider">Your Strengths</h3>
                    </div>
                    {(result.strengths || []).map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                        <p className="text-slate-700 dark:text-slate-300 text-sm">{s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <h3 className="text-red-500 font-semibold text-sm uppercase tracking-wider">Missing Skills</h3>
                    </div>
                    {(result.missing || []).map((m, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3">
                        <span className="text-red-500 mt-0.5 flex-shrink-0">-</span>
                        <p className="text-slate-700 dark:text-slate-300 text-sm">{m}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-cyan-500" />
                    <h3 className="text-slate-700 dark:text-white font-semibold text-sm uppercase tracking-wider">Company Matches</h3>
                  </div>
                  {(result.companies || []).map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl p-4 mb-3 border border-slate-100 dark:border-white/5">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-500 font-black text-sm flex-shrink-0">{c.name && c.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-800 dark:text-white font-semibold text-sm">{c.name}</div>
                        <div className="text-slate-400 text-xs">{c.role}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">{c.reason}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={col(c.match) + " font-black text-xl"}>{c.match}%</div>
                        <div className="text-slate-400 text-xs">match</div>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                          <div className={bgc(c.match) + " h-full rounded-full"} style={{ width: c.match + "%" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "roadmap" && (
              <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg">Your Learning Roadmap</h3>
                </div>
                <div className="mb-6 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                  <p className="text-cyan-600 dark:text-cyan-400 text-sm font-medium">Each step includes a recommended YouTube video to help you learn faster.</p>
                </div>
                {(result.roadmap || []).map((r, i) => {
                  const video = getVideo(r.task);
                  return (
                    <div key={i} className="flex gap-4 mb-6">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-cyan-500/30">{i + 1}</div>
                        {i < result.roadmap.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-cyan-500/40 to-transparent mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 hover:border-cyan-500/30 transition-all">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-cyan-500 text-xs font-bold uppercase tracking-wider">{r.week}</span>
                            <span className="text-xs bg-slate-100 dark:bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">Step {i + 1} of {result.roadmap.length}</span>
                          </div>
                          <h4 className="text-slate-800 dark:text-white font-bold mb-1">{r.task}</h4>
                          <p className="text-slate-500 text-sm mb-3">{r.resources}</p>
                          <a href={video.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                            <PlayCircle className="w-4 h-4" />
                            {video.title}
                            <span className="text-red-400/60">by {video.channel}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "tips" && (
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <h3 className="text-amber-500 font-semibold text-sm uppercase tracking-wider">ATS Resume Tips</h3>
                  </div>
                  {(result.ats_tips || []).map((t, i) => (
                    <div key={i} className="flex items-start gap-3 mb-3 bg-amber-500/5 rounded-xl p-3">
                      <span className="text-amber-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    <h3 className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Interview Preparation Tips</h3>
                  </div>
                  {(result.interview_tips || []).map((t, i) => (
                    <div key={i} className="flex items-start gap-3 mb-3 bg-blue-500/5 rounded-xl p-3">
                      <span className="text-blue-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-4 h-4 text-violet-500" />
                    <h3 className="text-violet-500 font-semibold text-sm uppercase tracking-wider">LinkedIn Profile Tips</h3>
                  </div>
                  {(result.linkedin_tips || []).map((t, i) => (
                    <div key={i} className="flex items-start gap-3 mb-3 bg-violet-500/5 rounded-xl p-3">
                      <span className="text-violet-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
                  <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-4">General Career Tips</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {["Apply to at least 10 jobs per week consistently", "Follow up on applications after 5-7 days", "Tailor your resume for each job description", "Build at least 2-3 strong portfolio projects", "Get your resume reviewed by a senior or mentor", "Practice DSA daily on LeetCode or HackerRank", "Join student communities on LinkedIn and Discord", "Attend virtual hackathons to build experience"].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-600 dark:text-slate-400 text-xs">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-4">
                <div className="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-cyan-500" />
                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Recommended Project Ideas</h3>
                  </div>
                  <p className="text-slate-500 text-sm mb-6">Build these projects to fill your skill gaps and impress recruiters.</p>
                  {(result.project_ideas || []).map((p, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-4 hover:border-cyan-500/30 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-500 font-black text-sm flex-shrink-0">{i + 1}</div>
                        <div className="flex-1">
                          <h4 className="text-slate-800 dark:text-white font-bold mb-1">{p.title}</h4>
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{p.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(p.tech || "").split(",").map((t, ti) => (
                              <span key={ti} className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold rounded-full">{t.trim()}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
                  <h3 className="text-slate-700 dark:text-white font-semibold mb-4 text-sm">Useful Learning Resources</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { name: "Striver DSA Sheet", url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/", color: "text-orange-500" },
                      { name: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", color: "text-blue-500" },
                      { name: "freeCodeCamp", url: "https://www.freecodecamp.org/", color: "text-green-500" },
                      { name: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/", color: "text-green-600" },
                      { name: "LeetCode Practice", url: "https://leetcode.com/problemset/all/", color: "text-yellow-500" },
                      { name: "Frontend Roadmap", url: "https://roadmap.sh/frontend", color: "text-cyan-500" },
                      { name: "Backend Roadmap", url: "https://roadmap.sh/backend", color: "text-violet-500" },
                      { name: "CS50 Harvard", url: "https://cs50.harvard.edu/x/", color: "text-red-500" },
                    ].map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 hover:border-cyan-500/30 transition-all group">
                        <ExternalLink className={"w-4 h-4 flex-shrink-0 " + link.color} />
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium group-hover:text-cyan-500 transition-colors">{link.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setResult(null); setText(""); setRole(""); }} className="flex-1 border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 text-slate-600 dark:text-slate-300 font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />Analyze Another
              </button>
              <button onClick={downloadReport} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />Download Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
