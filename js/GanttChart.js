/**
 * GanttChart.js — Builds and renders the Gantt chart from process history.
 */

class GanttChart {
  constructor() {
    this.log = []; // [{ tick, pid, state }]
  }

  /** Record what happened each tick for each process. */
  record(processes, tick) {
    processes.forEach((p) => {
      this.log.push({ tick, pid: p.pid, state: p.state });
    });
  }

  /** Export Gantt data as JSON. */
  toJSON() {
    return JSON.stringify(this.log, null, 2);
  }

  /**
   * Render the Gantt chart into the given container element.
   */
  render(containerEl) {
    if (this.log.length === 0) return;

    // Group by PID
    const byPid = {};
    for (const entry of this.log) {
      if (!byPid[entry.pid]) byPid[entry.pid] = {};
      byPid[entry.pid][entry.tick] = entry.state;
    }

    const pids = Object.keys(byPid).sort();
    const maxTick = Math.max(...this.log.map((e) => e.tick)) + 1;

    containerEl.innerHTML = '';

    for (const pid of pids) {
      const row = document.createElement('div');
      row.className = 'gantt-row';

      const label = document.createElement('div');
      label.className = 'gantt-pid-label';
      label.textContent = pid;
      row.appendChild(label);

      const track = document.createElement('div');
      track.className = 'gantt-track';
      track.style.gridTemplateColumns = `repeat(${maxTick}, 1fr)`;

      for (let t = 0; t < maxTick; t++) {
        const state = byPid[pid][t] ?? 'idle';
        const seg = document.createElement('div');
        seg.className = `gantt-seg seg-${state}`;
        seg.style.flex = '1';
        seg.title = `${pid} @ tick ${t}: ${state}`;
        track.appendChild(seg);
      }

      row.appendChild(track);
      containerEl.appendChild(row);
    }
  }

  reset() {
    this.log = [];
  }
}
