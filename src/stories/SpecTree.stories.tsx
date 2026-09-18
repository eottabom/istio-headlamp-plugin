import { Box } from '@mui/material';
import { Meta, StoryObj } from '@storybook/react';
import { InlineSpec } from '../components/common/InlineSpec';
import { SpecTree } from '../components/common/SpecTree';
import { customTags, serviceEntrySpec, trafficPolicy } from './fixtures';

/**
 * The generic spec renderers.
 *
 * `SpecTree` is the full-width one that guarantees no field is ever invisible;
 * `InlineSpec` is the flattened version for table cells, where the tree's
 * chevrons and guide lines outweighed the content.
 */
const meta: Meta<typeof SpecTree> = {
  title: 'Istio/Spec renderers',
  component: SpecTree,
  decorators: [
    Story => (
      <Box sx={{ maxWidth: 720, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};
export default meta;

type TreeStory = StoryObj<typeof SpecTree>;
type InlineStory = StoryObj<typeof InlineSpec>;

export const TreeTrafficPolicy: TreeStory = {
  args: { value: trafficPolicy },
};

export const TreeServiceEntry: TreeStory = {
  args: { value: serviceEntrySpec },
};

/** Long scalar lists fold behind "+N more" rather than filling the page. */
export const TreeLongList: TreeStory = {
  args: { value: { paths: Array.from({ length: 50 }, (_, i) => `/service-${i}/*`) } },
};

/** Data keys must survive verbatim: this name has to stay copy-pasteable. */
export const TreeEnvironmentVariables: TreeStory = {
  args: {
    value: {
      environmentVariables: {
        ISTIO_META_DNS_CAPTURE: 'true',
        ISTIO_META_DNS_AUTO_ALLOCATE: 'true',
      },
      concurrency: 4,
    },
  },
};

export const TreeEmpty: TreeStory = {
  args: { value: {} },
};

export const InlineCustomTags: InlineStory = {
  render: args => <InlineSpec {...args} />,
  args: { value: customTags },
};

export const InlineTrafficPolicy: InlineStory = {
  render: args => <InlineSpec {...args} />,
  args: { value: trafficPolicy },
};
