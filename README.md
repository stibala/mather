# Numo Math Club

A maths trainer for kids. Ships as **one file** — `index.html`, no dependencies,
no server, works offline, opens by double-click — but the source is split up so it
can be read and tested.

```
src/
  page.html        the markup, with /*__CSS__*/ and //__JS__ holes
  manifest.json    which modules are bundled, and in what order
  core/            storage, the reward tables, the database, dom helpers, audio
  gen/             the question generators — sums, clock, line, wall, money
  ui/              setup, quiz, result, progress, crate, bowl, stickers, csv, chrome
  style/           tokens, layout, quiz, rewards, overlays
test/              the suites, a fake DOM, and the runner
build.py           src/ -> index.html
index.html         generated, committed, and what gets published
```

## Working on it

    make build     rebuild index.html from src/   (do this after every edit)
    make test      run every suite against the source
    make check     the dependency graph, and anything used before it is declared
    make run       serve on http://localhost:8000
    make open      just open the built file

**`index.html` is generated — never edit it by hand.** Edit `src/` and run
`make build`. It is committed anyway, because it is the artifact: the thing that
gets published, double-clicked, and copied onto a tablet.

To use it on a tablet, run `make run` and open `http://<your-mac-ip>:8000`.

### Why a build step rather than real module files

Browsers refuse to load ES modules over `file://`, so shipping separate `.js`
files would cost the double-click-to-open property, which is most of why this app
is pleasant to live with. So the modules use real `import`/`export` — editors and
tests understand them — and `build.py` strips both and concatenates in manifest
order.

Everything therefore lands in **one shared scope, in manifest order**, which makes
that order load-bearing. `make check` prints the graph and flags every name used
before the file that declares it: a forward reference to a `function` is fine
(hoisted), one to a `const` or `let` is only safe because it is read at call time.
There are seven of the latter, all listed.

### Tests

`make test` runs each suite against the real source through a fake DOM
(`test/dom-stub.js`), using JavaScriptCore, which ships with macOS. No node, no
npm.

- `generators.test.js` — ~80,000 generated questions across every mode and
  setting, checked for arithmetic, ranges, carry settings, clock spans that really
  are that far apart, and number walls where every gap is solvable when it is asked.
- `rewards.test.js` — the sticker table, the tin, the crate's reveal-and-bank
  sequence on a virtual clock, feeding, and giving a toy to Numo.
- `migration.test.js` — saves written by every previous version, replayed. The
  standing rule is that a child may gain from a repricing but must never lose.

The stub is deliberately faithful where the app leans on the platform — `className`
and `classList` are the same object, `append` moves a node and sets `parentNode`,
and `setTimeout` runs on a virtual clock the tests advance by hand. Each of those
started as a convenient lie that made correct code look broken.

## What it does

| | |
|---|---|
| Modes | **Numbers**, **Number line**, **Number wall**, **Money**, **The clock** |
| Question shapes | `3 + 4 = ?` and `3 + ? = 7` and `? + 4 = 7` |
| Operations | `+` `−` `×` `÷` `2×` `½`, any combination, toggled per round |
| Number size | **Up to 10** / **Up to 20** / **Up to 100** |
| Crossing ten | **Stay under** / **Cross over** / **Mixed** — the carry, on its own toggle |
| Fun | a cat to feed, streak counter, coins, 36 tiered stickers, confetti, sounds |
| Mistakes | the right answer fills in and the round waits for the child to press ✓ |
| Progress | per-player history, % correct chart, best streak, CSV export |

### The two difficulty axes

Size and carrying are separate skills, so they are separate toggles. `47 + 5` and
`44 + 3` are the same size of problem but only the first crosses a ten.

**How big are the numbers** bounds the biggest number *anywhere* in the question —
for addition that is the answer, for subtraction the starting number. Each band
has a floor as well as a ceiling (`SPAN` in `index.html`), so "up to 100" cannot
quietly hand out `3 + 4`:

| | biggest number | example |
|---|---|---|
| Up to 10 | 4–10 | `6 + 3 = 9` |
| Up to 20 | 11–20 | `15 + 4 = 19` |
| Up to 100 | 21–100 | `23 + 16 = 39` |

**Crossing ten** is the carry or the borrow — `ones(a) + ones(b) >= 10` for
addition, `ones(a) < ones(b)` for subtraction:

| | up to 20 | up to 100 |
|---|---|---|
| Stay under | `15 + 4 = 19`, `17 − 13 = 4` | `23 + 16 = 39`, `56 − 12 = 44` |
| Cross over | `9 + 9 = 18`, `13 − 5 = 8` | `57 + 27 = 84`, `46 − 29 = 17` |

