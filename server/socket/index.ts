import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Server, type Socket } from "socket.io";
import WebSocket from "ws";
import { applyAction, createMatchState } from "@/lib/game/match/state";
import { createMatchView } from "@/lib/game/match/view";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { validateDeck } from "@/lib/game/decks/validateDeck";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { CardTemplate } from "@/types/cards";
import type { MatchAction, MatchState } from "@/types/match";
import type { Json } from "@/types/supabase";

type DeckRow = {
  id: string;
  name: string;
  deck_cards?: Array<{
    quantity: number;
    card_templates: Parameters<typeof cardRowToTemplate>[0] | null;
  }>;
};

type QueuedPlayer = {
  userId: string;
  displayName: string;
  deckId: string;
  deck: CardTemplate[];
  socketId: string;
  ticketId?: string;
};

type ActiveMatch = {
  id: string;
  state: MatchState;
  players: [QueuedPlayer, QueuedPlayer];
  lastActionSeq: Record<string, number>;
  turnTimer?: NodeJS.Timeout;
};

const queue: QueuedPlayer[] = [];
const matches = new Map<string, ActiveMatch>();
const userToMatch = new Map<string, string>();
const socketToUser = new Map<string, string>();

loadLocalEnv();
if (!globalThis.WebSocket) {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}
const supabase = createServiceSupabaseClient();

const serverId = process.env.REALTIME_SERVER_ID ?? "local-dev";
const turnMs = Number(process.env.REALTIME_TURN_MS ?? 90_000);

export function createSocketServer(port = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3001)) {
  const httpServer = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        ok: true,
        serverId,
        queue: queue.length,
        matches: matches.size,
      }));
      return;
    }

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("Cards realtime server online.");
  });
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.REALTIME_ALLOWED_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = readToken(socket);
    if (!token) return next(new Error("Missing auth token."));

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return next(new Error("Invalid auth token."));

    socket.data.userId = data.user.id;
    socket.data.token = token;
    socketToUser.set(socket.id, data.user.id);
    next();
  });

  io.on("connection", (socket) => {
    socket.on("queue:join", () => {
      void joinQueue(io, socket);
    });

    socket.on("queue:leave", () => {
      void leaveQueue(socket);
    });

    socket.on("match:reconnect", () => {
      reconnectToMatch(io, socket);
    });

    socket.on("match:action", (payload: { matchId?: string; action?: MatchAction }) => {
      void handleAction(io, socket, payload);
    });

    socket.on("match:concede", (payload: { matchId?: string }) => {
      void concedeMatch(io, socket, payload.matchId, "CONCEDE");
    });

    socket.on("disconnect", () => {
      void handleDisconnect(io, socket);
    });
  });

  httpServer.listen(port, () => {
    console.log(`[realtime] ${serverId} listening on ${port}`);
  });

  return { io, httpServer };
}

async function joinQueue(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;
  if (userToMatch.has(userId)) {
    reconnectToMatch(io, socket);
    return;
  }

  const activeDeck = await loadActiveDeck(userId);
  if (!activeDeck.ok) {
    socket.emit("match:error", activeDeck.error);
    return;
  }

  queue.splice(0, queue.length, ...queue.filter((entry) => entry.userId !== userId));
  await supabase.from("matchmaking_tickets").update({ status: "CANCELLED" }).eq("user_id", userId).eq("status", "QUEUED");

  const ticket = await supabase
    .from("matchmaking_tickets")
    .insert({ user_id: userId, deck_id: activeDeck.deckId, server_id: serverId, status: "QUEUED", region: "local" })
    .select("id")
    .single();

  if (ticket.error) {
    socket.emit("match:error", ticket.error.message);
    return;
  }

  const player: QueuedPlayer = {
    userId,
    displayName: activeDeck.displayName,
    deckId: activeDeck.deckId,
    deck: activeDeck.deck,
    socketId: socket.id,
    ticketId: ticket.data.id,
  };

  queue.push(player);
  socket.emit("queue:status", { status: "QUEUED", position: queue.length });
  await tryStartMatch(io);
}

async function leaveQueue(socket: Socket) {
  const userId = socket.data.userId as string;
  queue.splice(0, queue.length, ...queue.filter((entry) => entry.userId !== userId));
  await supabase.from("matchmaking_tickets").update({ status: "CANCELLED" }).eq("user_id", userId).eq("status", "QUEUED");
  socket.emit("queue:status", { status: "CANCELLED" });
}

