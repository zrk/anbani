import { expect, test } from 'claude-code/testing'

import { toGeorgian } from './translit'

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
