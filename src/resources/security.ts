import { IstioObject } from './base';
import { AuthorizationRule, JwtRule, PolicyTargetReference, WorkloadSelector } from './types';

const SEC = 'security.istio.io';
const SEC_VERSIONS = [`${SEC}/v1`, `${SEC}/v1beta1`];

export type AuthorizationAction = 'ALLOW' | 'DENY' | 'AUDIT' | 'CUSTOM' | string;

export interface AuthorizationPolicySpec {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
  action?: AuthorizationAction;
  rules?: AuthorizationRule[];
  provider?: { name?: string };
}

/**
 * Attributes ztunnel can enforce on its own. Anything outside this set needs a
 * waypoint proxy to be in the request path, which is the single most common
 * ambient-mode misconfiguration.
 *
 * @see https://istio.io/latest/docs/ambient/usage/l7-features/
 */
const L7_OPERATION_FIELDS = ['hosts', 'notHosts', 'methods', 'notMethods', 'paths', 'notPaths'];
const L7_CONDITION_PREFIXES = [
  'request.headers',
  'request.auth',
  'request.url_path',
  'request.host',
  'request.method',
  'connection.sni',
  'experimental.envoy.filters',
];

export class AuthorizationPolicy extends IstioObject<AuthorizationPolicySpec> {
  static kind = 'AuthorizationPolicy';
  static apiName = 'authorizationpolicies';
  static apiVersion = SEC_VERSIONS;
  static urlSegment = 'authorizationpolicies';

  get action(): AuthorizationAction {
    return this.spec.action ?? 'ALLOW';
  }

  get ruleCount(): number {
    return this.spec.rules?.length ?? 0;
  }

  /**
   * Which rule fields require L7 processing, with the path that triggered it.
   * Empty means the policy is enforceable by ztunnel alone.
   */
  get l7Requirements(): string[] {
    const found: string[] = [];
    this.spec.rules?.forEach((rule, ri) => {
      rule.to?.forEach((to, ti) => {
        L7_OPERATION_FIELDS.forEach(field => {
          const value = (to.operation as Record<string, unknown> | undefined)?.[field];
          if (Array.isArray(value) && value.length > 0) {
            found.push(`rules[${ri}].to[${ti}].operation.${field}`);
          }
        });
      });
      rule.when?.forEach((cond, ci) => {
        const key = cond.key ?? '';
        if (L7_CONDITION_PREFIXES.some(p => key.startsWith(p))) {
          found.push(`rules[${ri}].when[${ci}].key = ${key}`);
        }
      });
      rule.from?.forEach((from, fi) => {
        if (from.source?.requestPrincipals?.length || from.source?.notRequestPrincipals?.length) {
          found.push(`rules[${ri}].from[${fi}].source.requestPrincipals (JWT)`);
        }
      });
    });
    return found;
  }

  get requiresL7(): boolean {
    return this.l7Requirements.length > 0;
  }
}

export type MutualTlsMode = 'UNSET' | 'DISABLE' | 'PERMISSIVE' | 'STRICT' | string;

export interface PeerAuthenticationSpec {
  selector?: WorkloadSelector;
  mtls?: { mode?: MutualTlsMode };
  portLevelMtls?: Record<string, { mode?: MutualTlsMode }>;
}

export class PeerAuthentication extends IstioObject<PeerAuthenticationSpec> {
  static kind = 'PeerAuthentication';
  static apiName = 'peerauthentications';
  static apiVersion = SEC_VERSIONS;
  static urlSegment = 'peerauthentications';

  get mtlsMode(): MutualTlsMode {
    return this.spec.mtls?.mode ?? 'UNSET';
  }

  get portOverrides(): Array<{ port: string; mode: MutualTlsMode }> {
    return Object.entries(this.spec.portLevelMtls ?? {}).map(([port, v]) => ({
      port,
      mode: v?.mode ?? 'UNSET',
    }));
  }
}

export interface RequestAuthenticationSpec {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
  jwtRules?: JwtRule[];
}

export class RequestAuthentication extends IstioObject<RequestAuthenticationSpec> {
  static kind = 'RequestAuthentication';
  static apiName = 'requestauthentications';
  static apiVersion = SEC_VERSIONS;
  static urlSegment = 'requestauthentications';

  get issuers(): string[] {
    return (this.spec.jwtRules ?? []).map(r => r.issuer ?? '(none)');
  }
}