async function tryStartMatch(io: Server) {
  while (queue.length >= 2) {
    const first = queue.shift()!;
    const second = queue.find((entry) => entry.userId !== first.userId);
    if (!second) {
      queue.unshift(first);
      return;
    }
    queue.splice(queue.indexOf(second), 1);

    const matchId = randomUUID();
    const state = createMatchState(
      matchId,
      { id: first.userId, name: first.displayName, deck: first.deck },
      { id: second.userId, name: second.displayName, deck: second.deck },
      { seed: matchId },
    );

    const match: ActiveMatch = {
      id: matchId,
      state,
      players: [first, second],
      lastActionSeq: { [first.userId]: 0, [second.userId]: 0 },
    };

    matches.set(matchId, match);
    userToMatch.set(first.userId, matchId);
    userToMatch.set(second.userId, matchId);

    const created = await persistMatch(match);
    if (!created.ok) {
      io.to(first.socketId).emit("match:error", created.error);
      io.to(second.socketId).emit("match:error", created.error);
      matches.delete(matchId);
      userToMatch.delete(first.userId);
      userToMatch.delete(second.userId);
      continue;
    }

    for (const player of match.players) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      playerSocket?.join(match.id);
    }

    await markTicketsMatched(match);
    broadcastMatch(io, match);
    scheduleTurnTimer(io, match);
  }
}

async function handleAction(io: Server, socket: Socket, payload: { matchId?: string; action?: MatchAction }) {
  const userId = socket.data.userId as string;
  const match = getSocketMatch(userId, payload.matchId);
  if (!match || !payload.action) {
    socket.emit("match:error", "Match not found.");
    return;
  }

  const incomingSeq = payload.action.actionSeq ?? 0;
  if (incomingSeq <= (match.lastActionSeq[userId] ?? 0)) {
    socket.emit("match:error", "Duplicate or stale action.");
    return;
  }

  const action = {
    ...payload.action,
    playerId: userId,
    matchId: match.id,
    actionSeq: incomingSeq,
    clientActionId: payload.action.clientActionId ?? randomUUID(),
    createdAt: new Date().toISOString(),
  } as MatchAction;

  try {
    const nextState = applyAction(match.state, action);
    match.state = nextState;
    match.lastActionSeq[userId] = incomingSeq;
    await persistAction(match, userId, action);
    await persistState(match);
    broadcastMatch(io, match);

    if (nextState.phase === "FINISHED") {
      await finishMatch(io, match, nextState.winnerId ?? null, nextState.draw ? "DRAW" : "LEADER_DEFEATED");
    } else {
      scheduleTurnTimer(io, match);
    }
  } catch (error) {
    socket.emit("match:error", error instanceof Error ? error.message : "Invalid action.");
  }
}

function reconnectToMatch(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;
  const matchId = userToMatch.get(userId);
  const match = matchId ? matches.get(matchId) : undefined;
  if (!match) {
    socket.emit("match:error", "No active match to reconnect.");
    return;
  }

  const player = match.players.find((entry) => entry.userId === userId);
  if (!player) return;

  player.socketId = socket.id;
  socket.join(match.id);
  void supabase.from("match_players").update({ connection_state: "ONLINE", disconnected_at: null }).eq("match_id", match.id).eq("user_id", userId);
  socket.emit("match:ready", { matchId: match.id });
  socket.emit("match:state", createMatchView(match.state, userId));
}

async function handleDisconnect(io: Server, socket: Socket) {
  const userId = socketToUser.get(socket.id);
  socketToUser.delete(socket.id);
  if (!userId) return;

  queue.splice(0, queue.length, ...queue.filter((entry) => entry.userId !== userId));
  await supabase.from("matchmaking_tickets").update({ status: "CANCELLED" }).eq("user_id", userId).eq("status", "QUEUED");

  const matchId = userToMatch.get(userId);
  const match = matchId ? matches.get(matchId) : undefined;
  if (!match || match.state.phase === "FINISHED") return;

  await supabase.from("match_players").update({ connection_state: "DISCONNECTED", disconnected_at: new Date().toISOString() }).eq("match_id", match.id).eq("user_id", userId);
  broadcastMatch(io, match);
}

async function concedeMatch(io: Server, socket: Socket, requestedMatchId: string | undefined, reason: "CONCEDE" | "DISCONNECT") {
  const userId = socket.data.userId as string;
  const match = getSocketMatch(userId, requestedMatchId);
  if (!match || match.state.phase === "FINISHED") return;

  const winner = match.players.find((player) => player.userId !== userId);
  match.state.phase = "FINISHED";
  match.state.winnerId = winner?.userId;
  match.state.messages = [`${winner?.displayName ?? "Opponent"} wins by ${reason.toLowerCase()}.`, ...match.state.messages].slice(0, 8);
  match.state.lastEvent = {
    id: `${match.id}-${Date.now()}`,
    type: "ERROR",
    message: match.state.messages[0],
  };

  await persistState(match);
  broadcastMatch(io, match);
  await finishMatch(io, match, winner?.userId ?? null, reason);
}

async function finishMatch(io: Server, match: ActiveMatch, winnerId: string | null, reason: string) {
  if (match.turnTimer) clearTimeout(match.turnTimer);

  await supabase.rpc("finish_multiplayer_match", {
    p_match_id: match.id,
    p_winner_id: winnerId,
    p_finish_reason: reason,
  });
  await supabase.from("match_events").insert({ match_id: match.id, event_type: "FINISH", message: reason, payload: { winnerId } });

  broadcastMatch(io, match);
  matches.delete(match.id);
  for (const player of match.players) userToMatch.delete(player.userId);
}

