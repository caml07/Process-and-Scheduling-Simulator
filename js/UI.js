/**
 * UI.js — All DOM rendering and event bindings.
 * This is the "glue" that connects the simulation engine to the HTML.
 */

/* ── INIT ─────────────────────────────────────────────────── */
const scheduler = new Scheduler();
const ganttChart = new GanttChart();
const workloadGen = new WorkloadGen(scheduler);
const clock = new SimClock(scheduler, ganttChart, workloadGen, onTick);

let inspectedPid = null;

// Load default workload
workloadGen.loadScenario('desktop');
renderAll();

/* ── CLOCK CALLBACK ───────────────────────────────────────── */
function onTick(tick, events) {
  renderAll();
  if (inspectedPid) refreshInspector(inspectedPid);
}

/* ── MASTER RENDER ─────────────────────────────────────────── */
function renderAll() {
  renderLanes();
  renderTopbar();
  renderMetrics();
  if (scheduler.algorithm === 'CFS') renderCFSTree();
  if (document.getElementById('view-gantt').classList.contains('active')) {
    ganttChart.render(document.getElementById('gantt-rows'));
  }
}

/* ── LANES ─────────────────────────────────────────────────── */
function renderLanes() {
  const running = scheduler.runningProc ? [scheduler.runningProc] : [];
  const ready = scheduler.effectiveReadyQueue;
  const blocked = scheduler.blockedList;
  const done = scheduler.doneList;

  renderLane('lane-running', running, 'running-count');
  renderLane('lane-ready', ready, 'ready-count');
  renderLane('lane-blocked', blocked, 'blocked-count');
  renderLane('lane-done', [...done].reverse().slice(0, 10), 'done-count', done.length);
}

function renderLane(laneId, processes, countId, rawCount = null) {
  const body = document.getElementById(laneId);
  const count = document.getElementById(countId);
  if (!body || !count) return;

  count.textContent = rawCount ?? processes.length;

  if (processes.length === 0) {
    if (!body.querySelector('.lane-empty')) {
      body.innerHTML = '<div class="lane-empty">—</div>';
    }
    return;
  }

  // Diff-render: only update changed cards
  const existingIds = new Set([...body.querySelectorAll('[data-pid]')].map((el) => el.dataset.pid));
  const newIds = new Set(processes.map((p) => p.pid));

  // Remove cards that no longer exist in this lane
  existingIds.forEach((pid) => {
    if (!newIds.has(pid)) body.querySelector(`[data-pid="${pid}"]`)?.remove();
  });

  // Remove empty placeholder
  body.querySelector('.lane-empty')?.remove();

  // Add or update cards
  processes.forEach((p, i) => {
    let card = body.querySelector(`[data-pid="${p.pid}"]`);
    if (!card) {
      card = buildCard(p);
      body.appendChild(card);
    } else {
      updateCard(card, p);
    }
  });
}

function buildCard(p) {
  const card = document.createElement('div');
  card.className = `pcb-card state-${p.state}`;
  card.dataset.pid = p.pid;
  card.addEventListener('click', () => openInspector(p.pid));
  card.innerHTML = cardHTML(p);
  return card;
}

function updateCard(card, p) {
  card.className = `pcb-card state-${p.state}`;
  card.innerHTML = cardHTML(p);
}

function cardHTML(p) {
  const burstPct = Math.round(p.burstTime > 0 ? ((p.burstTime - p.remainingTime) / p.burstTime) * 100 : 100);
  const remainPct = Math.round(p.burstTime > 0 ? (p.remainingTime / p.burstTime) * 100 : 0);
  const vrtMax = Math.max(p.vruntime, 20);
  const vrtPct = Math.round((p.vruntime / vrtMax) * 100);
  const showVrt = scheduler.algorithm === 'CFS';
  const showTickets = scheduler.algorithm === 'LOTTERY';

  return `
    <div class="pcb-top">
      <span class="pcb-pid" style="color:${p.color}">${p.pid}</span>
      <span class="pcb-state-badge badge-${p.state}">${p.state}</span>
    </div>
    <div class="pcb-bars">
      <div class="pcb-bar-row">
        <span class="pcb-bar-label">CPU</span>
        <div class="pcb-bar-track">
          <div class="pcb-bar-fill fill-remain" style="width:${remainPct}%"></div>
        </div>
        <span class="pcb-bar-val">${p.remainingTime}</span>
      </div>
      ${
        showVrt
          ? `
      <div class="pcb-bar-row">
        <span class="pcb-bar-label">vrt</span>
        <div class="pcb-bar-track">
          <div class="pcb-bar-fill fill-vruntime" style="width:${vrtPct}%"></div>
        </div>
        <span class="pcb-bar-val">${p.vruntime}</span>
      </div>`
          : ''
      }
    </div>
    <div class="pcb-meta">
      <span class="pcb-meta-item">bt:<span>${p.burstTime}</span></span>
      <span class="pcb-meta-item">pri:<span>${p.priority}</span></span>
      ${showTickets ? `<span class="pcb-meta-item">tix:<span>${p.tickets}</span></span>` : ''}
      ${p.state === 'blocked' ? `<span class="pcb-meta-item">io:<span>${p.blockedFor}</span></span>` : ''}
    </div>
  `;
}

