/** Operator-facing alias of /console/stations/incidents — same page, reachable
 *  from the "My Work" nav group so operators (who don't see Infrastructure)
 *  still have a route to it. Kept separate from /console/stations/incidents
 *  itself so RouteGuard's path→nav-item lookup never has two items to pick
 *  between for the same URL (see components/console/shell/nav.ts). */
export { default } from '../../stations/incidents/page';
