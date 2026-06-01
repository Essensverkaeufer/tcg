const USERNAME_AUTH_DOMAIN = "players.friend-tcg.example";
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(username);
}

export function usernameToAuthEmail(username: string) {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    throw new Error("Username must be 3-24 letters, numbers, or underscores.");
  }

  return `${normalized}@${USERNAME_AUTH_DOMAIN}`;
}
