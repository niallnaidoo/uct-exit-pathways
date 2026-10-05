/**
 * The integration bus — the ONLY channel between EdOS and the Careers Service.
 *
 * Prototype transport: an append-only event log in localStorage plus a
 * BroadcastChannel, so two apps served from the same origin (two tabs, or the
 * side-by-side showcase) see each other's events live, with no backend.
 *
 * Production transport (for the dev team): replace `publish` with a POST to the
 * integration service (which signs and fans the event out as webhooks), and
 * `subscribe` with that system's webhook receiver. Event types and payloads stay
 * exactly as documented in contract.js — that's the contract.
 */
import { eventMeta } from './contract.js';
import { seedHistory } from './demo/history.js';

const LOG_KEY = 'uct-bridge-log-v1';
const CHANNEL = 'uct-bridge';
/** Every key the demo writes starts with this — so one reset clears both systems. */
export const DEMO_PREFIX = 'uct-';

let channel = null;
function getChannel() {
  if (!channel && typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL);
  return channel;
}

function write(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

/** The full event log, oldest first. Seeds the demo history on first use. */
export function readLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupt or blocked — fall through to seed */
  }
  const seeded = seedHistory().map((e, i) => ({ ...e, seq: i + 1, id: `evt-${i + 1}` }));
  try {
    write(seeded);
  } catch {
    /* storage blocked: run from memory */
  }
  return seeded;
}

const rid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8);
export const newId = (prefix) => `${prefix}-${rid()}`;

/**
 * Emit an event. `from` must be the system allowed to emit this type (see the
 * contract) — the bus refuses anything else, the way the integration service
 * would reject a wrongly-signed webhook.
 */
export function publish(type, payload, from) {
  const meta = eventMeta(type);
  if (meta.from !== 'both' && meta.from !== from)
    throw new Error(`${from} is not allowed to emit ${type} (owner: ${meta.from})`);
  const log = readLog();
  const seq = (log.at(-1)?.seq ?? 0) + 1;
  const event = { seq, id: `evt-${seq}-${rid()}`, type, from, at: new Date().toISOString(), payload };
  log.push(event);
  write(log);
  getChannel()?.postMessage({ seq });
  return event;
}

/** Call `fn` whenever the other system (or another tab) publishes. Returns unsubscribe. */
export function subscribe(fn) {
  const ch = getChannel();
  const onMsg = () => fn();
  const onStorage = (e) => {
    if (e.key === LOG_KEY || e.key === null) fn();
  };
  ch?.addEventListener('message', onMsg);
  window.addEventListener('storage', onStorage);
  return () => {
    ch?.removeEventListener('message', onMsg);
    window.removeEventListener('storage', onStorage);
  };
}

/** Wipe both systems' demo data and the bus, then tell every open window. */
export function resetDemo() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(DEMO_PREFIX)) localStorage.removeItem(k);
  readLog();
  getChannel()?.postMessage({ reset: true });
}
