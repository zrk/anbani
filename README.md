# anbani

A Claude Code mod for learning the Georgian alphabet by reading. Russian
letters in Claude's replies turn into Georgian ones, one letter at a time,
starting with the most frequent. Only the drawing changes: the transcript, and
what Claude reads back, stay plain Russian.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install anbani --marketplace zrk/anbani
```

Answer `y` to add the marketplace, then pick the user scope. In the desktop
app, where `/plugin` does not run: click + next to the prompt box, then
Plugins, Add marketplace with `zrk/anbani`, then Add plugin.

## Use

A fresh install starts with one letter, о → ო.

| Command | Effect |
| --- | --- |
| `/anbani +` | one more letter |
| `/anbani -` | one letter fewer |
| `/anbani 10` | set the number of letters |
| `/anbani off` / `/anbani all` | none / all of them |
| `/anbani` | show the letters learned so far |

Where a slash command does not reach the mod, ask Claude to add or remove a
letter: the mod gives it a tool for that. The level is kept across sessions.

## Letters

In order of frequency in Russian text:

о ო · е ე · а ა · и ი · н ნ · т ტ · с ს · р რ · в ვ · л ლ · к კ · м მ · д დ ·
п პ · у უ · г გ · з ზ · б ბ · ч ჩ · х ხ · ж ჟ · ш შ · ц ც · ф ფ · дж ჯ · дз ძ

т к п map to the ejectives ტ კ პ and ф to ფ, as Georgian writes loanwords
(ტელეფონი).

## Limits

- Code blocks, inline code, link targets and bare URLs keep their letters.
- Only Claude's replies change; your messages and tool output do not.
- Seven Georgian letters have no Russian counterpart and are not taught:
  თ ქ ღ ყ წ ჭ ჰ.
- Nine Russian letters have no single Georgian one and stay Cyrillic:
  я ю ё э ы ь ъ й щ.

## Develop

`hooks/translit.ts` holds the letter table and the transform,
`hooks/register.ts` the hooks. Check with:

```
claude plugin validate .
claude plugin test .
```
