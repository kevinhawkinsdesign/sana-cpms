/** Operator-facing alias of /console/incidents — same page, reachable from
 *  the "My Work" nav group so operators (who don't see Infrastructure) still
 *  have a route to it. Kept separate from /console/incidents itself so
 *  RouteGuard's path→nav-item lookup never has two items to pick between for
 *  the same URL (see components/console/shell/nav.ts). */
export { default } from '../../incidents/page';
