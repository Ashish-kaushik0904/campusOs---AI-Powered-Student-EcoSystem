import { Bell, Search } from "lucide-react";
import { AIChatbot } from "@/components/app/ai-chatbot";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Digital ID" },
  { href: "/jobs", label: "Jobs" },
  { href: "/resources", label: "Resources" },
  { href: "/scam-checker", label: "Scam Checker" },
  { href: "/resume-checker", label: "Resume Checker" },
  { href: "/mock-interview", label: "Mock Interview" },
  { href: "/peer-interview", label: "Peer Interview" },
];

export function AppShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.13),_transparent_40%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_50%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_30%),linear-gradient(180deg,#020617_0%,#07111f_60%,#020617_100%)]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-4 md:grid-cols-[280px_1fr] md:px-8">
        <aside className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <Logo />
          <div className="mt-10 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                  activePath === item.href
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/8",
                )}
              >
                {item.label}
                {item.href === "/mock-interview" && (
                  <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-500 px-1.5 py-0.5 rounded-full">New</span>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-[1.8rem] bg-[linear-gradient(180deg,#0f172a,#0f3b57)] p-5 text-white">
            <p className="text-sm font-semibold text-cyan-200">CampusOS Pro Signal</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Verified students are prioritized for trusted opportunity matching and scam defense alerts.
            </p>
          </div>
        </aside>
        <main className="space-y-6 relative">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200/80 bg-white/70 px-6 py-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Search className="h-4 w-4" />
              Search jobs, notes, scams, and community signals
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <Bell className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
          {children}
        </main>
      </div>
      <AIChatbot />
    </div>
  );
}
