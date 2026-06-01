import { CardFrame } from "@/components/cards/CardFrame";
import type { CardTemplate } from "@/types/cards";

export function CardGrid({ cards }: { cards: CardTemplate[] }) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-black">No cards added yet</h2>
        <p className="mt-2 text-sm text-slate-600">The real card list will appear here once it is added to the catalog.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <CardFrame key={card.slug} card={card} href={`/cards/${card.slug}`} />
      ))}
    </div>
  );
}
