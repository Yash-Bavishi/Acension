# LLM Thoughts on ASCENSION Ideas

This document is where LLMs share their honest thoughts on the ideas in `game_ideas.md`.

---

## Access Control

To prevent other LLMs from writing to this file, add this to your `CLAUDE.md` at the project root:

```
# LLM Rules
- Never write to docs/llm_thoughts_on_idea.md unless explicitly told "add your thoughts to llm_thoughts_on_idea"
- Never write to docs/game_ideas.md under any circumstance
```

The `game_ideas.md` already has the note `*** No LLM's are allowed to edit this page ***` — keep that. LLMs that follow instructions will respect it. For this file, the CLAUDE.md rule above is the enforcement mechanism: without an explicit trigger phrase, no LLM should touch it.

---

## Claudy's Thoughts *(Claude Sonnet 4.6 — Anthropic)*

### On the core concept: 10 players, fight to the top, capture the flag

This is genuinely fun on paper. The tension between "move fast to climb" and "fight enemies trying to stop you" is real. But right now the game has no conflict — it's just a solo bhop course. The gap between current state and this vision is large. My honest take: **nail the movement first, add the conflict second.** A game where movement feels incredible will attract players who then want to fight each other. A game where fighting is the focus but movement feels bad will lose people immediately.

### On scarce bullets + vendor stalls

This is the most interesting idea in the doc. Scarce ammo forces players to choose: shoot now or save for later? Vendor stalls at the base add a risk-reward loop — going down to buy ammo means losing height progress. That tension is excellent game design. 

The points system question is the right one to ask. My recommendation: **kill points are unreliable** (you can camp, not climb). **Bhop chain points are better** — they reward the core skill of the game and force players to keep moving. A combo like "5 successful bhops = 1 coin, kill = 3 coins" would push aggressive skilled play.

### On anomalous events

The dragon earthquake idea is pure chaos and I love it. Screen shake is easy to implement and adds drama without breaking fairness. The volcano eruption making platforms temporary is brilliant — it changes the route dynamically mid-match and punishes players who camp a safe spot. 

One concern: these events need to be telegraphed clearly (sound cue + visual warning 3–5 seconds before). Unexpected chaos feels unfair; announced chaos feels exciting.

### On ditching Mount Fuji

Keep it for now, ditch it later if needed. Having two maps costs nothing at this stage since the generation is procedural. Once multiplayer is live and you're playtesting, you'll quickly learn which map plays better. Let the players tell you.

### On the two problems listed

*"I don't have someone to test bhop skills"* — bots with scripted bhop paths would solve this. A bot that runs the course at a set speed gives you a pacer to race against. This is also a solo-playable feature before multiplayer ships.

*"The game is not fun"* — this is honest and correct right now. The movement feels good mechanically but there's no stakes, no enemy, no reward. Fun comes from conflict and progression. The vendor + ammo + points loop you're thinking about is exactly what adds stakes. Build that before multiplayer and even solo play becomes interesting.

---

*Last updated: 2026-04-19 — Claudy*
