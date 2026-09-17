import { Box } from '@mui/material';
import { Meta, StoryObj } from '@storybook/react';
import { ChipList, ConfigWarning, LabelPairs, SpecSection, TextList } from '../components/common/SpecSection';
import { SpecTable } from '../components/detail/Table';
import { serviceEntrySpec } from './fixtures';

/**
 * The building blocks every detail page is made of.
 *
 * The chip lists are here because chips cannot wrap: a fully qualified host in
 * a narrow column used to be clipped mid-word, and the fix (shrink plus a
 * tooltip, or wrapping text for anything long) is easiest to judge side by side.
 */
const meta: Meta<typeof SpecSection> = {
  title: 'Istio/Sections',
  component: SpecSection,
  decorators: [
    Story => (
      <Box sx={{ maxWidth: 680, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};
export default meta;

/** Rows whose value is empty drop out, which is what keeps these short. */
export const SectionDropsEmptyRows: StoryObj<typeof SpecSection> = {
  args: {
    title: 'Service entry',
    rows: [
      { name: 'Location', value: 'MESH_EXTERNAL' },
      { name: 'Resolution', value: 'DNS' },
      { name: 'Addresses (VIPs)', value: undefined },
      { name: 'Subject alternative names', value: [] },
    ],
  },
};

export const EmptySection: StoryObj<typeof SpecSection> = {
  args: { title: 'Endpoints', rows: [], emptyMessage: 'None defined.' },
};

/** A long value in a narrow box: the chip ellipsises, the text wraps. */
export const ChipsVersusText: StoryObj = {
  render: () => (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 260 }}>
      <ChipList items={['reviews.shop.svc.cluster.local', 'v1']} />
      <TextList items={['reviews.shop.svc.cluster.local', 'orders.shop.svc.cluster.local']} />
      <LabelPairs labels={{ app: 'reviews', 'istio.io/use-waypoint': 'shop-waypoint' }} />
    </Box>
  ),
};

/** Long lists cap, so one rule cannot push the rest of the page off screen. */
export const CappedChipList: StoryObj = {
  render: () => <ChipList items={Array.from({ length: 40 }, (_, i) => `/service-${i}/*`)} max={8} />,
};

export const Warnings: StoryObj = {
  render: () => (
    <Box>
      <ConfigWarning severity="error" title="L7 rules will not be enforced">
        No waypoint was found for the targets of this policy.
      </ConfigWarning>
      <ConfigWarning severity="warning" title="This ServiceEntry may not do what you expect">
        resolution is STATIC but no endpoints are defined; traffic will not be routed.
      </ConfigWarning>
      <ConfigWarning severity="success" title="L7 policy is enforced at the gateway">
        The targeted gateway terminates L7 itself, so no waypoint is needed.
      </ConfigWarning>
      <ConfigWarning severity="info" title="Sidecar has no effect on ambient workloads">
        This resource only configures injected sidecar proxies.
      </ConfigWarning>
    </Box>
  ),
};

export const Table: StoryObj = {
  render: () => (
    <SpecTable
      items={serviceEntrySpec.ports}
      columns={[
        { label: 'Name', render: p => <span>{p.name}</span> },
        { label: 'Port', render: p => <span>{p.number}</span> },
        { label: 'Protocol', render: p => <span>{p.protocol}</span> },
      ]}
    />
  ),
};
