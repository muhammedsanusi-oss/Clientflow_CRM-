// Read real OAuth cookies from local files instead of manufacturing identities.
// Keep the files outside the repository, and never print or commit their contents.
import { readFileSync } from "node:fs";

export function sessionCookie(account) {
  const file = process.env[`AUTH_COOKIE_FILE_${account}`];
  if (!file) throw new Error(`Set AUTH_COOKIE_FILE_${account} to a local cookie file after signing in with GitHub. See docs/runbooks/github-oauth-setup.md.`);
  const value = readFileSync(file, "utf8").trim();
  if (!/^(?:__Secure-)?authjs\.session-token=[^;\s]+$/.test(value)) {
    throw new Error(`Account ${account}: expected one Auth.js name=value cookie, without attributes.`);
  }
  return value;
}
