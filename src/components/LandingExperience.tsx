"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowRight, CalendarDays, Check, ChevronRight, ClipboardList, FileText, HeartPulse, LockKeyhole, ShieldCheck, Sparkles, Stethoscope, UsersRound } from "lucide-react";

const workflows = [
  { id: "frontdesk", label: "Front desk", icon: UsersRound, title: "A calm start to every visit.", description: "Register patients in seconds, capture essential details, and route each visit to the right care team.", stat: "1 unified intake", panel: "Patient intake", rows: [["Patient profile", "Complete"], ["Allergy alert", "Reviewed"], ["Assigned doctor", "Dr. Sharma"]] },
  { id: "queue", label: "Clinical queue", icon: ClipboardList, title: "The right patient, at the right time.", description: "Give doctors a focused view of the patients waiting for them—without adding work for your front desk.", stat: "Live doctor queues", panel: "Today’s queue", rows: [["Meera Kapoor", "09:30 AM"], ["Rohan Das", "10:00 AM"], ["Ishita Rao", "10:15 AM"]] },
  { id: "records", label: "Clinical record", icon: FileText, title: "Everything clinicians need, in one place.", description: "Document notes, medicines, tests, and advice while keeping a clear longitudinal patient record.", stat: "Complete visit history", panel: "Consultation note", rows: [["Diagnosis", "Updated"], ["Prescription", "2 medicines"], ["Digital signature", "Ready"]] },
];

const features = [
  { icon: UsersRound, title: "Patient-centered intake", text: "One patient profile for registration, allergies, visit history, and contact details." },
  { icon: CalendarDays, title: "Scheduling that flows", text: "Book appointments, assign doctors, and keep queues up to date in real time." },
  { icon: FileText, title: "Clear clinical records", text: "Capture notes, prescriptions, tests, and signed reports without switching tools." },
  { icon: Activity, title: "Care coordination", text: "Move a patient smoothly from front desk to consultation, billing, and follow-up." },
  { icon: ShieldCheck, title: "Permissioned access", text: "Role-aware workspaces for reception, doctors, administrators, and super admins." },
  { icon: LockKeyhole, title: "Built with care", text: "A focused workspace that keeps sensitive care information organized and protected." },
];

