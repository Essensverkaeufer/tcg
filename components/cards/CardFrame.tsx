import Link from "next/link";
import clsx from "clsx";
import { resolveCardImageUrl } from "@/lib/game/card-images";
import { getRarityTheme } from "@/lib/game/rarities";
import type { CardTemplate } from "@/types/cards";

export function CardFrame({ card, href }: { card: CardTemplate; href?: string }) {
  const rarityTheme = getRarityTheme(card.rarity);
  const imageUrl = resolveCardImageUrl(card.imageUrl);
  const body = (
    <article className={clsx("tcg-card-frame interactive-card foil-hover flex h-full min-h-80 flex-col rounded-lg border-2 bg-gradient-to-br p-3 text-[#0f172a] shadow-sm", rarityTheme.card)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-black leading-tight">{card.name}</h3>
          <p className="text-xs font-bold uppercase tracking-wide text-[#475569]">{card.rarity} {card.cardType}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">A{card.aura}</span>
      </div>
      {imageUrl ? (
        <img className="card-image-zoom aspect-[4/3] w-full rounded-md border border-white/70 object-cover" src={imageUrl} alt={card.name} />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-md border border-white/70 bg-white/50 text-center text-xs font-bold uppercase text-[#64748b]">
          {card.name}
        </div>
      )}
      <p className="mt-3 flex-1 text-sm leading-5 text-[#1f2937]">{card.description}</p>
      <p className="mt-2 text-xs italic text-[#475569]">{card.flavorText}</p>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs font-black">
        <span className="rounded bg-white/80 px-1 py-2 text-[#0f172a]">ATK {card.attack}</span>
        <span className="rounded bg-white/80 px-1 py-2 text-[#0f172a]">HP {card.health}</span>
        <span className="rounded bg-white/80 px-1 py-2 text-[#0f172a]">SZ {card.size}</span>
        <span className="rounded bg-white/80 px-1 py-2 text-[#0f172a]">AUR {card.aura}</span>
      </div>
    </article>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
