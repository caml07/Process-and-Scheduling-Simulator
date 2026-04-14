/**
 * Process.js — Process Control Block (PCB)
 * Represents a single OS process with all its scheduling metadata.
 */

const STATE = {
  READY: 'ready',
  RUNNING: 'running',
  BLOCKED: 'blocked',
  DONE: 'done',
};

let _pidCounter = 1;

class Process {
  constructor({ burstTime, arrivalTime = 0, priority = 5, tickets = 10, color = null } = {}) {
    this.pid = `P${String(_pidCounter++).padStart(2, '0')}`;
    this.state = STATE.READY;

    // Times
    this.arrivalTime = arrivalTime;
    this.burstTime = burstTime ?? Math.floor(Math.random() * 12) + 2;
    this.remainingTime = this.burstTime;
    this.waitTime = 0;
    this.startTime = null;
    this.finishTime = null;

    // Scheduling metadata
    this.priority = priority; // 1 (low) – 10 (high)
    this.tickets = tickets; // for Lottery
    this.vruntime = 0; // for CFS

    // Blocked state
    this.blockedFor = 0; // ticks remaining while blocked

    // Visual
    this.color = color ?? Process._pickColor();

    // History (for Gantt)
    this.history = []; // [{ tick, state }]
  }

  get turnaround() {
    if (this.finishTime === null) return null;
    return this.finishTime - this.arrivalTime;
  }

  get isDone() {
    return this.state === STATE.DONE;
  }

  /**
   * Snapshot current state into history log.
   */
  logTick(tick) {
    this.history.push({ tick, state: this.state });
  }

  /**
   * Pick a visually distinct hue for the process card accent.
   */
  static _colors = [
    '#6c8cff',
    '#3ecf8e',
    '#f5a623',
    '#e24b4b',
    '#7f77dd',
    '#5dcaa5',
    '#ef9f27',
    '#d4537e',
    '#85b7eb',
    '#97c459',
  ];
  static _colorIdx = 0;
  static _pickColor() {
    return Process._colors[Process._colorIdx++ % Process._colors.length];
  }

  /**
   * Reset the PID counter (call on sim reset).
   */
  static resetCounter() {
    _pidCounter = 1;
    Process._colorIdx = 0;
  }
}