At "up to 10" crossing means making or breaking ten exactly (`7 + 3 = 10`,
`10 − 4 = 6`), which is the only carry that fits in that range.

Carrying does not apply to `×` and `÷`, so the toggle is ignored for those — the
range alone picks the facts (`p <= 10`, `10 < p <= 20`, or the full 1–10 tables).

Division only ever produces whole numbers; subtraction never goes negative.

## Number line mode

A number line with an arrow or a jump drawn on it; the answer is typed on the same
keypad. Three question types, chosen per round or mixed:

| | drawn | answer |
|---|---|---|
| **Read it** | an arrow pointing at an unlabelled tick | where it points |
| **Jump** | a start dot and an arc labelled `+5` or `−5` | where you land |
| **How far?** | a start and end dot, the arc labelled `?` | how big the jump is |

"Jump" is the same sum as `3 + 4 = ?` and "How far?" the same as `3 + ? = 7`, but
shown as movement along a line rather than as symbols — which is the point of the
mode.

Number size is 0–10, 0–20 or up to 100. The first two draw the whole line, ticked
every 1. **Up to 100 zooms instead of coarsening**: it shows a 10, 15 or 20 wide
window somewhere in 0–100 (`LINE_VIEWS` in `index.html`), aligned to a five and
still ticked every 1 — so `47 + 6 = 53` is a jump the child can count across,
tick by tick, past a ten.

That matters: coarsening a 0–100 line to ticks of five would force every jump to be
a multiple of five, which removes exactly the interesting cases. Zooming keeps at
most 21 ticks on screen at any time, so they stay countable at phone width, and
about 39% of jumps cross a ten.

Markers avoid numbered ticks, since reading a label is not reading a line. The
arrowhead is drawn only on an edge where there really are more numbers, so a window
of 90–100 has no arrow on its right.

The mascot shrinks in this mode to give the line horizontal room.

### Verdoppeln und Halbieren

`2×` and `½` are two more operation chips. They take one number, not two, so the
fact carries `null` in the second slot and the row renders as `double 7 = ?` or
`half of ? = 7`. The big number is drawn from the even numbers inside the size
band — nudging an odd draw downwards would push `11` under the floor of the
"up to 20" band.

## Number wall mode (Zahlenmauer)

A German Grundschule staple: two neighbouring bricks add up to the brick resting on
them, and one brick is blank. The child types into the brick itself — there is no
separate answer box.

One picture covers three skills, depending on where a gap falls:

| gap | what it is |
|---|---|
| top brick | addition |
| base brick | subtraction |
| middle brick | working out *which* of the two is needed |

Two settings: 3 or 4 rows, and a ceiling for the top brick (20 / 50 / 100). The
gap count follows the wall — 2 on a 3-row, 3 on a 4-row — and the gaps fall where
they fall.

There is deliberately **no "which brick" setting**. A top-only wall is pure
addition, which is a real thing, but it is a weak lever next to rows and ceiling,
and with one random gap the top comes up about 17% of the time anyway. Two gaps
per wall also make an all-addition wall impossible, since there is only one top
brick — so every wall mixes adding, subtracting and deciding, which is the point.

The child sees every gap at once — the one in hand outlined and blinking, the rest
a faint `?` — and fills them one at a time. Each brick is its own question in the
round, so the input, the marking and the coins stay exactly as they are elsewhere.

Not every set of gaps can be solved, though. `solveOrder` walks the wall
repeatedly taking any gap whose two partners are known; if that resolves them all
it returns the order they fell in, and that order is both the proof the wall works
and the order the child is asked in. A gap set that does not resolve is thrown
away and another drawn. Without this a wall can be genuinely unsolvable — blank
the whole base row and the top alone does not determine it.

### Runden

A fourth number-line task. The window is pinned to whole tens (width 20, so
several tens are on screen), the tens are the labelled ticks, the marker never
sits on one, and a five rounds up as German practice expects. Rounding on a line
is rounding made visible: the child sees which ten is nearer rather than applying
a rule.

## Money mode (Euro und Cent)

Coins and notes are drawn by denomination; the child reads them and types the
amount. Two question types:

- **Count it** — 3–6 coins and notes, how much is this?
- **Change** — drawn as a shop, not written as a sentence: the thing being bought
  with a price tag hanging off it, a dashed divider, and a hand holding out the
  note you pay with. The only words are `COSTS` and `YOU PAY`, and the prompt is
  just "How much money comes back?" — no numbers in it at all.

The shop scene matters more than it looks: reading *"It costs 9 €. You pay 10 € —
how much comes back?"* is a reading exercise wrapped around a subtraction, and the
reading is the harder half for a six-year-old. A price tag and a handful of money
say the same thing with nothing to decode. There are 18 different things to buy.

