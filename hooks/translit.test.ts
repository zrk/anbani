import { expect, test } from 'claude-code/testing'

import { STEPS, toGeorgian } from './translit'

test('a path or a command in code keeps its letters', async () => {
  expect(toGeorgian('окно `окно`\n```\nокно\n```\nокно', 1)).toBe(
    'ოкнო `окно`\n```\nокно\n```\nოкнო',
  )
})

test('a link target and a bare URL keep their letters', async () => {
  expect(toGeorgian('[окно](wiki/окно.md) https://x.org/окно', 1)).toBe(
    '[ოкнო](wiki/окно.md) https://x.org/окно',
  )
})

test('an unclosed fence, as in a reply still streaming, keeps its code', async () => {
  expect(toGeorgian('окно\n```\nокно', 1)).toBe('ოкнო\n```\nокно')
})

test('a tilde fence keeps its code too', async () => {
  expect(toGeorgian('окно\n~~~\nокно\n~~~\nокно', 1)).toBe('ოкнო\n~~~\nокно\n~~~\nოкнო')
})

test('a fence longer than three marks keeps the shorter fence inside it', async () => {
  expect(toGeorgian('окно\n````md\n```\nокно\n```\n````\nокно', 1)).toBe(
    'ოкнო\n````md\n```\nокно\n```\n````\nოкнო',
  )
})

test('inline code in double backticks keeps its letters, a lone backtick does not hide the text', async () => {
  expect(toGeorgian('окно ``окно`` `` `окно` `` окно', 1)).toBe(
    'ოкнო ``окно`` `` `окно` `` ოкнო',
  )
  expect(toGeorgian('окно ` окно', 1)).toBe('ოкнო ` ოкнო')
})

test('the target of a reference link keeps its letters, a footnote does not', async () => {
  expect(toGeorgian('[окно]: wiki/окно.md\nокно', 1)).toBe('[ოкнო]: wiki/окно.md\nოкнო')
  expect(toGeorgian('[^1]: окно', 1)).toBe('[^1]: ოкнო')
})

test('level 0 and below, and text without Russian letters, come back unchanged', async () => {
  expect(toGeorgian('окно', 0)).toBe('окно')
  expect(toGeorgian('окно', -3)).toBe('окно')
  expect(toGeorgian('abc 123, ok! — «»', STEPS.length)).toBe('abc 123, ok! — «»')
})

test('only the first letters of the table change, the rest stay Cyrillic', async () => {
  expect(toGeorgian('дерево', 2)).toBe('дეрეвო')
  expect(toGeorgian('дерево', 1)).toBe('деревო')
})

test('a capital letter is replaced like a small one, since Georgian has no case', async () => {
  expect(toGeorgian('ОКНО', 1)).toBe('ოКНო')
  expect(toGeorgian('Окно', 1)).toBe('ოкнო')
})

test('дж and дз become one letter only once they are on the table', async () => {
  const dzh = STEPS.findIndex(([ru]) => ru === 'дж') + 1
  const dz = STEPS.findIndex(([ru]) => ru === 'дз') + 1
  expect(dz).toBe(STEPS.length)
  expect(dzh).toBe(STEPS.length - 1)

  expect(toGeorgian('джинсы', dzh - 1)).toBe('დჟინსы')
  expect(toGeorgian('джинсы', dzh)).toBe('ჯინსы')
  expect(toGeorgian('Джинсы', dzh)).toBe('ჯინსы')
  expect(toGeorgian('дзюдо', dz - 1)).toBe('დზюდო')
  expect(toGeorgian('дзюдо', dz)).toBe('ძюდო')
})

test('a level past the end of the table works like the last level', async () => {
  expect(toGeorgian('телефон', 99)).toBe(toGeorgian('телефон', STEPS.length))
  expect(toGeorgian('телефон', STEPS.length)).toBe('ტელეფონ')
})

test('every table entry is a Russian letter and a Georgian one, none repeated', async () => {
  const russian = STEPS.map(([ru]) => ru)
  const georgian = STEPS.map(([, ka]) => ka)
  expect(new Set(russian).size).toBe(STEPS.length)
  expect(new Set(georgian).size).toBe(STEPS.length)
  for (const [ru, ka] of STEPS) {
    expect(ru).toMatch(/^[а-я]{1,2}$/)
    expect(ka).toMatch(/^[ა-ჿ]$/)
  }
})
