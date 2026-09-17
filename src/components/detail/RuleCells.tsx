import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { AuthorizationRule } from '../../resources/types';
import { ChipList } from '../common/SpecSection';

/**
 * Compact renderers for AuthorizationPolicy rules.
 *
 * The generic spec tree was technically complete but unreadable here: every
 * `from`/`to` entry became a collapsible `[0]` node, and each field another
 * level of chevrons and guide lines, so three facts filled 250px of vertical
 * space and the tree chrome outweighed the content. These render the same data
 * as short labelled lines, which is closer to how the policy actually reads.
 */

/** Case-insensitive substring match, the same rule the filter box advertises. */
export function matches(value: string, filter: string): boolean {
  return value.toLowerCase().includes(filter.toLowerCase());
}

function applyFilter(items: string[] | undefined, filter?: string): string[] | undefined {
  if (!items || !filter) return items;
  return items.filter(i => matches(i, filter));
}

/** One labelled line: `namespace   shop`. Negated fields are marked and red. */
function Field({
  label,
  items,
  negated,
  filter,
}: {
  label: string;
  items?: string[];
  negated?: boolean;
  filter?: string;
}) {
  const all = items ?? [];
  const shown = applyFilter(items, filter) ?? [];
  if (shown.length === 0) return null;
  const hiddenByFilter = all.length - shown.length;
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', mb: 0.5, minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          minWidth: '6.5rem',
          flexShrink: 0,
          fontWeight: 600,
          color: negated ? 'error.main' : 'text.secondary',
        }}
      >
        {negated ? `not ${label}` : label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <ChipList items={shown} max={8} color={negated ? 'error' : undefined} />
        {hiddenByFilter > 0 && (
          <Typography variant="caption" color="text.disabled">
            {hiddenByFilter} more hidden by the filter
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function Any({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.disabled">
      {children}
    </Typography>
  );
}

/** Separates alternative blocks, which Istio ORs together. */
function Or() {
  return (
    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', my: 0.5 }}>
      or
    </Typography>
  );
}

export function RuleSourceCell({ rule, filter }: { rule: AuthorizationRule; filter?: string }) {
  if (!rule.from || rule.from.length === 0) return <Any>any source</Any>;

  return (
    <Box sx={{ minWidth: 0 }}>
      {rule.from.map((from, i) => {
        const s = from.source ?? {};
        return (
          <Box key={i}>
            {i > 0 && <Or />}
            <Field label="service acct" items={s.principals} filter={filter} />
            <Field label="service acct" items={s.notPrincipals} filter={filter} negated />
            <Field label="namespace" items={s.namespaces} filter={filter} />
            <Field label="namespace" items={s.notNamespaces} filter={filter} negated />
            <Field label="JWT subject" items={s.requestPrincipals} filter={filter} />
            <Field label="JWT subject" items={s.notRequestPrincipals} filter={filter} negated />
            <Field label="IP block" items={s.ipBlocks} filter={filter} />
            <Field label="IP block" items={s.notIpBlocks} filter={filter} negated />
            <Field label="remote IP" items={s.remoteIpBlocks} filter={filter} />
            <Field label="remote IP" items={s.notRemoteIpBlocks} filter={filter} negated />
          </Box>
        );
      })}
    </Box>
  );
}

export function RuleOperationCell({ rule, filter }: { rule: AuthorizationRule; filter?: string }) {
  if (!rule.to || rule.to.length === 0) return <Any>any operation</Any>;

  return (
    <Box sx={{ minWidth: 0 }}>
      {rule.to.map((to, i) => {
        const op = to.operation ?? {};
        return (
          <Box key={i}>
            {i > 0 && <Or />}
            <Field label="method" items={op.methods} filter={filter} />
            <Field label="method" items={op.notMethods} filter={filter} negated />
            <Field label="path" items={op.paths} filter={filter} />
            <Field label="path" items={op.notPaths} filter={filter} negated />
            <Field label="host" items={op.hosts} filter={filter} />
            <Field label="host" items={op.notHosts} filter={filter} negated />
            <Field label="port" items={op.ports} filter={filter} />
            <Field label="port" items={op.notPorts} filter={filter} negated />
          </Box>
        );
      })}
    </Box>
  );
}

export function RuleConditionCell({ rule, filter }: { rule: AuthorizationRule; filter?: string }) {
  const conditions = (rule.when ?? []).filter(
    c =>
      !filter ||
      matches(c.key ?? '', filter) ||
      [...(c.values ?? []), ...(c.notValues ?? [])].some(v => matches(v, filter))
  );
  if (conditions.length === 0) return <Any>—</Any>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
      {conditions.map((cond, i) => (
        <Box key={i} sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', display: 'block', color: 'text.secondary' }}
          >
            {cond.key}
          </Typography>
          <ChipList
            items={cond.values ?? cond.notValues}
            max={8}
            color={cond.notValues ? 'error' : undefined}
          />
        </Box>
      ))}
    </Box>
  );
}
