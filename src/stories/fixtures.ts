/**
 * Shapes the presentational components have to survive.
 *
 * Deliberately taken from real clusters rather than invented: the ext-authz
 * policy below is the shape that broke the layout (fifty paths in one rule),
 * and it is the case worth looking at whenever these components change.
 */

import { AuthorizationRule, TrafficPolicy } from '../resources/types';

export const simpleRule: AuthorizationRule = {
  from: [{ source: { principals: ['cluster.local/ns/shop/sa/orders'], namespaces: ['shop'] } }],
  to: [{ operation: { methods: ['GET', 'HEAD'], paths: ['/api/reviews/*', '/healthz'] } }],
};

export const ruleWithConditions: AuthorizationRule = {
  from: [
    {
      source: {
        principals: ['cluster.local/ns/platform/sa/admin'],
        ipBlocks: ['10.0.0.0/8'],
        notIpBlocks: ['10.99.0.0/16'],
      },
    },
  ],
  to: [
    { operation: { methods: ['DELETE'], paths: ['/api/reviews/*/admin'], notPorts: ['15021'] } },
  ],
  when: [
    { key: 'request.auth.claims[groups]', values: ['platform-admins'] },
    { key: 'request.headers[x-internal]', values: ['true'] },
  ],
};

/** Port-only: the L4 case ztunnel can enforce without a waypoint. */
export const l4Rule: AuthorizationRule = {
  from: [{ source: { namespaces: ['monitoring'] } }],
  to: [{ operation: { ports: ['15020'] } }],
};

/** The production ext-authz shape: fifty paths, eleven exclusions, four hosts. */
export const hugeGatewayRule: AuthorizationRule = {
  to: [
    {
      operation: {
        hosts: [
          'api.dev.example.com',
          'api.dev.example.com:8043',
          'api.dev.example.services',
          'api.dev.example.services:443',
        ],
        notMethods: ['OPTIONS'],
        notPaths: Array.from({ length: 11 }, (_, i) => `/public-service-${i}/v1/*`),
        paths: Array.from({ length: 50 }, (_, i) => `/backend-service-${i}/*`),
      },
    },
  ],
};

export const trafficPolicy: TrafficPolicy = {
  loadBalancer: { simple: 'LEAST_REQUEST' },
  connectionPool: {
    tcp: { maxConnections: 100, connectTimeout: '3s' },
    http: { http2MaxRequests: 1000, maxRequestsPerConnection: 10, idleTimeout: '30s' },
  },
  outlierDetection: {
    consecutive5xxErrors: 5,
    interval: '10s',
    baseEjectionTime: '30s',
    maxEjectionPercent: 50,
  },
  tls: { mode: 'ISTIO_MUTUAL' },
};

/** A telemetry custom tag: three levels deep for two characters of content. */
export const customTags = { env: { literal: { value: 'dev' } } };

export const serviceEntrySpec = {
  hosts: ['payments.example.com'],
  location: 'MESH_EXTERNAL',
  resolution: 'DNS',
  ports: [
    { number: 443, name: 'https', protocol: 'TLS' },
    { number: 80, name: 'http', protocol: 'HTTP' },
  ],
  exportTo: ['.'],
};
