export const adminUsernames = ["essens", "essens2"] as const;

export function isAdminUsername(username?: string | null) {
  return adminUsernames.some((adminUsername) => adminUsername === username);
}
