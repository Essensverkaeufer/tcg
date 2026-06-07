export const storyTesterUsernames = ["essens"] as const;

export function isStoryTesterUsername(username?: string | null) {
  return storyTesterUsernames.some((tester) => tester === username);
}
