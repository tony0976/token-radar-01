# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/tony0976/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/tony0976/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar: pre-token protocols, ranked by what a token might be worth — and what to do about it. It reads the frozen DefiLlama snapshot of 2026-11-14 (758 protocols at or above $50M TVL), scores every pre-token protocol with a curve fitted on the 128 issued-token protocols that carry a market cap (log market cap = 6.9646 + 0.5223 × log TVL, R² = 0.194), and writes a ranked board of 226 rows (the full 40-protocol watchlist plus 186 early finds) with a seven-step farm plan for each, a static dashboard, and three screenshots. The 80% interval around every estimate is shown, because the fit is honest about how wide it is.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Requires Node 22 or later, standard library only, no network. The program writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`; run it twice and the outputs are byte-identical.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0gzpxxg0&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
