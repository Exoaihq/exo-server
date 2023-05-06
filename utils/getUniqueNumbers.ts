export function extractUniqueNumbers(input: string): number[] {
  const regex = /\d+/g;
  const matches = input.match(regex);
  if (!matches) return [];

  return [...new Set(matches.map((match) => parseInt(match)))];
}
