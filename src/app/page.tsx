import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, FileText, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const features = [
  { icon: <UsersRound size={21} />, title: "Patient management", text: "Register patients, keep their history organized, and surface allergy information when it matters." },
  { icon: <CalendarDays size={21} />, title: "Appointments & queues", text: "Schedule appointments, notify patients by email, and send each visit to the right doctor's queue." },
  { icon: <ClipboardList size={21} />, title: "Clinical workflows", text: "Capture vitals, notes, prescriptions, tests, and digitally signed consultation reports." },
  { icon: <FileText size={21} />, title: "Billing & records", text: "Create invoices, track payments, and access a complete patient record from one secure workspace." },
  { icon: <ShieldCheck size={21} />, title: "Role-based access", text: "Give front-desk staff, doctors, administrators, and super administrators the right access." },
  { icon: <Stethoscope size={21} />, title: "Built for care teams", text: "A focused, easy-to-use workspace designed around day-to-day hospital and clinic operations." },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as any).role;
    if (["ADMIN", "SUPER_ADMIN"].includes(role)) redirect("/admin");
    if (role === "DOCTOR") redirect("/doctor");
    redirect("/frontdesk");
  }

  return (
    <div className="-mx-6 -my-6 overflow-hidden bg-[#F7F5EF] text-[#17332E]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E6B5A] text-white"><Stethoscope size={21} /></span>
          <span className="font-serif text-xl font-bold tracking-tight">EMR App</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#28594D] hover:bg-[#E6EEE9] sm:px-4">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-[#2E6B5A] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#245547] sm:px-4">Sign up</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_.9fr] lg:pb-28 lg:pt-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-[#BCD4C9] bg-[#EDF5F0] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#28594D]">Modern electronic medical records</p>
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-[1.08] tracking-tight text-[#17332E] sm:text-5xl lg:text-6xl">Make every patient visit simpler, safer, and connected.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#587069]">EMR App brings registration, doctor queues, appointments, clinical notes, reports, and billing together in one secure system for hospitals and clinics.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[#2E6B5A] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#245547]">Get started <ArrowRight size={16} /></Link>
            <Link href="/login" className="rounded-lg border border-[#B8C9C1] bg-white px-5 py-3 text-sm font-bold text-[#28594D] hover:bg-[#FAFCFB]">Sign in to your workspace</Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md rounded-2xl border border-[#D5E0DA] bg-white p-5 shadow-[0_22px_55px_rgba(28,66,55,0.13)]">
          <div className="flex items-center justify-between border-b border-[#E8EEE9] pb-4"><div className="flex items-center gap-2 font-serif text-lg font-bold"><span className="h-2.5 w-2.5 rounded-full bg-[#C18A2C]" />Today&apos;s care</div><span className="rounded-full bg-[#E9F3EC] px-2.5 py-1 text-xs font-bold text-[#28594D]">Live queue</span></div>
          <div className="mt-4 space-y-3">
            {["Patient registration", "Doctor queue", "Consultation & prescription"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-[#F7F9F7] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDECE3] text-sm font-bold text-[#2E6B5A]">0{index + 1}</span><div><div className="text-sm font-bold">{item}</div><div className="text-xs text-[#6B8178]">Clear, connected workflow</div></div></div>)}
          </div>
          <div className="mt-5 rounded-xl bg-[#2E6B5A] p-4 text-white"><div className="text-xs font-semibold uppercase tracking-wider text-[#C8E0D4]">One system</div><div className="mt-1 font-serif text-xl font-bold">Built around better care.</div></div>
        </div>
      </section>

      <section className="border-y border-[#DDE6E0] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#2E6B5A]">Everything your team needs</p><h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">A practical workspace for the whole patient journey.</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((feature) => <article key={feature.title} className="rounded-xl border border-[#DDE6E0] bg-[#FCFDFC] p-5"><div className="mb-4 inline-flex rounded-lg bg-[#E5F0E9] p-2.5 text-[#2E6B5A]">{feature.icon}</div><h3 className="font-serif text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-[#61756D]">{feature.text}</p></article>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20"><h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Ready to bring your care team together?</h2><p className="mx-auto mt-3 max-w-xl text-[#61756D]">Create your hospital or clinic workspace and start managing patient care with clarity.</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#2E6B5A] px-5 py-3 text-sm font-bold text-white hover:bg-[#245547]">Create your workspace <ArrowRight size={16} /></Link></section>

      <footer className="border-t border-[#DDE6E0] px-6 py-6 text-center text-sm text-[#6B8178]">© {new Date().getFullYear()} EMR App. Electronic medical record software for modern care teams.</footer>
    </div>
  );
}
