import type { CircuitState, CircuitBreakerConfig } from "../types";

// ─── CircuitBreaker ───────────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  get currentState(): CircuitState {
    // Auto-transition open → half_open after reset timeout
    if (this.state === "open" && Date.now() >= this.nextAttemptTime) {
      this.state = "half_open";
    }
    return this.state;
  }

  /** Returns true if a request is allowed to proceed. */
  canAttempt(): boolean {
    const s = this.currentState;
    return s === "closed" || s === "half_open";
  }

  /** Call after a successful response. Resets state to closed. */
  recordSuccess(): void {
    this.state = "closed";
    this.failureCount = 0;
  }

  /**
   * Call after a failed response.
   * Opens the breaker when failures reach the threshold within the monitor window.
   * In half-open state a single failure re-opens immediately.
   */
  recordFailure(): void {
    const now = Date.now();

    // In half-open: one failure → open again immediately
    if (this.state === "half_open") {
      this.state = "open";
      this.nextAttemptTime = now + this.config.resetTimeoutMs;
      return;
    }

    // Reset count if outside the monitor window
    if (now - this.lastFailureTime > this.config.monitorWindowMs) {
      this.failureCount = 0;
    }

    this.failureCount++;
    this.lastFailureTime = now;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "open";
      this.nextAttemptTime = now + this.config.resetTimeoutMs;
    }
  }

  /** Reset to closed manually (e.g. after provider key change). */
  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}
