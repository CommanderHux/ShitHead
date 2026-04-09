import type { GameAction, GameState } from "../game/state.js";
import { DEFAULT_SERVER_URL, MatchmakingClient } from "./matchmakingRuntime.js";
import type { PeerConnection } from "./matchmakingRuntime.js";


type HostStartPacket = {
  type: "start";
  seat: number;
  state: GameState;
};

type StatePacket = {
  type: "state";
  state: GameState;
};

type ActionPacket = {
  type: "action";
  action: GameAction;
};

type HelloPacket = {
  type: "hello";
  name: string;
};

type Packet = HostStartPacket | StatePacket | ActionPacket | HelloPacket;

interface RemotePlayerInfo {
  peerID: string;
  name: string;
}

interface OnlineSessionOptions {
  roomCode: string;
  displayName: string;
  maxPlayers: number;
  onStatus: (message: string) => void;
  onClientStarted: (state: GameState, seat: number) => void;
  onClientState: (state: GameState) => void;
  onHostBuildInitialState: (remotes: RemotePlayerInfo[]) => GameState;
  onHostAction: (seat: number, action: GameAction) => void;
}

export class OnlineSession {
  isHost: boolean;
  readonly options: OnlineSessionOptions;
  localSeat = 0;

  private matchmaking: MatchmakingClient | null = null;
  private hostConnection: PeerConnection | null = null;
  private hostStarted = false;
  private expectedHostClients: string[] = [];
  private peerByID = new Map<string, PeerConnection>();
  private peerNames = new Map<string, string>();
  private seatByPeerID = new Map<string, number>();
  private roleResolved = false;

  constructor(isHost: boolean, options: OnlineSessionOptions) {
    this.isHost = isHost;
    this.options = options;
  }

  start() {
    const gameID = `shithead-${this.options.roomCode.trim().toLowerCase()}`;
    const client = new MatchmakingClient(DEFAULT_SERVER_URL);
    this.matchmaking = client;
    this.options.onStatus("Connecting to matchmaking server...");

    client.onRegistered.once(() => {
      this.options.onStatus(
        this.isHost
          ? `Hosting room ${this.options.roomCode}. Waiting for players...`
          : `Joining room ${this.options.roomCode}...`,
      );
      client.sendMatchRequest(gameID, 2, Math.min(4, Math.max(2, this.options.maxPlayers)));
    });

    client.onHostMatch.once((payload: { clientIDs: string[] }) => {
      if (this.roleResolved) return;
      this.roleResolved = true;
      this.isHost = true;
      this.expectedHostClients = [...payload.clientIDs];
      this.options.onStatus(`Matched ${payload.clientIDs.length + 1} human players.`);
      this.maybeStartHostMatch();
    });

    client.onJoinMatch.once((payload: { hostID: string }) => {
      if (this.roleResolved) return;
      this.roleResolved = true;
      this.isHost = false;
      this.options.onStatus("Match found. Connecting to host...");
      client.connectPeer(payload.hostID);
    });

    client.onConnection.on((conn: PeerConnection) => {
      this.attachConnection(conn);
    });
  }

  dispose() {
    if (this.matchmaking) {
      try {
        this.matchmaking.ws?.close?.();
      } catch {
        // ignore close errors
      }
    }
    this.peerByID.forEach((conn) => {
      try {
        conn.close?.();
      } catch {
        // ignore close errors
      }
    });
    this.peerByID.clear();
    this.hostConnection = null;
    this.matchmaking = null;
  }

  sendAction(action: GameAction) {
    if (this.isHost) return;
    this.hostConnection?.send({ type: "action", action } satisfies ActionPacket);
  }

  broadcastState(state: GameState) {
    if (!this.isHost) return;
    const packet: StatePacket = { type: "state", state };
    this.peerByID.forEach((conn, peerID) => {
      if (!this.seatByPeerID.has(peerID)) return;
      conn.send(packet);
    });
  }

  private attachConnection(conn: PeerConnection) {
    const existing = this.peerByID.get(conn.peerID);
    if (existing && existing !== conn) {
      conn.close?.();
      return;
    }
    this.peerByID.set(conn.peerID, conn);
    conn.on("open", () => this.onConnectionOpen(conn));
    conn.on("data", (data: Packet) => this.onConnectionData(conn, data));
    conn.onClose?.on(() => {
      this.options.onStatus("A peer disconnected.");
      this.peerByID.delete(conn.peerID);
    });
  }

  private onConnectionOpen(conn: PeerConnection) {
    if (this.isHost) {
      this.options.onStatus("Peer connected. Waiting for player name...");
      return;
    }
    this.hostConnection = conn;
    const hello: HelloPacket = { type: "hello", name: this.options.displayName };
    conn.send(hello);
  }

  private onConnectionData(conn: PeerConnection, packet: Packet) {
    if (packet.type === "hello" && this.isHost) {
      this.peerNames.set(conn.peerID, packet.name || "Guest");
      this.maybeStartHostMatch();
      return;
    }

    if (packet.type === "action" && this.isHost) {
      const seat = this.seatByPeerID.get(conn.peerID);
      if (seat == null) return;
      this.options.onHostAction(seat, packet.action);
      return;
    }

    if (packet.type === "start" && !this.isHost) {
      this.localSeat = packet.seat;
      this.options.onClientStarted(packet.state, packet.seat);
      return;
    }

    if (packet.type === "state" && !this.isHost) {
      this.options.onClientState(packet.state);
    }
  }

  private maybeStartHostMatch() {
    if (!this.isHost || this.hostStarted) return;
    const expected = this.expectedHostClients;
    if (expected.length === 0) return;
    const allConnected = expected.every((peerID) => this.peerByID.get(peerID)?.dataChannel?.readyState === "open");
    const allNamed = expected.every((peerID) => this.peerNames.has(peerID));
    if (!allConnected || !allNamed) return;

    const remotes: RemotePlayerInfo[] = expected.map((peerID) => ({
      peerID,
      name: this.peerNames.get(peerID) ?? "Guest",
    }));
    const initialState = this.options.onHostBuildInitialState(remotes);
    this.hostStarted = true;

    remotes.forEach((remote, index) => {
      const seat = index + 1;
      this.seatByPeerID.set(remote.peerID, seat);
      const conn = this.peerByID.get(remote.peerID);
      if (!conn) return;
      conn.send({
        type: "start",
        seat,
        state: initialState,
      } satisfies HostStartPacket);
    });

    this.options.onStatus(`Game started (${initialState.players.length} players).`);
  }
}
