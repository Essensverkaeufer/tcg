import Link from "next/link";
import clsx from "clsx";
import type { CardTemplate, Rarity } from "@/types/cards";

const rarityStyle: Record<Rarity, string> = {
  COMMON: "border-slate-300 from-slate-100 to-slate-200",
  RARE: "border-sky-300 from-sky-100 to-cyan-200",
  EPIC: "border-fuchsia-300 from-fuchsia-100 to-pink-200",
  LEGENDARY: "border-amber-300 from-amber-100 to-orange-200",
  MYTHIC: "border-rose-300 from-rose-100 to-indigo-200",
  ULTRA_LEGENDARY: "border-violet-400 from-violet-100 to-yellow-200",
};

export function CardFrame({ card, href }: { card: CardTemplate; href?: string }) {
  const body = (
    <article className={clsx("flex h-full min-h-80 flex-col rounded-lg border-2 bg-gradient-to-br p-3 text-slate-950 shadow-sm", rarityStyle[card.rarity])}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-black leading-tight">{card.name}</h3>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{card.rarity} {card.cardType}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">A{card.aura}</span>
      </div>
      {card.imageUrl && !card.imageUrl.startsWith("/card-art/") ? (
        <img className="aspect-[4/3] w-full rounded-md border border-white/70 object-cover" src={card.imageUrl} alt={card.name} />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-md border border-white/70 bg-white/50 text-center text-xs font-bold uppercase text-slate-500">
          {card.name}
        </div>
      )}
      <p className="mt-3 flex-1 text-sm leading-5 text-slate-800">{card.description}</p>
      <p className="mt-2 text-xs italic text-slate-600">{card.flavorText}</p>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs font-black">
        <span className="rounded bg-white/70 px-1 py-2">ATK {card.attack}</span>
        <span className="rounded bg-white/70 px-1 py-2">HP {card.health}</span>
        <span className="rounded bg-white/70 px-1 py-2">SZ {card.size}</span>
        <span className="rounded bg-white/70 px-1 py-2">AUR {card.aura}</span>
      </div>
    </article>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
