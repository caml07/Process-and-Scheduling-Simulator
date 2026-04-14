/**
 * WorkloadGen.js — Realistic workload trace generator
 * Simulates real OS scenarios with locality-of-reference patterns.
 */

const WORKLOAD_SCENARIOS = {
  desktop: {
    name: 'Desktop Session',
    description: 'Browser, editor, music — typical user session',
    processes: [
      { burstTime: 3, priority: 8, tickets: 15, arrivalTime: 0 }, // shell
      { burstTime: 12, priority: 5, tickets: 10, arrivalTime: 1 }, // browser
      { burstTime: 8, priority: 6, tickets: 12, arrivalTime: 2 }, // editor
      { burstTime: 2, priority: 9, tickets: 18, arrivalTime: 3 }, // audio daemon
      { burstTime: 20, priority: 3, tickets: 6, arrivalTime: 4 }, // file indexer
      { burstTime: 5, priority: 7, tickets: 14, arrivalTime: 6 }, // email client
      { burstTime: 15, priority: 4, tickets: 8, arrivalTime: 8 }, // package manager
    ],
  },
  server: {
    name: 'Web Server',
    description: 'HTTP requests with mixed burst lengths',
    processes: [
      { burstTime: 4, priority: 9, tickets: 20, arrivalTime: 0 },
      { burstTime: 4, priority: 9, tickets: 20, arrivalTime: 0 },
      { burstTime: 4, priority: 9, tickets: 20, arrivalTime: 1 },
      { burstTime: 18, priority: 5, tickets: 10, arrivalTime: 1 }, // DB query
      { burstTime: 4, priority: 9, tickets: 20, arrivalTime: 2 },
      { burstTime: 6, priority: 7, tickets: 14, arrivalTime: 3 },
      { burstTime: 4, priority: 9, tickets: 20, arrivalTime: 4 },
      { burstTime: 22, priority: 4, tickets: 8, arrivalTime: 5 }, // report gen
    ],
  },
  compile: {
    name: 'Build System',
    description: 'Compiler jobs — long CPU bursts',
    processes: [
      { burstTime: 25, priority: 5, tickets: 10, arrivalTime: 0 },
      { burstTime: 18, priority: 5, tickets: 10, arrivalTime: 2 },
      { burstTime: 30, priority: 4, tickets: 8, arrivalTime: 4 },
      { burstTime: 12, priority: 6, tickets: 12, arrivalTime: 6 },
      { burstTime: 22, priority: 5, tickets: 10, arrivalTime: 8 },
      { burstTime: 8, priority: 7, tickets: 15, arrivalTime: 10 }, // linker
    ],
  },
  starvation: {
    name: 'Starvation Demo',
    description: 'Shows how SJF can starve long processes',
    processes: [
      { burstTime: 40, priority: 2, tickets: 4, arrivalTime: 0 }, // long job (victim)
      { burstTime: 3, priority: 8, tickets: 16, arrivalTime: 1 },
      { burstTime: 2, priority: 9, tickets: 18, arrivalTime: 2 },
      { burstTime: 4, priority: 7, tickets: 14, arrivalTime: 3 },
      { burstTime: 2, priority: 9, tickets: 18, arrivalTime: 5 },
      { burstTime: 3, priority: 8, tickets: 16, arrivalTime: 7 },
      { burstTime: 2, priority: 9, tickets: 18, arrivalTime: 9 },
    ],
  },
};

class WorkloadGen {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this._totalSpawned = 0;
  }

  get totalSpawned() {
    return this._totalSpawned;
  }

  /**
   * Load a named scenario, return the processes.
   */
  loadScenario(name = 'desktop') {
    const scenario = WORKLOAD_SCENARIOS[name] ?? WORKLOAD_SCENARIOS.desktop;
    const processes = scenario.processes.map((cfg) => new Process(cfg));
    processes.forEach((p) => {
      this._totalSpawned++;
      this.scheduler.enqueue(p);
    });
    return processes;
  }

  /**
   * Spawn a single random process.
   */
  spawnOne() {
    const burst = Math.floor(Math.random() * 14) + 2;
    const priority = Math.floor(Math.random() * 8) + 2;
    const tickets = Math.floor(Math.random() * 16) + 4;
    const p = new Process({ burstTime: burst, priority, tickets });
    this._totalSpawned++;
    this.scheduler.enqueue(p);
    return p;
  }

  /**
   * Stress test: spawn N processes rapidly.
   */
  stress(count = 40) {
    const spawned = [];
    for (let i = 0; i < count; i++) spawned.push(this.spawnOne());
    return spawned;
  }

  reset() {
    this._totalSpawned = 0;
  }
}