export default function LandingExperience() {
  const [active, setActive] = useState(0);
  const workflow = workflows[active];
  const WorkflowIcon = workflow.icon;

  return (
    <div className="landing-shell -mx-6 -my-6 overflow-hidden bg-[#F6F7F3] text-[#16342D]">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#24705D] text-white shadow-[0_8px_20px_rgba(36,112,93,0.25)] transition-transform group-hover:rotate-[-6deg]"><Stethoscope size={21} /></span>
          <span><span className="block font-serif text-xl font-bold tracking-tight">EMR App</span><span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B8178]">Care, connected</span></span>
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#41675C] hover:bg-white/70 sm:block">Features</a>
          <Link href="/patient-login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#245847] hover:bg-white/70 md:block">Patient portal</Link>
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#245847] hover:bg-white/70 sm:px-4">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-[#163F35] px-3 py-2 text-sm font-bold text-white shadow-lg shadow-[#245847]/15 transition hover:-translate-y-0.5 hover:bg-[#0F3027] sm:px-4">Sign up</Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[.95fr_1.05fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl landing-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CDE1D8] bg-white/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#216450] shadow-sm"><Sparkles size={13} /> The modern clinical workspace</p>
            <h1 className="font-serif text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-[#14382F] sm:text-5xl lg:text-[4.25rem]">More focus on care.<br /><span className="text-[#28725E]">Less friction</span> everywhere else.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#567268]">EMR App connects your front desk, clinicians, appointments, records, and billing in one thoughtfully simple system.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#24705D] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,112,93,0.25)] transition hover:-translate-y-0.5 hover:bg-[#185342]">Create your workspace <ArrowRight size={16} /></Link><a href="#workflow" className="inline-flex items-center gap-2 rounded-xl border border-[#BFD3CA] bg-white/80 px-5 py-3.5 text-sm font-bold text-[#245847] transition hover:border-[#24705D] hover:bg-white">Explore the workflow <ChevronRight size={16} /></a></div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#517065]"><span className="inline-flex items-center gap-2"><Check size={16} className="text-[#28725E]" /> Built for hospitals & clinics</span><span className="inline-flex items-center gap-2"><Check size={16} className="text-[#28725E]" /> Set up in minutes</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl landing-float">
            <div className="absolute -left-7 top-16 hidden rounded-2xl border border-white/70 bg-white/85 p-3 shadow-xl backdrop-blur md:block"><div className="flex items-center gap-2"><span className="rounded-lg bg-[#DCF0E8] p-2 text-[#24705D]"><HeartPulse size={18} /></span><span><b className="block text-xs">Patient-ready</b><span className="text-[11px] text-[#698077]">Every detail in view</span></span></div></div>
            <div className="relative overflow-hidden rounded-[1.7rem] border border-[#CFE0D8] bg-[#143E34] p-3 shadow-[0_28px_70px_rgba(23,64,53,0.25)] sm:p-5">
              <div className="rounded-[1.25rem] bg-[#F8FAF8] p-4 sm:p-5"><div className="flex items-center justify-between border-b border-[#E2EAE5] pb-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCF0E8] text-[#24705D]"><WorkflowIcon size={18} /></span><div><p className="font-serif text-lg font-bold">{workflow.panel}</p><p className="text-xs text-[#6B8178]">A better day of care</p></div></div><span className="rounded-full bg-[#E6F3EC] px-2.5 py-1 text-[11px] font-bold text-[#24705D]">Live</span></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[1.25fr_.75fr]"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-[#6B8178]">Care at a glance</p><span className="h-2.5 w-2.5 rounded-full bg-[#42A878]" /></div><p className="mt-3 font-serif text-xl font-bold text-[#193E34]">{workflow.stat}</p><div className="mt-5 flex h-20 items-end gap-2">{[36, 58, 48, 76, 63, 91, 74].map((height, index) => <span key={index} className="flex-1 rounded-t-md bg-[#BFE1D1] transition-all duration-500" style={{ height: `${height}%`, opacity: index === 5 ? 1 : .62 }} />)}</div></div><div className="rounded-2xl bg-[#EAF4EE] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#638278]">Status</p><p className="mt-3 text-3xl font-bold text-[#24705D]">Good</p><p className="mt-1 text-xs leading-5 text-[#5D766C]">Your team is in sync today.</p></div></div>
                <div className="mt-4 space-y-2">{workflow.rows.map(([left, right]) => <div key={left} className="flex items-center justify-between rounded-xl border border-[#E4ECE7] bg-white px-3.5 py-3 text-sm"><span className="font-semibold text-[#264D41]">{left}</span><span className="rounded-full bg-[#EAF4EE] px-2.5 py-1 text-xs font-bold text-[#26705C]">{right}</span></div>)}</div>
              </div>
            </div>
            <div className="absolute -bottom-5 right-5 rounded-xl bg-[#EBA64C] px-4 py-3 text-[#3F2D0D] shadow-lg"><p className="text-[10px] font-bold uppercase tracking-wider">One workspace</p><p className="font-serif text-lg font-bold">Every visit, clearer.</p></div>
          </div>
        </section>

        <section id="workflow" className="border-y border-[#DCE6E0] bg-white/80 py-16 backdrop-blur-sm sm:py-20"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#28725E]">One connected workflow</p><h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.025em] text-[#173B31] sm:text-4xl">Designed around how care actually happens.</h2><p className="mt-4 text-base leading-7 text-[#637A71]">Explore the workflow and see how every handoff stays visible, clear, and accountable.</p></div><div><div className="flex flex-wrap gap-2">{workflows.map((item, index) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActive(index)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${active === index ? "bg-[#163F35] text-white shadow-lg shadow-[#163F35]/15" : "border border-[#D7E3DD] bg-white text-[#496B60] hover:border-[#75A794]"}`}><Icon size={16} />{item.label}</button>; })}</div><div className="mt-6 grid overflow-hidden rounded-2xl border border-[#DCE7E1] bg-[#F8FBF9] sm:grid-cols-[1fr_.8fr]"><div className="p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#3B856E]">{workflow.label}</p><h3 className="mt-3 font-serif text-2xl font-bold text-[#173B31]">{workflow.title}</h3><p className="mt-3 leading-7 text-[#60776E]">{workflow.description}</p><Link href="/register" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#24705D] hover:text-[#143E34]">Start building your workspace <ArrowRight size={15} /></Link></div><div className="relative min-h-48 bg-[#D8ECE3] p-6"><div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#74A993_1px,transparent_1px)] [background-size:16px_16px]" /><div className="relative rounded-2xl bg-white p-4 shadow-xl"><div className="flex items-center justify-between"><span className="rounded-lg bg-[#E5F2EC] p-2 text-[#24705D]"><WorkflowIcon size={18} /></span><span className="h-2 w-2 rounded-full bg-[#42A878]" /></div><p className="mt-5 font-serif text-lg font-bold">{workflow.panel}</p><p className="mt-1 text-xs text-[#70867D]">Simple. Visible. Connected.</p></div></div></div></div></div></div></section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#28725E]">Built for the complete care journey</p><h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.025em] text-[#173B31] sm:text-4xl">Powerful where it counts. Simple where it matters.</h2></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((feature, index) => { const Icon = feature.icon; return <article key={feature.title} className="group rounded-2xl border border-[#DCE6E0] bg-white/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-[#8ABAA7] hover:shadow-xl hover:shadow-[#2D6656]/10"><span className={`inline-flex rounded-xl p-3 ${index % 3 === 1 ? "bg-[#FFF0D7] text-[#A96F1C]" : "bg-[#E5F2EC] text-[#26715D]"}`}><Icon size={21} /></span><h3 className="mt-5 font-serif text-xl font-bold text-[#193E34]">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-[#637A71]">{feature.text}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#34745F] opacity-0 transition group-hover:opacity-100">Explore <ArrowRight size={13} /></span></article>; })}</div></section>

        <section className="mx-6 mb-16 overflow-hidden rounded-[2rem] bg-[#163F35] px-6 py-14 text-center text-white shadow-2xl shadow-[#163F35]/20 sm:mx-8 sm:mb-20 sm:px-10 lg:mx-auto lg:max-w-[calc(80rem-4rem)]"><div className="mx-auto max-w-2xl"><span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#CDE5D9]">Start with a better system</span><h2 className="mt-5 font-serif text-3xl font-bold tracking-[-0.025em] sm:text-4xl">Your care team deserves a calmer, clearer day.</h2><p className="mt-4 leading-7 text-[#C6DCD2]">Bring the everyday work of care into one place your entire team can trust.</p><Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#173F34] transition hover:-translate-y-0.5 hover:bg-[#E6F3EC]">Create your EMR workspace <ArrowRight size={16} /></Link></div></section>
      </main>
      <footer className="relative z-10 border-t border-[#DDE7E1] px-6 py-7 text-center text-sm text-[#6B8178]">© {new Date().getFullYear()} EMR App. Designed for modern care teams.</footer>
      <style jsx global>{`
        .landing-shell { min-height: 100vh; position: relative; }
        .landing-orb { pointer-events: none; position: absolute; border-radius: 9999px; filter: blur(2px); opacity: .6; }
        .landing-orb-one { width: 35rem; height: 35rem; top: -14rem; right: -10rem; background: radial-gradient(circle, #D7EFE2 0%, rgba(215,239,226,0) 68%); }
        .landing-orb-two { width: 28rem; height: 28rem; top: 28rem; left: -16rem; background: radial-gradient(circle, #F7DFAF 0%, rgba(247,223,175,0) 68%); }
        .landing-rise { animation: landing-rise .65s ease-out both; }
        .landing-float { animation: landing-rise .8s .08s ease-out both, landing-float 5s 1s ease-in-out infinite; }
        @keyframes landing-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes landing-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @media (prefers-reduced-motion: reduce) { .landing-rise, .landing-float { animation: none !important; } }
      `}</style>
    </div>
  );
}
