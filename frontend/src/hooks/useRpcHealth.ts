import { useState, useEffect, useRef } from "react";
import { server } from "../stellar";

const POLL_INTERVAL_MS = 30_000;
const CIRCUIT_FAILURE_THRESHOLD = 3;

function nextInterval(failures: number): number {
  return Math.min(POLL_INTERVAL_MS * Math.pow(2, failures - 1), 120_000);
}

export interface UseRpcHealthResult {
  healthy: boolean;
  circuitOpen: boolean;
export type RpcStatus = "healthy" | "degraded" | "unreachable";

interface UseRpcHealthResult {
  status: RpcStatus;
  latencyMs: number | null;
  error: string | null;
}

export function useRpcHealth(): UseRpcHealthResult {
  const [healthy, setHealthy] = useState(true);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [status, setStatus] = useState<RpcStatus>("healthy");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consecutiveFailures = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await server.getHealth();
        if (cancelled) return;
        consecutiveFailures.current = 0;
        setHealthy(true);
        setCircuitOpen(false);
        setError(null);
        timerRef.current = setTimeout(check, POLL_INTERVAL_MS);
      } catch (e: unknown) {
        if (cancelled) return;
        consecutiveFailures.current += 1;
        const failures = consecutiveFailures.current;
        setHealthy(false);
        setCircuitOpen(failures >= CIRCUIT_FAILURE_THRESHOLD);
        setError(e instanceof Error ? e.message : "RPC endpoint unreachable");
        timerRef.current = setTimeout(check, nextInterval(failures));
      }
    }

    check();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { healthy, circuitOpen, error };
    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let currentDelay = 2000;

    async function checkHealth() {
      const startTime = performance.now();
      try {
        await server.getHealth();
        if (!isMounted) return;

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        setLatencyMs(latency);
        setStatus(latency > 2000 ? "degraded" : "healthy");
        setError(null);

        // Reset backoff sequence
        currentDelay = 2000;

        // Schedule next check in 60 seconds
        timerId = setTimeout(checkHealth, 60000);
      } catch (e: unknown) {
        if (!isMounted) return;

        setStatus("unreachable");
        setError(e instanceof Error ? e.message : "RPC endpoint unreachable");
        setLatencyMs(null);

        const delayToUse = currentDelay;
        // Capped at 30 seconds
        currentDelay = Math.min(currentDelay * 2, 30000);

        // Schedule retry
        timerId = setTimeout(checkHealth, delayToUse);
      }
    }

    checkHealth();

    return () => {
      isMounted = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, []);

  return { status, latencyMs, error };
}

