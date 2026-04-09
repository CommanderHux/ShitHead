declare global {
  interface Window {
    netplayjs: {
      MatchmakingClient: new (serverURL?: string) => any;
      DEFAULT_SERVER_URL: string;
    };
  }
}

export {};

