import { DEFAULT_SERVER_URL, MatchmakingClient } from "./matchmakingRuntime.js";
export class OnlineSession {
    isHost;
    options;
    localSeat = 0;
    matchmaking = null;
    hostConnection = null;
    hostStarted = false;
    expectedHostClients = [];
    peerByID = new Map();
    peerNames = new Map();
    seatByPeerID = new Map();
    roleResolved = false;
    constructor(isHost, options) {
        this.isHost = isHost;
        this.options = options;
    }
    start() {
        const gameID = `shithead-${this.options.roomCode.trim().toLowerCase()}`;
        const client = new MatchmakingClient(DEFAULT_SERVER_URL);
        this.matchmaking = client;
        this.options.onStatus("Connecting to matchmaking server...");
        client.onRegistered.once(() => {
            this.options.onStatus(this.isHost
                ? `Hosting room ${this.options.roomCode}. Waiting for players...`
                : `Joining room ${this.options.roomCode}...`);
            client.sendMatchRequest(gameID, 2, Math.min(4, Math.max(2, this.options.maxPlayers)));
        });
        client.onHostMatch.once((payload) => {
            if (this.roleResolved)
                return;
            this.roleResolved = true;
            this.isHost = true;
            this.expectedHostClients = [...payload.clientIDs];
            this.options.onStatus(`Matched ${payload.clientIDs.length + 1} human players.`);
            this.maybeStartHostMatch();
        });
        client.onJoinMatch.once((payload) => {
            if (this.roleResolved)
                return;
            this.roleResolved = true;
            this.isHost = false;
            this.options.onStatus("Match found. Connecting to host...");
            client.connectPeer(payload.hostID);
        });
        client.onConnection.on((conn) => {
            this.attachConnection(conn);
        });
    }
    dispose() {
        if (this.matchmaking) {
            try {
                this.matchmaking.ws?.close?.();
            }
            catch {
                // ignore close errors
            }
        }
        this.peerByID.forEach((conn) => {
            try {
                conn.close?.();
            }
            catch {
                // ignore close errors
            }
        });
        this.peerByID.clear();
        this.hostConnection = null;
        this.matchmaking = null;
    }
    sendAction(action) {
        if (this.isHost)
            return;
        this.hostConnection?.send({ type: "action", action });
    }
    broadcastState(state) {
        if (!this.isHost)
            return;
        const packet = { type: "state", state };
        this.peerByID.forEach((conn, peerID) => {
            if (!this.seatByPeerID.has(peerID))
                return;
            conn.send(packet);
        });
    }
    attachConnection(conn) {
        const existing = this.peerByID.get(conn.peerID);
        if (existing && existing !== conn) {
            conn.close?.();
            return;
        }
        this.peerByID.set(conn.peerID, conn);
        conn.on("open", () => this.onConnectionOpen(conn));
        conn.on("data", (data) => this.onConnectionData(conn, data));
        conn.onClose?.on(() => {
            this.options.onStatus("A peer disconnected.");
            this.peerByID.delete(conn.peerID);
        });
    }
    onConnectionOpen(conn) {
        if (this.isHost) {
            this.options.onStatus("Peer connected. Waiting for player name...");
            return;
        }
        this.hostConnection = conn;
        const hello = { type: "hello", name: this.options.displayName };
        conn.send(hello);
    }
    onConnectionData(conn, packet) {
        if (packet.type === "hello" && this.isHost) {
            this.peerNames.set(conn.peerID, packet.name || "Guest");
            this.maybeStartHostMatch();
            return;
        }
        if (packet.type === "action" && this.isHost) {
            const seat = this.seatByPeerID.get(conn.peerID);
            if (seat == null)
                return;
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
    maybeStartHostMatch() {
        if (!this.isHost || this.hostStarted)
            return;
        const expected = this.expectedHostClients;
        if (expected.length === 0)
            return;
        const allConnected = expected.every((peerID) => this.peerByID.get(peerID)?.dataChannel?.readyState === "open");
        const allNamed = expected.every((peerID) => this.peerNames.has(peerID));
        if (!allConnected || !allNamed)
            return;
        const remotes = expected.map((peerID) => ({
            peerID,
            name: this.peerNames.get(peerID) ?? "Guest",
        }));
        const initialState = this.options.onHostBuildInitialState(remotes);
        this.hostStarted = true;
        remotes.forEach((remote, index) => {
            const seat = index + 1;
            this.seatByPeerID.set(remote.peerID, seat);
            const conn = this.peerByID.get(remote.peerID);
            if (!conn)
                return;
            conn.send({
                type: "start",
                seat,
                state: initialState,
            });
        });
        this.options.onStatus(`Game started (${initialState.players.length} players).`);
    }
}
//# sourceMappingURL=online.js.map