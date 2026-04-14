/**
 * SimClock.js — The simulation tick engine.
 * Drives real-time mode via setInterval.
 * Step mode just calls tick() once.
 * Speed can be changed on-the-fly without restarting.
 */

class SimClock {
  constructor(scheduler, ganttChart, workloadGen, onTick) {
    this.scheduler = scheduler;
    this.gantt = ganttChart;
    this.workload = workloadGen;
    this.onTick = onTick; // callback fired after each tick

    this.currentTick = 0;
    this.running = false;
    this._interval = null;
    this._speed = 500; // ms per tick

    // Stats
    this.cpuBusyTicks = 0;
    this.totalSpawned = 0;
  }

  setSpeed(ms) {
    this._speed = ms;
    if (this.running) {
      this._stopInterval();
      this._startInterval();
    }
  }

  play() {
    if (this.running) return;
    this.running = true;
    this._startInterval();
  }

  pause() {
    this.running = false;
    this._stopInterval();
  }

  toggle() {
    this.running ? this.pause() : this.play();
  }

  /** Advance exactly one tick (also works when paused). */
  step() {
    this._tick();
  }

  _startInterval() {
    this._interval = setInterval(() => this._tick(), this._speed);
  }

  _stopInterval() {
    clearInterval(this._interval);
    this._interval = null;
  }

  _tick() {
    // Fire scheduled arrivals from WorkloadGen? (optional future hook)
    const events = this.scheduler.tick(this.currentTick);

    if (this.scheduler.runningProc) this.cpuBusyTicks++;

    // Record history for Gantt
    const allProcs = this._allProcesses();
    this.gantt.record(allProcs, this.currentTick);

    this.currentTick++;
    this.onTick(this.currentTick, events);
  }

  _allProcesses() {
    const s = this.scheduler;
    return [...(s.runningProc ? [s.runningProc] : []), ...s.effectiveReadyQueue, ...s.blockedList, ...s.doneList];
  }

  get cpuUtilization() {
    if (this.currentTick === 0) return 0;
    return Math.round((this.cpuBusyTicks / this.currentTick) * 100);
  }

  reset() {
    this.pause();
    this.currentTick = 0;
    this.cpuBusyTicks = 0;
    this.gantt.reset();
    this.workload.reset();
    this.scheduler.reset();
  }
}
