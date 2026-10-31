import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STEPS, toGeorgian } from './translit'

// The level lives in $.store, so it carries across sessions; the atom mirrors
// it for the session, and a write to it redraws every reply already on screen.
const level = atom({ plugin: 'anbani', key: 'level' } as const, 1)

const clamp = (n: number) => Math.max(0, Math.min(STEPS.length, Math.round(n)))

function parse(args: string, now: number): number | null {
  const arg = args.trim().toLowerCase()
  if (arg === '' || arg === 'show') return now
  if (arg === '+' || arg === 'next') return now + 1
  if (arg === '-' || arg === 'prev') return now - 1
  if (arg === 'off') return 0
  if (arg === 'all') return STEPS.length
  const n = Number(arg)

  return Number.isFinite(n) ? n : null
}

const pair = (i: number) => {
  const step = STEPS[i]

  return step ? `${step[1]} = ${step[0]}` : ''
}

function report(n: number, before: number): string {
  const learned = STEPS.slice(0, n)
    .map((_, i) => pair(i))
    .join(' · ')
  const head =
    n > before
      ? `Новая буква: ${pair(n - 1)}. Букв: ${n} из ${STEPS.length}.`
      : n === 0
        ? 'Замена выключена.'
        : `Букв: ${n} из ${STEPS.length}.`
  const tail = n < STEPS.length ? `Следующая: ${pair(n)}.` : 'Все буквы введены.'

  return [head, learned, tail].filter(Boolean).join('\n')
}

async function apply($: EngineInterface, args: string): Promise<string> {
  const before = await read($, level)
  const wanted = parse(args, before)
  if (wanted === null) return `Не понял «${args}». Варианты: + − N off all.`
  const n = clamp(wanted)
  await update($, level, () => n)
  await $.store.set('level', n)

  return report(n, before)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = clamp(Number((await $.store.get('level')) ?? 1) || 0)
    await update($, level, () => saved)
    await $.command.register({
      name: 'anbani',
      description: 'Georgian letters in replies: + next, - back, N set, off, all',
    })
    await $.tool.register({
      name: 'level',
      description:
        'Sets how many Russian letters are shown as Georgian in your replies (display only; the transcript keeps Russian). Call when the user asks to add, remove or show Georgian letters.',
      inputSchema: {
        type: 'object',
        properties: {
          change: {
            type: 'string',
            description: '"+" one more letter, "-" one fewer, a number to set, "off", "all", or "show"',
          },
        },
        required: ['change'],
      },
    })

    return next(e)
  })

  on('command.run', { command: 'anbani' }, async ($, e) => ({ text: await apply($, e.args) }))

  on('tool.call', { tool: 'mcp__anbani__level' }, async ($, e) => {
    const change = String((e as { change?: unknown }).change ?? 'show')

    return { result: await apply($, change) }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const n = await read($, level)
    if (n === 0) return next(e)

    return next({ ...e, props: { ...e.props, text: toGeorgian(e.props.text, n) } })
  })
}
