/**
 * Nothing, on purpose.
 *
 * `server-only` exists to make a build fail when a Client Component imports a
 * server module. That check belongs to the bundler and runs in `next build`;
 * under vitest the package resolves to its client entry point and throws at
 * collection, which would make every server-side module in this project
 * untestable — including the email layout, which is the most breakable HTML
 * here and the least visible when it breaks.
 *
 * `vitest.config.ts` points `server-only` at this file. See the note there.
 */
export {};