Amounts are held in cents throughout and only split for display, which is also how
they are typed: **the last two digits are always the cents**, so `1` `3` `5` reads
`0,01 €` → `0,13 €` → `1,35 €` as it goes in. The live comma teaches the notation
without a lesson about it. German notation (`1,35 €`) throughout.

Range is to 10 € (coins), 20 € (coins and notes) or 100 € (notes and coins), and
**With cents** decides whether amounts are whole euros or euros and cents.

Whole euros are typed as euros (`7` → `7 €`); with cents on, the last two digits
are the cents (`735` → `7,35 €`). Which rule applies is written on the question
(`maxDigits`, `keepZeros`) rather than guessed at the keypad, so a whole-euro
round never asks a child to type `700`.

### Zeitspannen

Clock mode has a question selector: **Read it**, **Later** and **How long?**

The interval is drawn, not described. **Later** puts an orange sweep round the rim
of the face, starting exactly where the long hand stands and ending in an
arrowhead, with a `+ 25 minutes` chip under the clock; the prompt is just "What
time will it be?" and contains no numbers. **How long?** shows two faces captioned
`FROM` and `TO` with an arrow between them, asking only "How many minutes?".

A sweep of a full hour is drawn at 351° rather than 360°, so it reads as "all the
way round" instead of collapsing into an invisible zero-length arc.

Spans are whole steps of the chosen minutes — quarter hours when the setting is
o'clock only — so both faces land somewhere the child can actually read, and they
wrap correctly past 12 or 24.

## Times tables (Einmaleins-Reihen)

German children learn the tables one row at a time. In Numbers mode, whenever `×`
or `÷` is chosen, a row of chips 1–10 restricts the facts to the chosen rows — tap
just the 7 to drill die 7er-Reihe. A fact counts as in-row if *either* factor is,
so `3 × 7` and `7 × 3` both appear.

A live note says how many distinct sums the current combination allows, and warns
when it is under six: the 7-row inside "up to 20" is only `2 × 7` and `7 × 2`, which
is not a round's worth of practice. If a selection allows nothing at all, the range
filter wins and the row filter is dropped rather than failing.

## Clock mode

Shows an analogue face; the child reads it and types the time on the keypad.

**Which clock** picks what counts as the answer, and it is the setting that matters
most — start on 12 hours:

- **12 hours** (the default) — the hour is simply what the short hand points at.
  Half past three is `3:30` whether it is morning or afternoon. No AM/PM anywhere.
- **24 hours** — half past three in the afternoon is `15:30`.

Digits land left to right and **the last two are always the minutes**, so `330` and
`0330` both read as half past three. There is nothing to learn about zero padding,
and 3 or 4 digits are equally accepted in either system.

A 24-hour answer cannot be read off a dial alone: of the 288 five-minute times in a
day, **144 draw a face identical to another time**. So in 24-hour mode every question
shows the part of the day (`🌤️ in the afternoon`) — reading that and deciding whether
to add the twelve is the actual skill. In 12-hour mode the badge is hidden, because
the dial already holds the whole answer and the hint would only be noise.

Other settings:

- **Which minutes** — o'clock, half hours, quarters, five-minute steps, or any minute.
- **What time of day** — 24-hour only, so the panel hides in 12-hour mode: Morning
  (06–11, where the dial number *is* the hour), Afternoon (12–23, add the twelve), or
  Any time (00–23, which adds the `12 on the dial means 00` night case).

The hour hand moves with the minutes, as a real clock does — at 03:45 it sits
three-quarters of the way between 3 and 4, not on the 3. That is deliberate: a
clock that snaps the short hand to the hour teaches children to misread it. The
two hands are colour-coded with a key beneath the face.

## Coins, treats and stickers

A correct answer is worth 1 coin, plus 1 more for every 5 in a row, so a round of
ten is about 10–12 coins. Coins are a lifetime total and are never spent.

There are **two kinds of reward, and the split is what lets the collection be
finite**:

**Treats** are food for Numo — one per 10 coins, so about one a round. They are
*consumed*, which is what lets them go on for ever without repeating.

The tin holds **actual treats**, the ones crates have handed over, so a child can
only feed Numo what they really have and can choose which. An empty tin says so
rather than offering food that isn't there.

Duplicates **stack**: two milks are one picture with a small 2 on the corner, not
two pictures. The badge counts down as they are eaten, vanishes at one left, and
the tile goes when the last one does. Tiles are held in `TREATS` order so the tin
never reshuffles itself mid-feed.