/* ── TOPBAR ─────────────────────────────────────────────────── */
function renderTopbar() {
  const tick = document.getElementById('clock-tick');
  const status = document.getElementById('sim-status');
  const label = document.getElementById('sim-status-label');
  const clockVal = document.getElementById('clock-tick');

  if (tick) tick.textContent = clock.currentTick;

  const isRunning = clock.running;
  const hasCPU = !!scheduler.runningProc;

  if (status) {
    status.className = 'status-pill' + (isRunning ? ' running-state' : hasCPU ? ' paused-state' : '');
  }
  if (label) {
    label.textContent = isRunning ? 'Running' : clock.currentTick > 0 ? 'Paused' : 'Idle';
  }
  if (clockVal) {
    clockVal.classList.toggle('ticking', isRunning);
  }
}

/* ── METRICS ─────────────────────────────────────────────────── */
function renderMetrics() {
  const stats = scheduler.getStats();
  document.getElementById('m-avg-wait').textContent = stats ? `${stats.avgWait}t` : '—';
  document.getElementById('m-avg-turn').textContent = stats ? `${stats.avgTurn}t` : '—';
  document.getElementById('m-throughput').textContent = stats ? `${stats.throughput}` : '—';
  document.getElementById('m-cpu-util').textContent = `${clock.cpuUtilization}%`;
  document.getElementById('m-spawned').textContent = workloadGen.totalSpawned;
  document.getElementById('m-ctx-switches').textContent = scheduler.contextSwitches;

  // CFS panel visibility
  const cfsPanel = document.getElementById('cfs-panel');
  if (cfsPanel) cfsPanel.style.display = scheduler.algorithm === 'CFS' ? 'block' : 'none';
}

/* ── CFS RED-BLACK TREE VISUALIZER ─────────────────────────── */
function renderCFSTree() {
  const canvas = document.getElementById('rbt-canvas');
  if (!canvas) return;

  const nodes = scheduler.cfsTree.toArray();
  if (nodes.length === 0) {
    canvas.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Tree is empty</span>';
    return;
  }

  canvas.innerHTML = '';
  nodes.forEach((node) => {
    const wrap = document.createElement('div');
    wrap.className = 'rbt-node';

    const dot = document.createElement('div');
    dot.className = `rbt-dot ${node.color}-node`;
    dot.textContent = node.process.pid;
    dot.title = `${node.process.pid} — vruntime: ${node.process.vruntime}`;

    const lbl = document.createElement('div');
    lbl.className = 'rbt-label';
    lbl.textContent = `vrt:${node.process.vruntime}`;

    wrap.appendChild(dot);
    wrap.appendChild(lbl);
    canvas.appendChild(wrap);
  });

  // Mark leftmost as the "next to run" (min vruntime)
  const firstDot = canvas.querySelector('.rbt-node:first-child .rbt-dot');
  if (firstDot) {
    firstDot.style.boxShadow = '0 0 0 2px var(--c-running)';
    firstDot.title += ' ← next';
  }
}

/* ── INSPECTOR ──────────────────────────────────────────────── */
function openInspector(pid) {
  inspectedPid = pid;
  refreshInspector(pid);
  document.getElementById('inspector-overlay').style.display = 'flex';
}