function scheduleTurnTimer(io: Server, match: ActiveMatch) {
  if (match.turnTimer) clearTimeout(match.turnTimer);
  if (match.state.phase === "FINISHED") return;

  match.turnTimer = setTimeout(async () => {
    try {
      match.state = applyAction(match.state, {
        type: "END_TURN",
        playerId: match.state.activePlayerId,
        matchId: match.id,
        clientActionId: `timer-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
      await persistState(match);
      broadcastMatch(io, match);
      scheduleTurnTimer(io, match);
    } catch {
      const active = match.state.activePlayerId;
      await concedeMatch(io, { data: { userId: active } } as Socket, match.id, "DISCONNECT");
    }
  }, turnMs);
}

function broadcastMatch(io: Server, match: ActiveMatch) {
  for (const player of match.players) {
    io.to(player.socketId).emit("match:ready", { matchId: match.id });
    io.to(player.socketId).emit("match:state", createMatchView(match.state, player.userId));
  }
}

async function loadActiveDeck(userId: string): Promise<
  | { ok: true; deckId: string; displayName: string; deck: CardTemplate[] }
  | { ok: false; error: string }
> {
  const [profile, deckResult] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    supabase
      .from("decks")
      .select("id, name, deck_cards(quantity, card_templates(*))")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);

  if (deckResult.error) return { ok: false, error: deckResult.error.message };
  if (!deckResult.data) return { ok: false, error: "Save an active legal deck before queueing." };

  const deckRow = deckResult.data as unknown as DeckRow;
  const deck = (deckRow.deck_cards ?? []).flatMap((entry) => {
    if (!entry.card_templates) return [];
    return Array.from({ length: entry.quantity }, () => cardRowToTemplate(entry.card_templates!));
  });

  const grouped = new Map<string, { card: CardTemplate; quantity: number }>();
  for (const card of deck) {
    const current = grouped.get(card.slug);
    grouped.set(card.slug, { card, quantity: (current?.quantity ?? 0) + 1 });
  }

  const validation = validateDeck([...grouped.values()]);
  if (!validation.valid) return { ok: false, error: validation.errors[0] ?? "Active deck is not legal." };

  return {
    ok: true,
    deckId: deckRow.id,
    displayName: profile.data?.username ?? "Player",
    deck,
  };
}

async function persistMatch(match: ActiveMatch) {
  const created = await supabase
    .from("matches")
    .insert({
      id: match.id,
      status: "ACTIVE",
      server_id: serverId,
      current_turn: match.state.turn,
      active_player_id: match.state.activePlayerId,
      state_snapshot: match.state as unknown as Json,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (created.error) return { ok: false as const, error: created.error.message };

  const players = await supabase.from("match_players").insert(match.players.map((player, index) => ({
    match_id: match.id,
    user_id: player.userId,
    deck_id: player.deckId,
    seat: index + 1,
    connection_state: "ONLINE",
    deck_snapshot: player.deck as unknown as Json,
  })));
  if (players.error) return { ok: false as const, error: players.error.message };

  await supabase.from("match_events").insert({ match_id: match.id, event_type: "START", message: "Match started.", payload: {} });
  return { ok: true as const };
}

async function markTicketsMatched(match: ActiveMatch) {
  for (const player of match.players) {
    if (!player.ticketId) continue;
    await supabase
      .from("matchmaking_tickets")
      .update({ status: "MATCHED", matched_match_id: match.id, matched_at: new Date().toISOString() })
      .eq("id", player.ticketId);
  }
}

async function persistAction(match: ActiveMatch, userId: string, action: MatchAction) {
  const stateHash = hashState(match.state);
  await supabase.from("match_action_logs").insert({
    match_id: match.id,
    user_id: userId,
    action: action.type,
    payload: action as unknown as Json,
    action_seq: action.actionSeq ?? null,
    client_action_id: action.clientActionId ?? null,
    state_hash: stateHash,
    resolved_state_hash: stateHash,
  });
}

async function persistState(match: ActiveMatch) {
  await supabase
    .from("matches")
    .update({
      status: match.state.phase === "FINISHED" ? "FINISHED" : "ACTIVE",
      current_turn: match.state.turn,
      active_player_id: match.state.activePlayerId,
      winner_id: match.state.winnerId ?? null,
      state_snapshot: match.state as unknown as Json,
      final_state: match.state.phase === "FINISHED" ? match.state as unknown as Json : null,
      finished_at: match.state.phase === "FINISHED" ? new Date().toISOString() : null,
    })
    .eq("id", match.id);
}

function getSocketMatch(userId: string, requestedMatchId?: string) {
  const matchId = requestedMatchId ?? userToMatch.get(userId);
  const match = matchId ? matches.get(matchId) : undefined;
  if (!match) return undefined;
  return match.players.some((player) => player.userId === userId) ? match : undefined;
}

function readToken(socket: Socket) {
  const value = socket.handshake.auth?.token ?? socket.handshake.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ") ? value.slice("Bearer ".length) : typeof value === "string" ? value : undefined;
}

function hashState(state: MatchState) {
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createSocketServer();
}
