/**
 * Scheduler.js — All scheduling algorithms
 * Algorithms: Round-Robin, SJF, Lottery, CFS (with simplified Red-Black Tree)
 */

/* ════════════════════════════════════════════════════════════
   SIMPLIFIED RED-BLACK TREE (for CFS)
   Stores processes sorted by vruntime.
   Simplification: we skip full rebalancing edge cases but
   maintain red/black coloring and BST invariant for display.
   ════════════════════════════════════════════════════════════ */
class RBTNode {
  constructor(process) {
    this.process = process;
    this.key = process.vruntime;
    this.color = 'red'; // new nodes are always red
    this.left = null;
    this.right = null;
    this.parent = null;
  }
}

class RedBlackTree {
  constructor() {
    this.root = null;
  }

  get isEmpty() {
    return this.root === null;
  }

  /** Insert a process (key = vruntime). */
  insert(process) {
    const node = new RBTNode(process);
    this.root = this._bstInsert(this.root, node);
    this._fixInsert(node);
  }

  _bstInsert(root, node) {
    if (!root) return node;
    if (node.key < root.key) {
      root.left = this._bstInsert(root.left, node);
      if (root.left) root.left.parent = root;
    } else {
      root.right = this._bstInsert(root.right, node);
      if (root.right) root.right.parent = root;
    }
    return root;
  }

  _fixInsert(node) {
    while (node !== this.root && node.parent && node.parent.color === 'red') {
      const parent = node.parent;
      const grandparent = parent.parent;
      if (!grandparent) break;

      if (parent === grandparent.left) {
        const uncle = grandparent.right;
        if (uncle && uncle.color === 'red') {
          // Case 1: recolor
          parent.color = 'black';
          uncle.color = 'black';
          grandparent.color = 'red';
          node = grandparent;
        } else {
          if (node === parent.right) {
            // Case 2: left rotate on parent
            this._rotateLeft(parent);
            node = parent;
          }
          // Case 3: right rotate on grandparent
          node.parent.color = 'black';
          grandparent.color = 'red';
          this._rotateRight(grandparent);
        }
      } else {
        const uncle = grandparent.left;
        if (uncle && uncle.color === 'red') {
          parent.color = 'black';
          uncle.color = 'black';
          grandparent.color = 'red';
          node = grandparent;
        } else {
          if (node === parent.left) {
            this._rotateRight(parent);
            node = parent;
          }
          node.parent.color = 'black';
          grandparent.color = 'red';
          this._rotateLeft(grandparent);
        }
      }
    }
    this.root.color = 'black';
  }

  _rotateLeft(node) {
    const right = node.right;
    if (!right) return;
    node.right = right.left;
    if (right.left) right.left.parent = node;
    right.parent = node.parent;
    if (!node.parent) this.root = right;
    else if (node === node.parent.left) node.parent.left = right;
    else node.parent.right = right;
    right.left = node;
    node.parent = right;
  }

  _rotateRight(node) {
    const left = node.left;
    if (!left) return;
    node.left = left.right;
    if (left.right) left.right.parent = node;
    left.parent = node.parent;
    if (!node.parent) this.root = left;
    else if (node === node.parent.right) node.parent.right = left;
    else node.parent.left = left;
    left.right = node;
    node.parent = left;
  }

  /** Return the process with the minimum vruntime (leftmost node). */
  minimum() {
    let cur = this.root;
    while (cur && cur.left) cur = cur.left;
    return cur ? cur.process : null;
  }

  /** Remove a specific process by PID. */
  remove(process) {
    this.root = this._removeByPid(this.root, process.pid);
  }

  _removeByPid(node, pid) {
    if (!node) return null;
    if (pid === node.process.pid) {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      // Replace with in-order successor (min of right subtree)
      let successor = node.right;
      while (successor.left) successor = successor.left;
      node.process = successor.process;
      node.key = successor.key;
      node.right = this._removeByPid(node.right, successor.process.pid);
    } else if (pid < node.key || this._goLeft(pid, node)) {
      node.left = this._removeByPid(node.left, pid);
    } else {
      node.right = this._removeByPid(node.right, pid);
    }
    return node;
  }

  _goLeft(pid, node) {
    // Fallback: search both subtrees
    return false;
  }

  /** Flatten to sorted array (in-order traversal). */
  toArray() {
    const result = [];
    this._inOrder(this.root, result);
    return result;
  }

  _inOrder(node, arr) {
    if (!node) return;
    this._inOrder(node.left, arr);
    arr.push(node);
    this._inOrder(node.right, arr);
  }
}

/* ════════════════════════════════════════════════════════════
   SCHEDULER
   ════════════════════════════════════════════════════════════ */
class Scheduler {
  constructor() {
    this.algorithm = 'RR';
    this.quantum = 4;
    this.quantumCounter = 0;
    this.contextSwitches = 0;

    // Queues
    this.readyQueue = []; // Process[]
    this.runningProc = null; // Process | null
    this.blockedList = []; // Process[]
    this.doneList = []; // Process[]

    // CFS Red-Black Tree
    this.cfsTree = new RedBlackTree();
  }

  setAlgorithm(algo) {
    this.algorithm = algo;
    this.quantumCounter = 0;
  }

  setQuantum(q) {
    this.quantum = q;
  }

  /** Add a newly arrived process to the ready queue / CFS tree. */
  enqueue(process) {
    process.state = STATE.READY;
    if (this.algorithm === 'CFS') {
      this.cfsTree.insert(process);
    } else {
      this.readyQueue.push(process);
      this._sortReady();
    }
  }

