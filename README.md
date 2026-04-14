# ZenOS Scheduler Simulator

A web-based OS Process & Scheduling simulator inspired by the Zen Browser aesthetic.
Built with vanilla HTML5, CSS3, and JavaScript (ES6+) — no frameworks.

## Algorithms Implemented
- **Round-Robin** (RR) — configurable time quantum
- **Shortest Job First** (SJF) — non-preemptive
- **Lottery Scheduling** — probabilistic via ticket assignment
- **Completely Fair Scheduler** (CFS) — vruntime tracking with simplified Red-Black Tree

## Features
- Live state-transition visualization (Ready → Running → Blocked → Done)
- PCB Inspector — click any process card to inspect its internal state
- Gantt Chart view — per-process timeline
- Metrics view — avg wait, turnaround, CPU utilization, context switches
- CFS Red-Black Tree visualizer (Metrics tab, CFS mode)
- Stress test — spawn 35+ random processes
- JSON export of full simulation trace
- Dark/Light theme toggle
- Step-by-step & real-time execution modes (switchable on the fly)

## How to Run
Open `index.html` in any modern browser. No build step required.

## File Structure
```
zen-scheduler/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── Process.js       # PCB class + STATE enum
│   ├── Scheduler.js     # All 4 algorithms + Red-Black Tree
│   ├── WorkloadGen.js   # Realistic scenario generator
│   ├── GanttChart.js    # Timeline recorder + renderer
│   ├── SimClock.js      # Tick engine (real-time + step)
│   └── UI.js            # DOM rendering + event bindings
└── README.md
```

## AI Usage
Core algorithm logic (RBT, CFS vruntime, Lottery) was scaffolded with AI assistance
and reviewed/integrated by the project author, per course guidelines.