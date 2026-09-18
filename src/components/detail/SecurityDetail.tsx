import { Icon } from '@iconify/react';
import { Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';
import { ruleMatches } from '../../lib/analyze';
import { useL7Coverage } from '../../lib/l7coverage';
import {
  AuthorizationPolicy,
  AuthorizationPolicySpec,
  PeerAuthentication,
  RequestAuthentication,
} from '../../resources/security';
import { AuthorizationRule } from '../../resources/types';
import { EnumChip } from '../common/Badges';
import { ChipList, ConfigWarning, Row, TextList } from '../common/SpecSection';
import { RuleConditionCell, RuleOperationCell, RuleSourceCell } from './RuleCells';
import { Mono, SpecTable } from './Table';

/* ------------------------------ AuthorizationPolicy ------------------------------ */

export function authorizationPolicyHeaderInfo(ap: AuthorizationPolicy): Row[] {
  return [
    {
      name: 'Action',
      value: (
        <EnumChip value={ap.action} good={['ALLOW']} bad={['DENY']} neutral={['AUDIT', 'CUSTOM']} />
      ),
      hideIfEmpty: false,
    },
    { name: 'Rules', value: String(ap.ruleCount), hideIfEmpty: false },
    { name: 'Enforcement layer', value: <EnforcementChip policy={ap} />, hideIfEmpty: false },
    { name: 'Provider', value: ap.spec.provider?.name },
  ];
}

export function authorizationPolicySections(ap: AuthorizationPolicy): ReactNode[] {
  return [
    <L7Check key="l7" policy={ap} />,
    <RulesSection key="rules" rules={ap.spec.rules} action={ap.action} />,
  ];
}

/**
 * Warns when an L7 policy is attached to something that ztunnel alone serves.
 *
 * In ambient mode ztunnel enforces L4 only. An AuthorizationPolicy with HTTP
 * methods, paths or JWT claims is silently not enforced unless a waypoint sits
 * in the path — one of the easiest ambient mistakes to make and one of the
 * hardest to notice, because nothing errors and nothing is rejected.
 *
 * @see https://istio.io/latest/docs/ambient/usage/l7-features/
 */
function EnforcementChip({ policy }: { policy: AuthorizationPolicy }) {
  const coverage = useL7Coverage(policy);
  switch (coverage.state) {
    case 'l4':
      return (
        <Chip size="small" color="success" label="L4 — ztunnel can enforce" variant="outlined" />
      );
    case 'sidecar':
      return (
        <Chip size="small" color="info" label="L7 — enforced by sidecars" variant="outlined" />
      );
    case 'covered':
      return (
        <Chip
          size="small"
          color="success"
          label={`L7 — enforced by ${coverage.through}`}
          variant="outlined"
        />
      );
    case 'dangling':
      return <Chip size="small" color="error" label="L7 — target not found" variant="outlined" />;
    case 'uncovered':
      return <Chip size="small" color="error" label="L7 — NOT enforced" variant="outlined" />;
  }
}

function L7Check({ policy }: { policy: AuthorizationPolicy }) {
  const coverage = useL7Coverage(policy);

  if (coverage.state === 'l4') return null;

  if (coverage.state === 'sidecar') {
    return (
      <ConfigWarning severity="info" title="This policy uses L7 attributes">
        <Typography variant="body2">
          Enforced by the sidecar proxies of the selected workloads. Fields requiring L7:{' '}
          <Mono>{coverage.requirements.join(', ')}</Mono>
        </Typography>
      </ConfigWarning>
    );
  }

  if (coverage.state === 'covered') {
    return (
      <ConfigWarning severity="success" title={`L7 policy is enforced at the ${coverage.through}`}>
        <Typography variant="body2">
          {coverage.through === 'waypoint'
            ? 'Traffic to the targeted workloads passes through waypoint '
            : 'The targeted gateway terminates L7 itself, so no waypoint is needed: '}
          <Mono>{coverage.via.join(', ')}</Mono>.
        </Typography>
      </ConfigWarning>
    );
  }

  if (coverage.state === 'dangling') {
    return (
      <ConfigWarning severity="error" title={`Target ${coverage.targetKind} not found`}>
        <Typography variant="body2">
          This policy attaches to <Mono>{coverage.missing.join(', ')}</Mono>, which does not exist
          in this cluster. Nothing enforces it until that {coverage.targetKind} is created.
        </Typography>
      </ConfigWarning>
    );
  }

  return (
    <ConfigWarning severity="error" title="L7 rules will not be enforced">
      <Typography variant="body2" sx={{ mb: 1 }}>
        This cluster runs Istio in ambient mode, where ztunnel enforces L4 only. No waypoint was
        found for the targets of this policy, so the following L7 conditions are silently ignored:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {coverage.requirements.map(r => (
          <li key={r}>
            <Mono>{r}</Mono>
          </li>
        ))}
      </Box>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Deploy a waypoint and label the target with <Mono>istio.io/use-waypoint</Mono>, or restrict
        the policy to L4 attributes (ports, principals, namespaces, IP blocks).
      </Typography>
    </ConfigWarning>
  );
}

function RulesSection({ rules, action }: { rules?: AuthorizationRule[]; action: string }) {
  if (!rules || rules.length === 0) {
    return (
      <SectionBox title="Rules">
        <Typography variant="body2">
          {action === 'ALLOW'
            ? 'No rules. An ALLOW policy with no rules denies all traffic to the selected workloads.'
            : action === 'DENY'
            ? 'No rules. A DENY policy with no rules matches nothing.'
            : 'No rules.'}
        </Typography>
      </SectionBox>
    );
  }

  return <RulesTable rules={rules} />;
}

/**
 * The rules table, with a filter box.
 *
 * A gateway ext-authz policy routinely lists fifty or more paths across several
 * rules, and the question people actually arrive with is "is /order/* covered
 * here, and by which rule". Scrolling chips cannot answer that, so the filter
 * narrows both which rules are shown and which entries inside them.
 */
function RulesTable({ rules }: { rules: AuthorizationRule[] }) {
  const [filter, setFilter] = useState('');
  const trimmed = filter.trim();
  const visible = trimmed ? rules.filter(r => ruleMatches(r, trimmed)) : rules;

  // Keep the original rule numbers: rule 3 stays "3" when 0-2 are filtered out.
  const numbered = visible.map(rule => ({ rule, index: rules.indexOf(rule) }));

  return (
    <SectionBox title={`Rules (${rules.length})`}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        A request matches a rule when <b>all</b> of its from / to / when blocks match. The policy
        applies when <b>any</b> rule matches.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by path, method, host, principal…"
          aria-label="Filter rules"
          sx={{ minWidth: '22rem' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon icon="mdi:magnify" width={18} />
              </InputAdornment>
            ),
            endAdornment: trimmed ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setFilter('')} aria-label="Clear filter">
                  <Icon icon="mdi:close" width={16} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {trimmed && (
          <Typography variant="body2" color="text.secondary">
            {visible.length} of {rules.length} rules match <Mono>{trimmed}</Mono>
          </Typography>
        )}
      </Box>

      <SpecTable
        items={numbered}
        emptyText={`No rule mentions "${trimmed}".`}
        columns={[
          { label: '#', render: ({ index }) => <Mono>{index}</Mono>, width: '3rem' },
          {
            label: 'From (source)',
            render: ({ rule }) => <RuleSourceCell rule={rule} filter={trimmed} />,
          },
          {
            label: 'To (operation)',
            render: ({ rule }) => <RuleOperationCell rule={rule} filter={trimmed} />,
          },
          {
            label: 'When (conditions)',
            render: ({ rule }) => <RuleConditionCell rule={rule} filter={trimmed} />,
          },
        ]}
      />
    </SectionBox>
  );
}

/* ------------------------------ PeerAuthentication ------------------------------ */

export function peerAuthenticationHeaderInfo(pa: PeerAuthentication): Row[] {
  return [
    {
      name: 'mTLS mode',
      value: (
        <EnumChip
          value={pa.mtlsMode}
          good={['STRICT']}
          bad={['DISABLE']}
          neutral={['UNSET', 'PERMISSIVE']}
        />
      ),
      hideIfEmpty: false,
    },
    {
      name: 'Scope',
      value:
        pa.metadata.namespace === 'istio-system' && !pa.selectorLabels
          ? 'Mesh-wide (root namespace, no selector)'
          : pa.selectorLabels
          ? 'Selected workloads'
          : `Namespace ${pa.metadata.namespace}`,
      hideIfEmpty: false,
    },
  ];
}

export function peerAuthenticationSections(pa: PeerAuthentication): ReactNode[] {
  const overrides = pa.portOverrides;
  return [
    pa.mtlsMode === 'PERMISSIVE' ? (
      <ConfigWarning key="permissive" severity="info" title="PERMISSIVE accepts plaintext">
        Workloads in scope accept both mTLS and plaintext traffic. This is the migration setting;
        switch to STRICT once all clients are in the mesh.
      </ConfigWarning>
    ) : null,
    pa.mtlsMode === 'DISABLE' ? (
      <ConfigWarning key="disable" severity="warning" title="mTLS is disabled">
        Traffic to workloads in scope is not encrypted or authenticated by the mesh.
      </ConfigWarning>
    ) : null,
    overrides.length ? (
      <SectionBox key="ports" title="Port-level overrides">
        <SpecTable
          items={overrides}
          columns={[
            { label: 'Port', render: o => <Mono>{o.port}</Mono> },
            {
              label: 'Mode',
              render: o => <EnumChip value={o.mode} good={['STRICT']} bad={['DISABLE']} />,
            },
          ]}
        />
      </SectionBox>
    ) : null,
  ];
}

/* ------------------------------ RequestAuthentication ------------------------------ */

export function requestAuthenticationHeaderInfo(ra: RequestAuthentication): Row[] {
  return [
    { name: 'JWT rules', value: String(ra.spec.jwtRules?.length ?? 0), hideIfEmpty: false },
    { name: 'Issuers', value: <ChipList items={ra.issuers} />, hideIfEmpty: false },
  ];
}

export function requestAuthenticationSections(ra: RequestAuthentication): ReactNode[] {
  return [
    <ConfigWarning
      key="note"
      severity="info"
      title="RequestAuthentication does not enforce anything on its own"
    >
      It validates tokens when present. Pair it with an AuthorizationPolicy requiring{' '}
      <Mono>requestPrincipals</Mono> to actually reject unauthenticated requests.
    </ConfigWarning>,
    <SectionBox key="jwt" title={`JWT rules (${ra.spec.jwtRules?.length ?? 0})`}>
      <SpecTable
        items={ra.spec.jwtRules}
        columns={[
          { label: 'Issuer', render: r => <Mono>{r.issuer}</Mono> },
          { label: 'Audiences', render: r => <ChipList items={r.audiences} /> },
          {
            label: 'JWKS',
            render: r => <Mono>{r.jwksUri ?? (r.jwks ? '(inline)' : undefined)}</Mono>,
          },
          {
            label: 'Token from',
            render: r => (
              <ChipList
                items={[
                  ...(r.fromHeaders ?? []).map(
                    h => `header ${h.name}${h.prefix ? ` (${h.prefix})` : ''}`
                  ),
                  ...(r.fromParams ?? []).map(p => `param ${p}`),
                ]}
                emptyText="Authorization: Bearer (default)"
              />
            ),
          },
          {
            label: 'Forward original',
            render: r => <Mono>{String(r.forwardOriginalToken ?? false)}</Mono>,
          },
        ]}
      />
    </SectionBox>,
  ];
}

/** Shared by the list views: a compact selector/targetRef description. */
export function AttachmentCell({
  spec,
  namespace,
}: {
  spec: AuthorizationPolicySpec;
  namespace?: string;
}) {
  const refs = spec.targetRefs ?? (spec.targetRef ? [spec.targetRef] : []);
  if (refs.length > 0) {
    return <TextList items={refs.map(r => `${r.kind ?? '?'}/${r.name ?? '?'}`)} />;
  }
  if (spec.selector?.matchLabels) {
    return (
      <TextList items={Object.entries(spec.selector.matchLabels).map(([k, v]) => `${k}=${v}`)} />
    );
  }
  return (
    <Typography variant="body2" color="text.secondary">
      all of {namespace}
    </Typography>
  );
}

export { Link };
