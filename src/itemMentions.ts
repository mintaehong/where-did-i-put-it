const startsWithWordCharacter = /^[\p{L}\p{N}\p{M}]/u;
const endsWithWordCharacter = /[\p{L}\p{N}\p{M}]$/u;
const koreanParticle = /^(?:이랑|랑|하고|까지|부터|으로|에는|에서|에게|한테|은|는|이|가|을|를|의|에|도|만|와|과|로)(?![\p{L}\p{N}\p{M}])/u;

function normalize(text: string) {
  return text.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function findItemMentions<T extends { name: string }>(question: string, items: T[]): T[] {
  const text = normalize(question);
  const byName = new Map<string, T[]>();
  for (const item of items) {
    const name = normalize(item.name);
    if (!name) continue;
    const group = byName.get(name);
    if (group) group.push(item);
    else byName.set(name, [item]);
  }

  const matches: { start: number; end: number; items: T[] }[] = [];
  for (const [name, group] of byName) {
    let start = text.indexOf(name);
    while (start !== -1) {
      const end = start + name.length;
      const before = text.slice(0, start);
      const after = text.slice(end);
      if (!endsWithWordCharacter.test(before)
        && (!startsWithWordCharacter.test(after) || koreanParticle.test(after))) {
        matches.push({ start, end, items: group });
      }
      start = text.indexOf(name, start + 1);
    }
  }

  matches.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const selected: typeof matches = [];
  for (const match of matches) {
    if (!selected.some((other) => match.start < other.end && other.start < match.end)) selected.push(match);
  }
  selected.sort((a, b) => a.start - b.start);
  return [...new Set(selected.flatMap((match) => match.items))];
}
