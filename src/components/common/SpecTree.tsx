import { Box, Button, Chip, Collapse, Typography, useTheme } from '@mui/material';
import { ReactNode, useState } from 'react';

/**
 * Renders an arbitrary chunk of an Istio spec as readable rows.
 *
 * This is the safety net behind every typed detail view: whatever a newer Istio
 * release adds, or whatever a typed section chooses not to cover, still shows
 * up here instead of forcing the user into the YAML editor.
 */

export interface SpecTreeProps {
  value: unknown;
  /** Depth at which nested nodes start collapsed. */
  collapseDepth?: number;
  /** Internal: current nesting depth. */
  depth?: number;
}

const MAX_DEPTH = 12;

export function SpecTree({ value, collapseDepth = 3, depth = 0 }: SpecTreeProps) {
  if (depth > MAX_DEPTH) {
    return <Mono>…</Mono>;
  }
  if (value === null || value === undefined) {
    return <Muted>—</Muted>;
  }
  if (Array.isArray(value)) {
    return <ArrayNode items={value} collapseDepth={collapseDepth} depth={depth} />;
  }
  if (typeof value === 'object') {
    return (
      <ObjectNode
        obj={value as Record<string, unknown>}
        collapseDepth={collapseDepth}
        depth={depth}
      />
    );
  }
  return <Scalar value={value} />;
}

function Scalar({ value }: { value: unknown }) {
  if (typeof value === 'boolean') {
    return (
      <Chip
        size="small"
        label={String(value)}
        color={value ? 'success' : 'default'}
        variant="outlined"
      />
    );
  }
  if (typeof value === 'number') {
    return <Mono>{value}</Mono>;
  }
  const text = String(value);
  // Long values (certificates, CEL expressions, wasm URLs) read better as blocks.
  if (text.length > 80 || text.includes('\n')) {
    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1,
          fontSize: '0.78rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          bgcolor: 'action.hover',
          borderRadius: 1,
        }}
      >
        {text}
      </Box>
    );
  }
  return <Mono>{text}</Mono>;
}

/**
 * How many entries of a long list to show before folding the rest away.
 *
 * Production AuthorizationPolicies commonly carry fifty or more paths, which
 * pushes everything below them off the page.
 */
const INLINE_LIST_LIMIT = 12;

function ScalarList({ items }: { items: unknown[] }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - INLINE_LIST_LIMIT;
  const shown = expanded ? items : items.slice(0, INLINE_LIST_LIMIT);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {shown.map((item, i) => (
        <Chip
          key={i}
          size="small"
          label={String(item)}
          variant="outlined"
          sx={{ fontFamily: 'monospace', maxWidth: '100%' }}
        />
      ))}
      {hidden > 0 && (
        <Button size="small" onClick={() => setExpanded(e => !e)} sx={{ textTransform: 'none' }}>
          {expanded ? 'Show less' : `+${hidden} more`}
        </Button>
      )}
    </Box>
  );
}

/**
 * Keys whose value is user data rather than a nested schema object: labels,
 * annotations, environment variables. Walking into them adds a level of
 * indentation to show a flat list of key=value pairs, and their keys must not
 * be prettified (`app` is a label name, not the word "App").
 */
const FREE_FORM_MAPS = new Set([
  'labels',
  'matchLabels',
  'annotations',
  'proxyMetadata',
  'environmentVariables',
  'env',
  'nodeSelector',
  'customTags',
]);

function isFlatMap(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every(v => v === null || typeof v !== 'object')
  );
}

function MapChips({ map }: { map: Record<string, unknown> }) {
  return <ScalarList items={Object.entries(map).map(([k, v]) => `${k}=${String(v)}`)} />;
}

/**
 * `selector` -> `matchLabels` -> ... is three levels of chrome around one
 * value. A chain of single-key objects collapses into one heading, so the
 * shape stays visible without the reader walking down a staircase.
 */
