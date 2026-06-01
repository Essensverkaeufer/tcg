import { CheckCircle2 } from "lucide-react";
import { deckRules, validateDeck } from "@/lib/game/decks/validateDeck";
import { cardCatalog } from "@/lib/game/cards";

export function DeckRulesPanel() {
  const sampleDeck = cardCatalog.slice(0, 6).map((card) => ({ card, quantity: card.cardType === "LEADER" ? 1 : 2 }));
  const validation = validateDeck(sampleDeck);

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Prototype Deck Rules</h2>
      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>Minimum deck size: {deckRules.minDeckSize}</p>
        <p>Leader cards: {deckRules.leaders}</p>
        <p>Non-leader copies: {deckRules.maxCopies}</p>
        <p>Legendary+ copies: {deckRules.maxHighRarityCopies}</p>
        <p>Opening hand: 5 cards</p>
        <p>Maximum hand size: 5 cards</p>
      </div>
      <div className="mt-4 rounded-md bg-slate-100 p-3 text-sm">
        <div className="flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
          Validator wired
        </div>
        <p className="mt-1 text-slate-600">{validation.valid ? "Sample deck passes the minimum size rule." : validation.errors[0]}</p>
      </div>
    </aside>
  );
}
