/**
 * istio-headlamp-plugin
 *
 * An Istio service mesh UI for Headlamp, built around two ideas:
 *
 *  1. Every resource shows its spec on the detail page. Istio custom resources
 *     are almost entirely spec, and a view that renders only metadata forces
 *     people into the YAML editor to read a DestinationRule or ServiceEntry.
 *     Typed sections explain the parts we model; a generic renderer covers the
 *     rest so new Istio fields are never invisible.
 *
 *  2. Ambient mode is a first-class citizen, not an afterthought. Waypoints,
 *     ztunnel, namespace enrolment and the L4/L7 split are surfaced directly,
 *     including the case where an L7 AuthorizationPolicy is silently not
 *     enforced because no waypoint is in the path.
 */

import { registerIstioPlugin } from './registry/register';

registerIstioPlugin();