function flattenChain(key: string, value: unknown): { label: string; value: unknown } {
  let label = humanizeKey(key);
  let current = value;
  while (
    current !== null &&
    typeof current === 'object' &&
    !Array.isArray(current) &&
    Object.keys(current as object).length === 1
  ) {
    const [childKey, childValue] = Object.entries(current as Record<string, unknown>)[0];
    if (childValue === null || typeof childValue !== 'object' || Array.isArray(childValue)) break;
    if (FREE_FORM_MAPS.has(childKey) && isFlatMap(childValue)) break;
    label = `${label} › ${humanizeKey(childKey)}`;
    current = childValue;
  }
  return { label, value: current };
}

/**
 * A heading for one entry of a list of objects.
 *
 * The index leads, because order is meaningful in route and filter lists and
 * it is how the API, `istioctl` and every error message refer to an entry.
 * Istio sub-objects usually carry something identifying too -- a name, a host,
 * an operation -- and appending it saves opening each node to find the one
 * rule you came for.
 */
const SUMMARY_KEYS = [
  'name',
  'host',
  'hosts',
  'applyTo',
  'operation',
  'kind',
  'key',
  'issuer',
  'port',
  'number',
  'mode',
  'prefix',
  'provider',
  'service',
];

function summarise(item: unknown, index: number): string {
  const fallback = `[${index}]`;
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return fallback;

  const obj = item as Record<string, unknown>;
  for (const key of SUMMARY_KEYS) {
    const value = obj[key];
    if (typeof value === 'string' || typeof value === 'number') return `[${index}] ${value}`;
    if (Array.isArray(value) && (typeof value[0] === 'string' || typeof value[0] === 'number')) {
      const more = value.length > 1 ? ` +${value.length - 1}` : '';
      return `[${index}] ${value[0]}${more}`;
    }
    if (value !== null && typeof value === 'object') {
      const nested = Object.values(value as Record<string, unknown>).find(
        v => typeof v === 'string' || typeof v === 'number'
      );
      if (nested !== undefined) return `[${index}] ${nested}`;
    }
  }
  // Nothing identifying: name the entry after what it configures, which at
  // least distinguishes a header match from a path match.
  const firstKey = Object.keys(obj)[0];
  return firstKey ? `[${index}] ${humanizeKey(firstKey)}` : fallback;
}

/** An object whose values are all scalars, so it fits one table row. */
function isRowLike(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(v => v === null || typeof v !== 'object')
  );
}

const TABLE_MAX_COLUMNS = 6;

/**
 * A list of flat objects is a table: ports, subsets, endpoints, JWT rules. A
 * stack of collapsed nodes made the reader open each one to compare fields
 * that line up perfectly in columns.
 */
