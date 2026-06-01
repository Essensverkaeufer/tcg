"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Eye, PackageOpen, RotateCcw, Sparkles, Store, Zap } from "lucide-react";
import { CardFrame } from "@/components/cards/CardFrame";
import type { CardTemplate, Rarity } from "@/types/cards";

const rarityGlow: Record<Rarity, string> = {
  COMMON: "from-slate-500/25 via-slate-300/15 to-transparent",
  RARE: "from-sky-400/35 via-cyan-300/20 to-transparent",
  EPIC: "from-fuchsia-500/35 via-pink-300/20 to-transparent",
  LEGENDARY: "from-amber-400/45 via-yellow-200/25 to-transparent",
  MYTHIC: "from-rose-500/45 via-indigo-300/25 to-transparent",
  ULTRA_LEGENDARY: "from-violet-500/50 via-amber-300/30 to-transparent",
};

const rarityText: Record<Rarity, string> = {
  COMMON: "text-slate-200",
  RARE: "text-sky-200",
  EPIC: "text-fuchsia-200",
  LEGENDARY: "text-amber-200",
  MYTHIC: "text-rose-200",
  ULTRA_LEGENDARY: "text-violet-100",
};

export function PackOpeningAnimation({
  cards,
  packSlug,
  preview = false,
  rerolling = false,
  onReroll,
}: {
  cards: CardTemplate[];
  packSlug: string;
  preview?: boolean;
  rerolling?: boolean;
  onReroll?: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const hasCards = cards.length > 0;
  const currentCard = revealed > 0 ? cards[revealed - 1] : undefined;
  const nextCard = cards[revealed];
  const allRevealed = revealed >= cards.length;
  const stageGlow = useMemo(() => currentCard ? rarityGlow[currentCard.rarity] : "from-rose-500/30 via-cyan-300/15 to-transparent", [currentCard]);

  function openPack() {
    if (!hasCards || opened) return;
    setOpened(true);
  }

  function revealNextCard() {
    if (!opened || allRevealed || isRevealing) return;
    setIsRevealing(true);
    window.setTimeout(() => {
      setRevealed((current) => Math.min(cards.length, current + 1));
      setIsRevealing(false);
    }, 520);
  }

  return (
    <section data-pack-opening-root className="overflow-hidden rounded-lg border border-slate-900 bg-slate-950 text-white shadow-2xl">
      <div className="relative min-h-[680px] p-4 sm:p-6">
        <div className={clsx("absolute inset-0 bg-gradient-to-br", stageGlow)} aria-hidden />
        <div className="absolute inset-0 pack-stage-grid opacity-50" aria-hidden />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[300px_1fr_280px]">
          <aside className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
            <button
              type="button"
              onClick={openPack}
              aria-label="Open pack"
              data-testid="open-pack-button"
              disabled={!hasCards || opened}
              className={clsx(
                "relative grid aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-white/25 bg-gradient-to-br from-rose-700 via-slate-900 to-cyan-950 shadow-2xl transition",
                !opened && hasCards && "pack-hover",
                opened && "pack-opened",
                !hasCards && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="absolute inset-x-5 top-5 h-px bg-white/40" aria-hidden />
              <span className="absolute inset-y-8 left-8 w-px bg-white/20" aria-hidden />
              <span className="absolute inset-y-8 right-8 w-px bg-white/20" aria-hidden />
              <span className="absolute bottom-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-amber-300/25 blur-2xl" aria-hidden />
              <span className="m-auto text-center">
                <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/15">
                  {opened ? <PackageOpen className="h-8 w-8" aria-hidden /> : <Zap className="h-8 w-8" aria-hidden />}
                </span>
                <span className="block text-5xl font-black">PACK</span>
                <span className="mt-3 block text-xs font-black uppercase tracking-[0.28em] text-white/75">
                  {opened ? "seal broken" : "open"}
                </span>
              </span>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-black uppercase tracking-wide">
              <div className="rounded-md bg-black/30 p-3">
                <div className="text-white/50">Cards</div>
                <div className="mt-1 text-lg">{cards.length}</div>
              </div>
              <div className="rounded-md bg-black/30 p-3">
                <div className="text-white/50">Seen</div>
                <div data-pack-seen-counter className="mt-1 text-lg">{revealed}</div>
              </div>
            </div>
            <div data-pack-actions>
              {allRevealed ? (
                <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={onReroll}
                  data-testid="reroll-pack-button"
                  disabled={rerolling}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {rerolling ? "Buying..." : preview ? "Reroll Preview" : "Buy Another Pack"}
                </button>
                <Link
                  href="/packs"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
                >
                  <Store className="h-4 w-4" aria-hidden />
                  Back To Packs
                </Link>
              </div>
              ) : null}
            </div>
          </aside>

          <main className="rounded-lg border border-white/10 bg-black/30 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Opening Chamber</h2>
                <p className="text-sm text-white/60">Reveal cards one at a time. No guarantees, just the roll.</p>
                {preview ? <p className="mt-1 text-xs font-black uppercase tracking-wide text-amber-200">Preview only - these cards are not saved.</p> : null}
              </div>
              <span data-pack-status-badge className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-white/70">
                {allRevealed ? "complete" : opened ? "armed" : "sealed"}
              </span>
            </div>

            <div data-pack-card-stage className="mt-5 grid min-h-[470px] place-items-center rounded-lg border border-white/10 bg-slate-950/70 p-4">
              {!opened ? (
                <CardBack label="Open the pack to start" />
              ) : isRevealing ? (
                <div className="reveal-charge grid text-center">
                  <Sparkles className="mx-auto h-16 w-16 text-amber-200" aria-hidden />
                  <div className="mt-4 text-2xl font-black uppercase tracking-widest">Rolling...</div>
                </div>
              ) : currentCard ? (
                <div className="revealed-card w-full max-w-sm">
                  <CardFrame card={currentCard} />
                </div>
              ) : (
                <CardBack label="First card is waiting" />
              )}
            </div>

            <button
              type="button"
              onClick={revealNextCard}
              data-testid="reveal-next-card-button"
              disabled={!opened || allRevealed || isRevealing}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-300 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
            >
              <Eye className="h-4 w-4" aria-hidden />
              {allRevealed ? "All Cards Revealed" : isRevealing ? "Revealing" : nextCard ? `Reveal Card ${revealed + 1}` : "Reveal"}
            </button>
          </main>

          <aside className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
            <h3 className="text-lg font-black">Pulls</h3>
            <div className="mt-4 space-y-3">
              {cards.map((card, index) => {
                const isVisible = index < revealed;
                return (
                  <div
                    key={`${card.slug}-${index}`}
                    data-pack-pull-index={index}
                    data-card-name={card.name}
                    data-card-rarity={card.rarity}
                    className={clsx(
                      "rounded-md border p-3 transition",
                      isVisible ? "border-white/20 bg-white/15" : "border-white/10 bg-black/25",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black">Card {index + 1}</span>
                      <span className={clsx("text-xs font-black", isVisible ? rarityText[card.rarity] : "text-white/35")}>
                        {isVisible ? card.rarity.replace("_", " ") : "HIDDEN"}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm text-white/70">
                      {isVisible ? card.name : "???"}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              const root = document.querySelector('[data-pack-opening-root]');
              if (!root || root.dataset.nativeReady === 'true') return;
              root.dataset.nativeReady = 'true';
              const cards = ${JSON.stringify(cards.map((card) => ({
                name: card.name,
                rarity: card.rarity,
                cardType: card.cardType,
                attack: card.attack,
                health: card.health,
                size: card.size,
                aura: card.aura,
                description: card.description,
              })))};
              const packSlug = ${JSON.stringify(packSlug)};
              const preview = ${JSON.stringify(preview)};
              let opened = false;
              let revealed = 0;
              const openButton = root.querySelector('[data-testid="open-pack-button"]');
              const revealButton = root.querySelector('[data-testid="reveal-next-card-button"]');
              const stage = root.querySelector('[data-pack-card-stage]');
              const seenCounter = root.querySelector('[data-pack-seen-counter]');
              const statusBadge = root.querySelector('[data-pack-status-badge]');
              const actionSlot = root.querySelector('[data-pack-actions]');
              const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
              })[char]);
              const updateControls = () => {
                const complete = revealed >= cards.length;
                if (seenCounter) seenCounter.textContent = String(revealed);
                if (statusBadge) statusBadge.textContent = complete ? 'complete' : opened ? 'armed' : 'sealed';
                if (revealButton) {
                  revealButton.disabled = !opened || complete;
                  revealButton.textContent = complete ? 'All Cards Revealed' : opened ? 'Reveal Card ' + (revealed + 1) : 'Reveal Card 1';
                }
                if (complete && actionSlot && !actionSlot.dataset.nativeFilled) {
                  actionSlot.dataset.nativeFilled = 'true';
                  const rerollUrl = new URL(location.href);
                  rerollUrl.searchParams.set('reroll', String(Date.now()));
                  if (preview) {
                    actionSlot.innerHTML = '<a href="' + rerollUrl.pathname + rerollUrl.search + '" class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-200">Reroll Preview</a><a href="/packs" class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15">Back To Packs</a>';
                  } else {
                    actionSlot.innerHTML = '<button type="button" data-native-reroll class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-200">Buy Another Pack</button><a href="/packs" class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15">Back To Packs</a>';
                    actionSlot.querySelector('[data-native-reroll]')?.addEventListener('click', async (event) => {
                      const button = event.currentTarget;
                      button.disabled = true;
                      button.textContent = 'Buying...';
                      try {
                        const response = await fetch('/api/packs/open', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'same-origin',
                          body: JSON.stringify({ packSlug })
                        });
                        const payload = await response.json();
                        if (!response.ok) throw new Error(payload.error || 'Could not reroll pack.');
                        sessionStorage.setItem('lastPackOpening', JSON.stringify({ packSlug, cards: payload.cards }));
                        location.href = '/packs/opening?pack=' + encodeURIComponent(packSlug) + '&source=purchase';
                      } catch (error) {
                        button.disabled = false;
                        button.textContent = error instanceof Error ? error.message : 'Could not reroll pack.';
                      }
                    });
                  }
                }
              };
              const updateStage = () => {
                if (!stage) return;
                if (!opened) return;
                const card = cards[revealed - 1];
                if (!card) {
                  stage.innerHTML = '<div class="card-back-big grid aspect-[5/7] w-full max-w-sm place-items-center rounded-lg border-2 border-white/20 bg-gradient-to-br from-slate-800 via-slate-950 to-cyan-950 p-6 text-center shadow-2xl"><div><div class="text-5xl font-black">?</div><div class="mt-4 text-sm font-black uppercase tracking-[0.25em] text-white/60">First card is waiting</div></div></div>';
                  return;
                }
                stage.innerHTML = '<article class="w-full max-w-sm rounded-lg border-2 border-amber-300 bg-gradient-to-br from-slate-100 to-slate-200 p-4 text-slate-950"><h3 class="text-xl font-black">' + escapeHtml(card.name) + '</h3><p class="mt-1 text-xs font-black uppercase text-slate-600">' + escapeHtml(card.rarity) + ' ' + escapeHtml(card.cardType) + '</p><div class="mt-4 grid aspect-[4/3] place-items-center rounded-md bg-white/70 text-center text-xs font-bold uppercase text-slate-500">' + escapeHtml(card.name) + '</div><p class="mt-3 text-sm">' + escapeHtml(card.description || '') + '</p><div class="mt-3 grid grid-cols-4 gap-1 text-center text-xs font-black"><span class="rounded bg-white px-1 py-2">ATK ' + escapeHtml(card.attack) + '</span><span class="rounded bg-white px-1 py-2">HP ' + escapeHtml(card.health) + '</span><span class="rounded bg-white px-1 py-2">SZ ' + escapeHtml(card.size) + '</span><span class="rounded bg-white px-1 py-2">AUR ' + escapeHtml(card.aura) + '</span></div></article>';
              };
              const updatePulls = () => {
                root.querySelectorAll('[data-pack-pull-index]').forEach((row) => {
                  const index = Number(row.getAttribute('data-pack-pull-index'));
                  const visible = index < revealed;
                  const card = cards[index];
                  const rarity = row.querySelector('.text-xs.font-black');
                  const name = row.querySelector('.mt-1.truncate');
                  if (rarity) rarity.textContent = visible ? card.rarity.replace('_', ' ') : 'HIDDEN';
                  if (name) name.textContent = visible ? card.name : '???';
                });
              };
              openButton?.addEventListener('click', () => {
                opened = true;
                openButton.disabled = true;
                updateStage();
                updateControls();
              });
              revealButton?.addEventListener('click', () => {
                if (!opened || revealed >= cards.length) return;
                revealed += 1;
                updateStage();
                updatePulls();
                updateControls();
              });
              updateControls();
            })();
          `,
        }}
      />
    </section>
  );
}

function CardBack({ label }: { label: string }) {
  return (
    <div className="card-back-big grid aspect-[5/7] w-full max-w-sm place-items-center rounded-lg border-2 border-white/20 bg-gradient-to-br from-slate-800 via-slate-950 to-cyan-950 p-6 text-center shadow-2xl">
      <div>
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-cyan-200" aria-hidden />
        <div className="text-5xl font-black">?</div>
        <div className="mt-4 text-sm font-black uppercase tracking-[0.25em] text-white/60">{label}</div>
      </div>
    </div>
  );
}
