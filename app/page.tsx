import Link from "next/link";
import { ArrowRight, Boxes, Gift, Shield, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const pillars = [
  { title: "Expandable Cards", text: "CardTemplate data drives stats, rarity, card type, and custom ability JSON.", icon: Boxes },
  { title: "Custom Stats", text: "Cards track Attack, Health, Size, and Aura as flexible combat stats.", icon: Shield },
  { title: "Gacha Packs", text: "Five-card packs use weighted rarity rolls without guaranteed drops.", icon: Gift },
  { title: "Real-Time Ready", text: "Socket.IO rooms keep match state server-authoritative and synchronized.", icon: Swords },
];

export default function Home() {
  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto grid min-h-[88vh] max-w-7xl content-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px]">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-widest text-rose-600">Custom online trading card game</p>
            <h1 className="mt-4 text-5xl font-black tracking-normal sm:text-7xl">Cards and Pedophiles</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              A local Next.js foundation for accounts, collections, gacha packs, deck building, real-time matches, and friend-specific card abilities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                Enter Prototype
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/collection" className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100">
                View Cards
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <pillar.icon className="h-5 w-5 text-rose-600" aria-hidden />
                <h2 className="mt-3 font-black">{pillar.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