function ObjectTable({ items }: { items: Record<string, unknown>[] }) {
  const columns = [...new Set(items.flatMap(item => Object.keys(item)))];
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%' }}>
        <Box component="thead">
          <Box component="tr">
            {columns.map(column => (
              <Box
                key={column}
                component="th"
                sx={{
                  textAlign: 'left',
                  px: 1,
                  py: 0.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  whiteSpace: 'nowrap',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {humanizeKey(column)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {items.map((item, i) => (
            <Box key={i} component="tr">
              {columns.map(column => (
                <Box
                  key={column}
                  component="td"
                  sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}
                >
                  {item[column] === undefined ? <Muted>—</Muted> : <Scalar value={item[column]} />}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ArrayNode({
  items,
  collapseDepth,
  depth,
}: {
  items: unknown[];
  collapseDepth: number;
  depth: number;
}) {
  if (items.length === 0) {
    return <Muted>(empty list)</Muted>;
  }
  const allScalar = items.every(i => i === null || typeof i !== 'object');
  if (allScalar) {
    return <ScalarList items={items} />;
  }
  // One entry needs no numbering: the parent heading already names it, and
  // "Match > Item 1 > ..." is a click and a level for nothing.
  if (items.length === 1) {
    return <SpecTree value={items[0]} collapseDepth={collapseDepth} depth={depth} />;
  }
  if (items.every(isRowLike)) {
    const columns = new Set(items.flatMap(item => Object.keys(item)));
    if (columns.size <= TABLE_MAX_COLUMNS) {
      return <ObjectTable items={items as Record<string, unknown>[]} />;
    }
  }
  return (
    <Box>
      {items.map((item, i) => (
        <Nested
          key={i}
          label={summarise(item, i)}
          startOpen={depth < collapseDepth && items.length <= 8}
        >
          <SpecTree value={item} collapseDepth={collapseDepth} depth={depth + 1} />
        </Nested>
      ))}
    </Box>
  );
}

function ObjectNode({
  obj,
  collapseDepth,
  depth,
}: {
  obj: Record<string, unknown>;
  collapseDepth: number;
  depth: number;
}) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return <Muted>(empty)</Muted>;
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, max-content) 1fr',
        columnGap: 2,
        rowGap: 0.75,
      }}
    >
      {entries.map(([key, val]) => {
        // Label maps and environment variables read as chips on one row.
        if (FREE_FORM_MAPS.has(key) && isFlatMap(val)) {
          return (
            <Box key={key} sx={{ display: 'contents' }}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
                {humanizeKey(key)}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <MapChips map={val} />
              </Box>
            </Box>
          );
        }

        // A list of plain values is chips on one row; wrapping it in a
        // collapsible node hid `hosts: [one entry]` behind a click.
        if (
          Array.isArray(val) &&
          val.length > 0 &&
          val.every(v => v === null || typeof v !== 'object')
        ) {
          return (
            <Box key={key} sx={{ display: 'contents' }}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
                {humanizeKey(key)}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <ScalarList items={val} />
              </Box>
            </Box>
          );
        }

        const isComplex = val !== null && typeof val === 'object';
        if (isComplex) {
          const chain = flattenChain(key, val);
          return (
            <Box key={key} sx={{ gridColumn: '1 / -1' }}>
              <Nested label={chain.label} startOpen={depth < collapseDepth}>
                <SpecTree value={chain.value} collapseDepth={collapseDepth} depth={depth + 1} />
              </Nested>
            </Box>
          );
        }
        return (
          <Box key={key} sx={{ display: 'contents' }}>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
              {humanizeKey(key)}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Scalar value={val} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function Nested({
  label,
  startOpen,
  children,
}: {
  label: string;
  startOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  const theme = useTheme();
  return (
    <Box sx={{ mt: 0.5 }}>
      {/*
        One clickable row: a [+]/[-] box and the heading. The chevron icon
        button was taller than the row it introduced, which is most of why a
        few nested fields filled the screen.
      */}
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(o => !o);
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: 0.5,
          px: 0.25,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 14,
            height: 14,
            lineHeight: '12px',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 0.5,
            color: 'text.secondary',
          }}
        >
          {open ? '−' : '+'}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box
          sx={{
            ml: '6px',
            pl: 1.5,
            borderLeft: `1px solid ${theme.palette.divider}`,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="span"
      variant="body2"
      sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
    >
      {children}
    </Typography>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <Typography component="span" variant="body2" color="text.disabled">
      {children}
    </Typography>
  );
}

/**
 * `randomSamplingPercentage` -> `Random sampling percentage`.
 *
 * Only schema field names are rewritten. Plenty of keys in an Istio spec are
 * *data* -- environment variable names, label keys, header names -- and
 * prettifying those changes the value the user needs to read or copy
 * (`ISTIO_META_DNS_CAPTURE` must not render as "ISTIO META DNS CAPTURE").
 */
export function humanizeKey(key: string): string {
  if (isDataKey(key)) return key;
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/-+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Keys that are values in their own right rather than Istio schema fields. */
function isDataKey(key: string): boolean {
  return (
    key.includes('_') || // ENV_VAR_STYLE
    key.includes('.') || // app.kubernetes.io/name, request.auth.claims
    key.includes('/') || // label and annotation keys
    key.includes(':') ||
    key.includes('[') || // request.headers[x-admin]
    /^[A-Z0-9-]+$/.test(key) // ALL-CAPS header names
  );
}
