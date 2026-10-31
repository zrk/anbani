// Russian letters in order of frequency in Russian text, each with the Georgian
// letter Georgian uses for it in loanwords: т к п go to the ejectives ტ კ პ, as
// in ტელეფონი, and ф to ფ. The two digraphs come last, once д ж з are learned.
export const STEPS: ReadonlyArray<readonly [string, string]> = [
  ['о', 'ო'], ['е', 'ე'], ['а', 'ა'], ['и', 'ი'], ['н', 'ნ'], ['т', 'ტ'],
  ['с', 'ს'], ['р', 'რ'], ['в', 'ვ'], ['л', 'ლ'], ['к', 'კ'], ['м', 'მ'],
  ['д', 'დ'], ['п', 'პ'], ['у', 'უ'], ['г', 'გ'], ['з', 'ზ'], ['б', 'ბ'],
  ['ч', 'ჩ'], ['х', 'ხ'], ['ж', 'ჟ'], ['ш', 'შ'], ['ц', 'ც'], ['ф', 'ფ'],
  ['дж', 'ჯ'], ['дз', 'ძ'],
]

const PROTECTED = /(```|~~~)[\s\S]*?(?:\1|$)|`[^`\n]*`|\]\([^)]*\)|https?:\/\/\S+/g

const cache = new Map<number, (plain: string) => string>()

function swapper(level: number): (plain: string) => string {
  const known = cache.get(level)
  if (known) return known

  const map = new Map(STEPS.slice(0, level))
  const keys = [...map.keys()].sort((a, b) => b.length - a.length)
  const letters = new RegExp(keys.join('|'), 'gi')
  const swap = (plain: string) =>
    plain.replace(letters, found => map.get(found.toLowerCase()) ?? found)
  cache.set(level, swap)

  return swap
}

export function toGeorgian(text: string, level: number): string {
  if (level <= 0) return text

  const swap = swapper(Math.min(level, STEPS.length))
  let out = ''
  let at = 0
  for (const found of text.matchAll(PROTECTED)) {
    const start = found.index ?? 0
    out += swap(text.slice(at, start)) + found[0]
    at = start + found[0].length
  }

  return out + swap(text.slice(at))
}