  /** Sort ready queue based on algorithm. */
  _sortReady() {
    if (this.algorithm === 'SJF') {
      this.readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
    }
    // RR and LOTTERY keep insertion order (LOTTERY picks randomly)
  }

  /** Get the effective ready queue (array) for display purposes. */
  get effectiveReadyQueue() {
    if (this.algorithm === 'CFS') return this.cfsTree.toArray().map((n) => n.process);
    return this.readyQueue;
  }

  /**
   * Main tick — advance the simulation by 1 unit of time.
   * Returns a summary of what happened this tick.
   */
  tick(currentTick) {
    const events = [];

    // 1. Unblock any processes whose I/O wait is over
    for (let i = this.blockedList.length - 1; i >= 0; i--) {
      const p = this.blockedList[i];
      p.blockedFor--;
      if (p.blockedFor <= 0) {
        this.blockedList.splice(i, 1);
        this.enqueue(p);
        events.push({ type: 'unblocked', pid: p.pid });
      }
    }

    // 2. Tick the running process
    if (this.runningProc) {
      const p = this.runningProc;
      p.remainingTime--;
      p.vruntime++;
      this.quantumCounter++;

      if (p.remainingTime <= 0) {
        // Process finished
        p.state = STATE.DONE;
        p.finishTime = currentTick + 1;
        this.doneList.push(p);
        if (this.algorithm === 'CFS') this.cfsTree.remove(p);
        this.runningProc = null;
        this.quantumCounter = 0;
        events.push({ type: 'finished', pid: p.pid });
        this._scheduleNext(events);
      } else {
        // Check preemption
        const preempt = this._shouldPreempt();
        if (preempt) {
          events.push({ type: 'preempted', pid: p.pid });
          this.enqueue(p);
          this.runningProc = null;
          this.quantumCounter = 0;
          this._scheduleNext(events);
        }
      }
    } else {
      this._scheduleNext(events);
    }

    // 3. Increment wait time for all ready processes
    this.effectiveReadyQueue.forEach((p) => p.waitTime++);

    return events;
  }

  _shouldPreempt() {
    if (!this.runningProc) return false;
    if (this.algorithm === 'RR') return this.quantumCounter >= this.quantum;
    if (this.algorithm === 'CFS') {
      // CFS preempts if another process has a lower vruntime
      const min = this.cfsTree.minimum();
      return min && min.vruntime < this.runningProc.vruntime;
    }
    return false; // SJF and LOTTERY are non-preemptive (simplified)
  }

  _scheduleNext(events) {
    if (this.algorithm === 'CFS') {
      const next = this.cfsTree.minimum();
      if (next) {
        this.cfsTree.remove(next);
        this._run(next, events);
      }
      return;
    }

    if (this.readyQueue.length === 0) return;

    let next;
    if (this.algorithm === 'LOTTERY') {
      const totalTickets = this.readyQueue.reduce((s, p) => s + p.tickets, 0);
      let winning = Math.floor(Math.random() * totalTickets);
      next = this.readyQueue[0];
      for (const p of this.readyQueue) {
        winning -= p.tickets;
        if (winning < 0) {
          next = p;
          break;
        }
      }
      this.readyQueue.splice(this.readyQueue.indexOf(next), 1);
    } else {
      // RR: take from front; SJF: already sorted, take from front
      next = this.readyQueue.shift();
    }

    this._run(next, events);
  }

  _run(process, events) {
    if (this.runningProc) this.contextSwitches++;
    process.state = STATE.RUNNING;
    if (process.startTime === null) process.startTime = events[0]?.tick ?? 0;
    this.runningProc = process;
    events.push({ type: 'scheduled', pid: process.pid });
  }

  /** Manually block the running process (simulates I/O interrupt). */
  blockRunning(ioDuration = 4) {
    if (!this.runningProc) return false;
    const p = this.runningProc;
    p.state = STATE.BLOCKED;
    p.blockedFor = ioDuration;
    this.blockedList.push(p);
    if (this.algorithm === 'CFS') this.cfsTree.remove(p);
    this.runningProc = null;
    this.quantumCounter = 0;
    return true;
  }

  /** Kill a process by PID (remove from wherever it is). */
  kill(pid) {
    const killFrom = (arr) => {
      const i = arr.findIndex((p) => p.pid === pid);
      if (i !== -1) {
        arr[i].state = STATE.DONE;
        this.doneList.push(arr.splice(i, 1)[0]);
        return true;
      }
      return false;
    };
    if (this.runningProc?.pid === pid) {
      this.runningProc.state = STATE.DONE;
      this.doneList.push(this.runningProc);
      if (this.algorithm === 'CFS') this.cfsTree.remove(this.runningProc);
      this.runningProc = null;
      this.quantumCounter = 0;
      return true;
    }
    return killFrom(this.readyQueue) || killFrom(this.blockedList);
  }

  /** Stats for metrics view. */
  getStats() {
    const finished = this.doneList;
    if (finished.length === 0) return null;
    const avgWait = finished.reduce((s, p) => s + p.waitTime, 0) / finished.length;
    const avgTurn = finished.reduce((s, p) => s + (p.turnaround ?? 0), 0) / finished.length;
    return {
      avgWait: Math.round(avgWait * 10) / 10,
      avgTurn: Math.round(avgTurn * 10) / 10,
      throughput: finished.length,
      contextSwitches: this.contextSwitches,
    };
  }

  /** Full reset. */
  reset() {
    this.readyQueue = [];
    this.runningProc = null;
    this.blockedList = [];
    this.doneList = [];
    this.cfsTree = new RedBlackTree();
    this.quantumCounter = 0;
    this.contextSwitches = 0;
    Process.resetCounter();
  }
}
