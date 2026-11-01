export type TwitchAccount = { id: string; login: string; displayName: string; scopes: string[] };
export type TwitchAccess = { account: TwitchAccount; clientId: string; accessToken: string };
export interface TwitchAccountProvider {
  withAccount<T>(operation: (access: TwitchAccess) => Promise<T>): Promise<T>;
}
export class TwitchFault extends Error {
  constructor(readonly code: string) { super(code); }
}
export const unavailableAccount: TwitchAccountProvider = {
  async withAccount() { throw new TwitchFault("TWITCH_NOT_CONFIGURED"); },
};