The bowl **is one panel that moves** — it follows the child to the results screen
and the progress screen, because feeding should not be something you can only do
in the moment after a round ends. It is hidden mid-question.

Drag a treat up to Numo to feed him. It uses pointer events rather than HTML5
drag-and-drop, which barely works on a tablet, and a plain tap feeds too — a small
child who cannot manage a drag is never stuck. Dropping anywhere else, or
cancelling the drag, feeds nothing.

**Stickers** are kept. There are 36, in four tiers that cost more as they go:

| tier | what it is | price | first at | ~rounds |
|---|---|---|---|---|
| 🥉 Bronze | 10 toys — wool ball, feather, box… | 40 | 40 | 4 |
| 🥈 Silver | 10 treasures — crown, trophy, wand… | 60 | 440 | 40 |
| 🥇 Gold | 8 places — castle, rocket, island… | 90 | 1040 | 95 |
| 💎 Diamond | 8 friends who join the club | 130 | 1760 | 160 |

The whole set is 2760 coins, roughly 250 rounds. **Nothing wraps.** When the last
sticker is won the collection is genuinely complete, the results panel says so,
and the progress bar switches to counting down to the next treat — which is why
the treats had to be the infinite half.

Feeding never costs a sticker: treats accrue from the same lifetime coins but are
tracked by a separate `fed` count, so there is no trade-off for a child to weigh.

Each sticker wears its tier's colour on the tile, the big card and the badge on
the player's chip. **The best sticker a child has won shows on their chip** in
"Who is playing?" and at the top of their progress page.

### The crate

What a round earned used to appear silently in the totals, which wastes the best
moment of the round. It is packed into a **crate** instead, sitting at the top of
the bowl panel — the same view as the feeding, so what comes out lands where it
will be used.

The crate nudges itself to invite a tap. Tapping flips the lid open with a burst
of light and the contents come out **one at a time**, half a second apart, each
with its own sound — a soft chime for a treat, a fanfare and confetti for a
sticker, which glows in its tier's colour and is captioned with its name.

Then it leaves properly rather than blinking out: a beat to look at the loot, then
the crate fades, shrinks and **folds its height away** so the bowl rises to fill
the space instead of jumping. Last item at 1.5s, fade begins at 2.4s, gone at
3.04s.

**Treats are packed first so a sticker always lands last**, since that is the
thing worth waiting for. The heading changes from "A crate for you!" to what it
held — "3 treats and a sticker!".

**A treat joins the tin as it comes out of the crate**, not before — otherwise the
loot sits in plain sight while the child is still deciding whether to tap, which
spoils the only surprise in the round. The counter ticks up one at a time as they
pop out.

Nothing can be lost to an unopened crate either: leaving the results and progress
screens banks whatever is still inside, and so does the arrival of the next crate.
Walking away mid-reveal cancels the remaining pops and banks the rest, so a treat
is never counted twice. A round that earned nothing shows no crate at all.

### Giving a sticker to Numo

Tapping a sticker opens its card, and an owned one has a **Give to Numo** button.
The big sticker flies down out of the card, and the toy then sits beside Numo —
on the quiz screen through every question, and beside him at the bowl. It is drawn
as the object itself, no frame or badge behind it, just a soft drop shadow so it
reads as something he is holding, and it bobs gently. It lands with a little drop
animation the first time.

He carries one thing at a time. Giving another swaps it, pressing the button
again takes it back, and **feeding a treat makes him put the toy down** — paws
full. What he is carrying is saved, so it is still there next time the app opens.

A sticker that has not been earned cannot be given, and if a balance ever drops
below what a held sticker cost, it simply reads as nothing rather than showing a
prize the child does not own.

Repricing rewards silently restates what a child has already earned, so `load()`
carries a `v` flag and tops a balance up to hold what the old prices had bought.
The v5 step also accounts for the split: the first 12 old prizes were food, which
are treats now, so only what a child had *beyond* those counts as stickers. Bump
`v` and extend that block for any future change, and check it the same way.

## Data

Progress is stored in the browser's `localStorage`, per player, on that device.
Nothing is uploaded anywhere.

- **Save as CSV** writes `Timestamp,Accuracy,AvgTime,Questions,Operation,Mode` —
  the same columns the old Streamlit trainer used.
- **Load old CSV** reads that format back in, so the history in `old-history/`
  (copied from the Streamlit project) can be imported per player.

Because storage is per browser, each child keeps their own progress only on the
device they play on. Use the CSV export if you want to move it.

## Why not Streamlit

Streamlit re-runs the whole script and round-trips to the server on every
keystroke, which makes a drill app feel sluggish and makes animation, sound and
a custom keypad awkward. A static page answers instantly and runs on any device
without Python installed.
