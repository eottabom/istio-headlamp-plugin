import {
  authorizationOperations,
  authorizationOperationsBrief,
  l7Requirements,
} from '../lib/analyze';
import { SECURITY_VERSIONS } from './apiVersions';
import { IstioObject } from './base';
import { AuthorizationRule, JwtRule, PolicyTargetReference, WorkloadSelector } from './types';

export type AuthorizationAction = 'ALLOW' | 'DENY' | 'AUDIT' | 'CUSTOM' | string;

export interface AuthorizationPolicySpec {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
  action?: AuthorizationAction;
  rules?: AuthorizationRule[];
  provider?: { name?: string };
}

export class AuthorizationPolicy extends IstioObject<AuthorizationPolicySpec> {
  static kind = 'AuthorizationPolicy';
  static apiName = 'authorizationpolicies';
  static apiVersion = SECURITY_VERSIONS;
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
    return l7Requirements(this.spec.rules);
  }

  get requiresL7(): boolean {
    return this.l7Requirements.length > 0;
  }

  /** Full `GET /api/*` summaries. Long, but what the table searches against. */
  get operations(): string[] {
    return authorizationOperations(this.spec.rules);
  }

  /** Counts rather than full lists, so a table cell stays one line per rule. */
  get operationsBrief(): string[] {
    return authorizationOperationsBrief(this.spec.rules);
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
  static apiVersion = SECURITY_VERSIONS;
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
  static apiVersion = SECURITY_VERSIONS;
  static urlSegment = 'requestauthentications';

  get issuers(): string[] {
    return (this.spec.jwtRules ?? []).map(r => r.issuer ?? '(none)');
  }
}
