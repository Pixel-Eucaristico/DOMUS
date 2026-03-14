/**
 * Module-level flag to distinguish intentional tooltip stops
 * from outside-tap dismissals in rn-tourguide.
 */
export let isIntentionalStop = false;
export function markIntentionalStop() { isIntentionalStop = true; }
export function clearIntentionalStop() { isIntentionalStop = false; }
