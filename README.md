# Numo Math Club

A maths trainer for kids. One file, `index.html`, no build step, no server, no
dependencies, works offline. Replaces the Streamlit version in `../math_trainer`.

## Run it

Double-click `index.html`, or:

    make open      # opens the file in your browser
    make run       # serves it on http://localhost:8000

To use it on a tablet, run `make run` and open `http://<your-mac-ip>:8000`
from the tablet on the same wifi.

## What it does

| | |
|---|---|
| Modes | **Numbers** (arithmetic) and **The clock** (12- or 24-hour analogue reading) |
| Question shapes | `3 + 4 = ?` and `3 + ? = 7` and `? + 4 = 7` |
| Operations | `+` `−` `×` `÷`, any combination, toggled per round |
| Number size | **Up to 10** / **Up to 20** / **Up to 100** |
| Crossing ten | **Stay under** / **Cross over** / **Mixed** — the carry, on its own toggle |
| Fun | mascot that reacts, streak counter, coins, stickers, confetti, sounds |
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

## Coins and stickers

A correct answer is worth 1 coin, plus 1 more for every 5 in a row, and a sticker
costs 25 (`PER_STICKER` in `index.html`). So a round of ten is about 10–12 coins
and a sticker takes roughly two good rounds. A bar on the results screen, in the
collection and under a locked sticker shows how far there is to go.

Kept deliberately small: a round a day for two years lands under 10,000 coins,
so the number stays one a child can read.

Repricing coins or stickers silently restates what a child has already earned, so
`load()` carries a `v` flag and rescales an old balance by price-then over
price-now. That mapping is exact — every sticker already earned survives. Bump
`v` and extend `wasPricedAt` for any future change, and check it the same way.

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
