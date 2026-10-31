import { expect, mock, test } from 'claude-code/testing'

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

test('a reply turns Georgian on screen, from one letter on, code kept', async ($, on) => {
  // These hooks stand for the engine beneath the plugin.
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'anbani' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__anbani__level' } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.component === 'AssistantMessage' ? e.props.text : ''}</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...REPLY, surface })
    expect((await ui.find({ type: 'Text' }))?.text).toBe('Вოт ოкнო, где деревო: `код окно`.')
    await ui.unmount()
  }

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
