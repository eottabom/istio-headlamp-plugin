import { NameValueTable, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';

export interface Row {
  name: ReactNode;
  value?: ReactNode;
  /** Skip the row when the value is empty. Defaults to true. */
  hideIfEmpty?: boolean;
}

function isEmpty(v: ReactNode): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/**
 * A titled block of name/value rows that drops empty rows automatically.
 *
 * Istio specs are mostly optional fields, so a naive table renders a wall of
 * "—". Dropping empties is what makes a typed detail view shorter than the YAML
 * it replaces.
 */
export function SpecSection({
  title,
  rows,
  children,
  emptyMessage,
}: {
  title: ReactNode;
  rows?: Row[];
  children?: ReactNode;
  emptyMessage?: string;
}) {
  const visible = (rows ?? []).filter(r => r.hideIfEmpty === false || !isEmpty(r.value));

  if (visible.length === 0 && !children) {
    if (!emptyMessage) return null;
    return (
      <SectionBox title={title}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title={title}>
      {visible.length > 0 && (
        <NameValueTable rows={visible.map(({ name, value }) => ({ name, value }))} />
      )}
      {children}
    </SectionBox>
  );
}

function CappedChips({
  items,
  color,
  max,
}: {
  items: (string | number)[];
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  max?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = max ?? items.length;
  const hidden = items.length - limit;
  const shown = expanded || hidden <= 0 ? items : items.slice(0, limit);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minWidth: 0, alignItems: 'center' }}>
      {shown.map((item, i) => (
        <ShrinkableChip key={i} label={String(item)} color={color} />
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
 * A chip that shrinks instead of overflowing its cell.
 *
 * MUI chips do not wrap, so a long value in a narrow table column gets clipped
 * mid-word ("reviews.shop.svc.cluster.loca"). Capping the width makes the label
 * ellipsise cleanly, and the tooltip keeps the full value reachable.
 */
function ShrinkableChip({
  label,
  color,
}: {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}) {
  return (
    <Tooltip title={label}>
      <Chip
        size="small"
        label={label}
        color={color}
        variant="outlined"
        sx={{
          fontFamily: 'monospace',
          maxWidth: '100%',
          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
        }}
      />
    </Tooltip>
  );
}

/** A row of chips, the standard way this plugin renders string lists. */
export function ChipList({
  items,
  color,
  emptyText = '—',
  max,
}: {
  items?: (string | number)[];
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  emptyText?: string;
  /** Show at most this many, with a toggle for the rest. */
  max?: number;
}) {
  if (!items || items.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        {emptyText}
      </Typography>
    );
  }
  return (
    <CappedChips items={items} color={color} max={max} />
  );
}

/** Inline warning used for the configuration checks this plugin performs. */
export function ConfigWarning({
  severity = 'warning',
  title,
  children,
}: {
  severity?: 'warning' | 'error' | 'info' | 'success';
  title?: string;
  children: ReactNode;
}) {
  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      {title && <Typography sx={{ fontWeight: 600 }}>{title}</Typography>}
      {children}
    </Alert>
  );
}

/**
 * Long values rendered as wrapping monospace lines.
 *
 * Chips cannot wrap, so a fully qualified host in a table cell gets clipped
 * mid-word ("reviews.shop.svc.cluster.loca"). Anything that can be long -- host
 * names, OCI URLs -- uses this instead.
 */
export function TextList({ items, emptyText = '—' }: { items?: (string | number)[]; emptyText?: string }) {
  if (!items || items.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      {items.map((item, i) => (
        <Typography
          key={i}
          variant="body2"
          sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere', lineHeight: 1.35 }}
        >
          {item}
        </Typography>
      ))}
    </Box>
  );
}

/** Key=value label pairs, e.g. a workload selector. */
export function LabelPairs({ labels }: { labels?: Record<string, string> }) {
  const entries = Object.entries(labels ?? {});
  if (entries.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}>
      {entries.map(([k, v]) => (
        <ShrinkableChip key={k} label={`${k}=${v}`} />
      ))}
    </Box>
  );
}
