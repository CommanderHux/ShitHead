export type TypedEventLike<T> = {
  on: (handler: (value: T) => void) => void;
  once: (handler: (value: T) => void) => void;
};

export interface PeerConnection {
  peerID: string;
  dataChannel?: {
    readyState?: string;
  };
  on: (event: string, handler: (...args: any[]) => void) => void;
  onClose?: {
    on: (handler: () => void) => void;
  };
  send: (data: any) => void;
  close?: () => void;
}

export declare class MatchmakingClient {
  ws?: { close?: () => void };
  onRegistered: TypedEventLike<string>;
  onHostMatch: TypedEventLike<{ clientIDs: string[] }>;
  onJoinMatch: TypedEventLike<{ hostID: string }>;
  onConnection: TypedEventLike<PeerConnection>;
  constructor(serverURL?: string);
  connectPeer(peerID: string): PeerConnection;
  sendMatchRequest(gameID: string, minPlayers: number, maxPlayers: number): void;
}

export const DEFAULT_SERVER_URL: string;
