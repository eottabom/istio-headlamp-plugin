import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface Column<T> {
  label: string;
  render: (item: T, index: number) => ReactNode;
  width?: string;
}

/**
 * Small horizontally scrollable table used by the typed detail sections.
 *
 * Istio sub-objects (subsets, servers, endpoints, routes) are naturally
 * tabular, and a table reads far better than a nested key/value tree for them.
 */
export function SpecTable<T>({
  columns,
  items,
  emptyText = 'None',
}: {
  columns: Column<T>[];
  items?: T[];
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {/*
              Keyed by position, not by label. A column's label is display text
              and can change while the column itself does not; keying on it made
              React treat the changed header as a different cell and leave the
              previous one in the DOM, so the table grew extra empty columns.
            */}
            {columns.map((c, ci) => (
              <TableCell key={ci} sx={{ fontWeight: 600, width: c.width, whiteSpace: 'nowrap' }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={i}>
              {columns.map((c, ci) => (
                // Centred to match Headlamp's own resource tables; with
                // multi-line cells, top alignment left the short columns
                // stranded at the top of a tall row.
                <TableCell key={ci} sx={{ verticalAlign: 'middle' }}>
                  {c.render(item, i)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  if (children === undefined || children === null || children === '') {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
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
