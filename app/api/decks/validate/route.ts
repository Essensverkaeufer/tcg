import { NextResponse } from "next/server";
import { z } from "zod";
import { getCardBySlug } from "@/lib/game/cards";
import { validateDeck } from "@/lib/game/decks/validateDeck";

const requestSchema = z.object({
  cards: z.array(z.object({ slug: z.string(), quantity: z.number().int().positive() })),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ valid: false, errors: ["Invalid deck payload."] }, { status: 400 });
  }

  const deckCards = parsed.data.cards
    .map((entry) => {
      const card = getCardBySlug(entry.slug);
      return card ? { card, quantity: entry.quantity } : undefined;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return NextResponse.json(validateDeck(deckCards));
}
