/**
 * Careers API facade. This prototype has no backend: everything runs in the
 * browser (api.demo.js), and EdOS is reached only through the integration bus.
 * The production endpoints and event contract are in docs/INTEGRATION.md.
 */
export * from './api.demo.js';
export { resetDemo } from '../../../packages/bridge/bus.js';
export const IS_DEMO = true;
