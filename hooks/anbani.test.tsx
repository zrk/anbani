import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const REPLY = {
  plugin: 'anbani',
  component: 'AssistantMessage',
  requestId: 'msg-1',
  props: { text: 'Вот окно, где дерево: `код окно`.', isFirstOfReply: true },
} as const

const RUN = {
  command: 'anbani',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

function engine(on: On, shared: Record<string, unknown> = {}) {
  on('store.get', (_, e) => ({ value: shared[e.key] }))
  on('store.set', (_, e) => {
    shared[e.key] = e.value

    return { value: undefined }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'anbani' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__anbani__level' } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.component === 'AssistantMessage' ? e.props.text : ''}</Text>
  })

  return mock.clock(on)
}

test('a fresh install shows one letter at once, so the mod is seen working', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...REPLY, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, где деревო: `код окно`.')
  await ui.unmount()
})

test('each /anbani + adds a letter on every surface, off restores the text', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ ...RUN, args: '1' })

  const added = await $.command.run({ ...RUN, args: '+' })
  expect(added.text).toContain('Новая буква: ე = е')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...REPLY, surface })
    expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, гдე дეрეвო: `код окно`.')
    await ui.unmount()
  }

  await $.command.run({ ...RUN, args: 'off' })
  const ui = await $.ui.mount({ ...REPLY, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вот окно, где дерево: `код окно`.')
  await ui.unmount()
})

test('off is a pause: on brings back the same letters', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ ...RUN, args: '2' })
  await $.command.run({ ...RUN, args: 'off' })

  const ui = await $.ui.mount({ ...REPLY, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вот окно, где дерево: `код окно`.')

  await $.command.run({ ...RUN, args: 'on' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, гдე дეрეвო: `код окно`.')
  await ui.unmount()
})

test('a pause survives a restart: the next session starts off, on restores the letters', async ($, on) => {
  engine(on, { level: 2, off: true })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...REPLY, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вот окно, где дерево: `код окно`.')

  await $.command.run({ ...RUN, args: 'on' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, гдე дეрეвო: `код окно`.')
  await ui.unmount()
})

test('an off in another open session reaches this one within seconds', async ($, on) => {
  const shared: Record<string, unknown> = { level: 2 }
  const clock = engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...REPLY, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, гдე дეрეвო: `код окно`.')

  shared.off = true
  await clock.advance(3000)
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вот окно, где дерево: `код окно`.')
  await ui.unmount()
})

test('a + counts from the stored level, so a session behind the others cannot roll it back', async ($, on) => {
  const shared: Record<string, unknown> = { level: 2 }
  engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  shared.level = 5
  const added = await $.command.run({ ...RUN, args: '+' })
  expect(added.text).toContain('Новая буква: ტ = т')
  expect(shared.level).toBe(6)
})

test('a typographic minus steps back like the plain one', async ($, on) => {
  const shared: Record<string, unknown> = { level: 4 }
  engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const [dash, level] of [['-', 3], ['−', 2], ['–', 1], ['prev', 0]] as const) {
    await $.command.run({ ...RUN, args: dash })
    expect(shared.level).toBe(level)
  }
})

test('input that is not a command changes nothing and says what is accepted', async ($, on) => {
  const shared: Record<string, unknown> = { level: 3, off: true }
  engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const said = await $.command.run({ ...RUN, args: 'побольше' })
  expect(said.text).toContain('Не понял «побольше»')
  expect(said.text).toContain('+ - N off on all')
  expect(shared).toEqual({ level: 3, off: true })
})

test('a number or a step outside the table stops at its ends', async ($, on) => {
  const shared: Record<string, unknown> = {}
  engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run({ ...RUN, args: '99' })
  expect(shared.level).toBe(26)
  const full = await $.command.run({ ...RUN, args: '+' })
  expect(shared.level).toBe(26)
  expect(full.text).toContain('Все буквы введены.')

  await $.command.run({ ...RUN, args: '-5' })
  expect(shared.level).toBe(0)
  await $.command.run({ ...RUN, args: '-' })
  expect(shared.level).toBe(0)
})

test('all turns every letter on, and a bare /anbani only reports', async ($, on) => {
  const shared: Record<string, unknown> = { level: 2 }
  engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const shown = await $.command.run({ ...RUN, args: '' })
  expect(shown.text).toContain('Букв: 2 из 26.')
  expect(shown.text).toContain('Следующая: ა = а.')
  expect(shared.level).toBe(2)

  const all = await $.command.run({ ...RUN, args: 'all' })
  expect(all.text).toContain('Букв: 26 из 26.')
  expect(shared.level).toBe(26)
})

test('a stored level that is not a number falls back to one letter, not to off', async ($, on) => {
  engine(on, { level: 'много' })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...REPLY, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, где деревო: `код окно`.')
  await ui.unmount()
})

test('the level tool does what /anbani does, for a reply like "add a letter"', async ($, on) => {
  const shared: Record<string, unknown> = { level: 2 }
  engine(on, shared)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const call = (change?: string) =>
    $.tool.call({ tool: 'mcp__anbani__level', ...(change === undefined ? {} : { change }) })

  const added = await call('+')
  expect(added.result).toContain('Новая буква: ა = а')
  expect(shared.level).toBe(3)

  for (const same of [undefined, 'show']) {
    expect((await call(same)).result).toContain('Букв: 3 из 26.')
    expect(shared.level).toBe(3)
  }

  expect((await call('что-то')).result).toContain('Не понял «что-то»')
  expect(shared.level).toBe(3)

  await call('off')
  expect(shared.off).toBe(true)
  expect(shared.level).toBe(3)
})