function refreshInspector(pid) {
  const all = [
    ...(scheduler.runningProc ? [scheduler.runningProc] : []),
    ...scheduler.effectiveReadyQueue,
    ...scheduler.blockedList,
    ...scheduler.doneList,
  ];
  const p = all.find((x) => x.pid === pid);
  if (!p) {
    closeInspector();
    return;
  }

  const body = document.getElementById('inspector-body');
  const rows = [
    ['PID', p.pid],
    ['State', p.state],
    ['Burst Time', p.burstTime],
    ['Remaining', p.remainingTime],
    ['Wait Time', p.waitTime],
    ['Priority', p.priority],
    ['Tickets', p.tickets],
    ['vruntime', p.vruntime],
    ['Arrival', p.arrivalTime],
    ['Turnaround', p.turnaround ?? '—'],
  ];

  body.innerHTML = rows
    .map(
      ([k, v]) => `
    <div class="inspector-row">
      <span class="inspector-key">${k}</span>
      <span class="inspector-val">${v}</span>
    </div>
  `
    )
    .join('');

  // Update footer button states
  document.getElementById('inspector-block').disabled = p.state !== STATE.RUNNING;
  document.getElementById('inspector-kill').disabled = p.state === STATE.DONE;
}

function closeInspector() {
  inspectedPid = null;
  document.getElementById('inspector-overlay').style.display = 'none';
}

/* ── GANTT RENDER on tab switch ─────────────────────────────── */
function renderGantt() {
  const container = document.getElementById('gantt-rows');
  ganttChart.render(container);
}

/* ═══════════════════════════════════════════════════════════
   EVENT BINDINGS
   ═══════════════════════════════════════════════════════════ */

// Play / Pause
document.getElementById('btn-play').addEventListener('click', () => {
  clock.toggle();
  const isRunning = clock.running;
  document.getElementById('play-icon').style.display = isRunning ? 'none' : 'block';
  document.getElementById('pause-icon').style.display = isRunning ? 'block' : 'none';
  document.getElementById('play-label').textContent = isRunning ? 'Pause' : 'Play';
  renderTopbar();
});

// Step
document.getElementById('btn-step').addEventListener('click', () => {
  clock.step();
});

// Reset
document.getElementById('btn-reset').addEventListener('click', () => {
  clock.reset();
  document.getElementById('play-icon').style.display = 'block';
  document.getElementById('pause-icon').style.display = 'none';
  document.getElementById('play-label').textContent = 'Play';
  workloadGen.loadScenario('desktop');
  renderAll();
});

// Spawn
document.getElementById('btn-spawn').addEventListener('click', () => {
  workloadGen.spawnOne();
  renderAll();
});

// Stress test
document.getElementById('btn-stress').addEventListener('click', () => {
  workloadGen.stress(35);
  renderAll();
});

// Export JSON
document.getElementById('btn-export').addEventListener('click', () => {
  const data = {
    algorithm: scheduler.algorithm,
    ticks: clock.currentTick,
    stats: scheduler.getStats(),
    gantt: JSON.parse(ganttChart.toJSON()),
    processes: scheduler.doneList.map((p) => ({
      pid: p.pid,
      burstTime: p.burstTime,
      waitTime: p.waitTime,
      turnaround: p.turnaround,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zenos_${scheduler.algorithm}_t${clock.currentTick}.json`;
  a.click();
});

// Algorithm buttons
document.querySelectorAll('.algo-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.algo-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const algo = btn.dataset.algo;
    scheduler.setAlgorithm(algo);
    document.getElementById('algo-badge').textContent = {
      RR: 'Round-Robin',
      SJF: 'SJF',
      LOTTERY: 'Lottery',
      CFS: 'CFS',
    }[algo];
    document.getElementById('quantum-section').style.display = algo === 'RR' ? 'block' : 'none';
    renderAll();
  });
});

// Quantum slider
document.getElementById('quantum-slider').addEventListener('input', (e) => {
  const v = parseInt(e.target.value);
  scheduler.setQuantum(v);
  document.getElementById('quantum-display').textContent = v;
});

// Speed slider
document.getElementById('speed-slider').addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  // 1 = 1500ms (slow), 10 = 100ms (fast)
  const ms = Math.round(1600 - val * 150);
  clock.setSpeed(ms);
  document.getElementById('speed-display').textContent = `${ms} ms`;
});

// Nav tabs
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const viewId = `view-${btn.dataset.view}`;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (btn.dataset.view === 'gantt') renderGantt();
    if (btn.dataset.view === 'metrics') renderMetrics();
  });
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
});

// Inspector close
document.getElementById('inspector-close').addEventListener('click', closeInspector);
document.getElementById('inspector-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('inspector-overlay')) closeInspector();
});

// Inspector — Force Block
document.getElementById('inspector-block').addEventListener('click', () => {
  if (!inspectedPid) return;
  scheduler.blockRunning(Math.floor(Math.random() * 5) + 3);
  renderAll();
});

// Inspector — Kill
document.getElementById('inspector-kill').addEventListener('click', () => {
  if (!inspectedPid) return;
  scheduler.kill(inspectedPid);
  closeInspector();
  renderAll();
});
