import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STEPS, toGeorgian } from './translit'

// The level and the pause live in $.store, shared by every session; the atoms
// mirror them for the session, and a write redraws every reply on screen. The
// engine raises no event when another session writes the store, so each
// session polls it.
const POLL_MS = 3000
const level = atom({ plugin: 'anbani', key: 'level' } as const, 1)
const off = atom({ plugin: 'anbani', key: 'off' } as const, false)

type Setting = { n: number; off: boolean }

const clamp = (n: number) => Math.max(0, Math.min(STEPS.length, Math.round(n)))

// Typographic minus signs (U+2212, en dash, em dash) count as "-": keyboards
// and autocorrect produce them, and the error message below shows one.
const DASHES = /^[−–—]$/

function parse(args: string, now: Setting): Setting | null {
  const arg = args.trim().toLowerCase().replace(DASHES, '-')
  if (arg === '' || arg === 'show') return now
  if (arg === 'off') return { ...now, off: true }
  if (arg === 'on') return { ...now, off: false }
  const n =
    arg === '+' || arg === 'next'
      ? now.n + 1
      : arg === '-' || arg === 'prev'
        ? now.n - 1
        : arg === 'all'
          ? STEPS.length
          : Number(arg)

  return Number.isFinite(n) ? { n: clamp(n), off: false } : null
}

const pair = (i: number) => {
  const step = STEPS[i]

  return step ? `${step[1]} = ${step[0]}` : ''
}

function report({ n, off }: Setting, before: Setting): string {
  if (off) return `Замена выключена, букв сохранено: ${n}. Вернуть: /anbani on.`
  const learned = STEPS.slice(0, n)
    .map((_, i) => pair(i))
    .join(' · ')
  const head =
    n > before.n
      ? `Новая буква: ${pair(n - 1)}. Букв: ${n} из ${STEPS.length}.`
      : `Букв: ${n} из ${STEPS.length}.`
  const tail = n < STEPS.length ? `Следующая: ${pair(n)}.` : 'Все буквы введены.'

  return [head, learned, tail].filter(Boolean).join('\n')
}

async function stored($: EngineInterface): Promise<Setting> {
  return {
    n: clamp(Number((await $.store.get('level')) ?? 1) || 0),
    off: (await $.store.get('off')) === true,
  }
}

async function show($: EngineInterface, now: Setting) {
  if ((await read($, level)) !== now.n) await update($, level, () => now.n)
  if ((await read($, off)) !== now.off) await update($, off, () => now.off)
}

async function sync($: EngineInterface) {
  await show($, await stored($))
}

async function apply($: EngineInterface, args: string): Promise<string> {
  const before = await stored($)
  const now = parse(args, before)
  if (now === null) return `Не понял «${args}». Варианты: + - N off on all.`
  await $.store.set('level', now.n)
  await $.store.set('off', now.off)
  await show($, now)

  return report(now, before)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await sync($)
    $.clock.every(POLL_MS, () => void sync($))
    await $.command.register({
      name: 'anbani',
      description: 'Georgian letters in replies: + next, - back, N set, off/on pause, all',
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
            description:
              '"+" one more letter, "-" one fewer, a number to set, "off" to pause, "on" to resume, "all", or "show"',
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
    if (n === 0 || (await read($, off))) return next(e)

    return next({ ...e, props: { ...e.props, text: toGeorgian(e.props.text, n) } })
  })
}
