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

function engine(on: On) {
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'anbani' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__anbani__level' } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.component === 'AssistantMessage' ? e.props.text : ''}</Text>
  })
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
