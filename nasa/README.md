# src — game code

Nothing here yet. Contract for what will live here:

```
src/
├── data.js        loads ../data/*.json (fetch or inline import)
├── engine.js      pure functions: computeMission(design, scenario, seed) -> result
├── scoring.js     score + itemised analysis generator
├── ui.js          renders engine result, owns no math
├── orbit.js       SVG orbit animation
├── css/mission.css
└── index.html
```

**Rule:** no numbers in the code. Everything numeric comes from `data/`. If a number is in `engine.js`, it is a bug.

## Engine contract

```js
computeMission(design, scenario, seed) -> {
  resources:  { mass, power, budget, data, comms, time },
  checks:     [{ id, label, pass, detail }],
  objectives: [{ id, label, metric, target, actual, pass, weight, explain }],
  events:     [{ id, name, phase, narrative, effect }],
  score:      { total, mission_success, science_value, resource_efficiency, robustness, band },
  analysis:   [{ level, area, message, fix }]
}
```
