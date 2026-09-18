import { Icon } from '@iconify/react';
import { Box, Button, Chip, Collapse, IconButton, Typography, useTheme } from '@mui/material';
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
  return (
    <Box>
      {items.map((item, i) => (
        <Nested key={i} label={`[${i}]`} startOpen={depth < collapseDepth && items.length <= 8}>
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
        const isComplex = val !== null && typeof val === 'object';
        if (isComplex) {
          return (
            <Box key={key} sx={{ gridColumn: '1 / -1' }}>
              <Nested label={humanizeKey(key)} startOpen={depth < collapseDepth}>
                <SpecTree value={val} collapseDepth={collapseDepth} depth={depth + 1} />
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
        >
          <Icon icon={open ? 'mdi:chevron-down' : 'mdi:chevron-right'} width={18} />
        </IconButton>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}
        >
          {label}
        </Typography>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box
          sx={{
            ml: 1.75,
            pl: 1.5,
            borderLeft: `2px solid ${theme.palette.divider}`,
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
