import { fn } from '@storybook/test';
import MarkdownEditor from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MarkdownEditor.js';
import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx } from "react/jsx-runtime";
const meta = {
  title: 'Components/MarkdownEditor',
  component: MarkdownEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A rich markdown editor component used for writing failure documentation and other content in FailSquare.'
      }
    }
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'The current markdown content'
    },
    onChange: {
      action: 'changed',
      description: 'Callback fired when content changes'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when editor is empty'
    },
    height: {
      control: 'text',
      description: 'Height of the editor'
    },
    initialEditType: {
      control: 'radio',
      options: ['markdown', 'wysiwyg'],
      description: 'Initial editing mode'
    }
  }
};
export default meta;
// Wrapper component for interactive stories
const MarkdownEditorWithState = args => {
  const [value, setValue] = useState(args.value || '');
  return /*#__PURE__*/_jsx(MarkdownEditor, {
    ...args,
    value: value,
    onChange: newValue => {
      setValue(newValue);
      fn()(newValue);
    }
  });
};
export const Default = {
  args: {
    placeholder: 'Write your content here...',
    height: '400px',
    initialEditType: 'markdown'
  },
  render: args => /*#__PURE__*/_jsx(MarkdownEditorWithState, {
    ...args
  })
};
export const WithInitialContent = {
  args: {
    value: `# Failure Documentation: Neural Network Tensor Approach

## The Approach
We attempted to implement a novel neural network architecture that treats tensors as vectors rather than scalars...

## The Method
- **Framework**: PyTorch 2.0
- **Hardware**: NVIDIA A100 GPU
- **Duration**: 3 months

## The Failure
The approach failed due to exponential memory scaling:

\`\`\`python
# Memory usage grew exponentially with layer depth
memory_usage = O(n^3) where n = layer_depth
\`\`\`

## Key Findings
- Memory requirements exceeded available GPU memory at layer 12
- Training time increased by 400% compared to baseline
- No significant accuracy improvements observed`,
    placeholder: 'Document your failure here...',
    height: '500px',
    initialEditType: 'markdown'
  },
  render: args => /*#__PURE__*/_jsx(MarkdownEditorWithState, {
    ...args
  })
};
export const Compact = {
  args: {
    placeholder: 'Quick notes...',
    height: '200px',
    initialEditType: 'markdown'
  },
  render: args => /*#__PURE__*/_jsx(MarkdownEditorWithState, {
    ...args
  })
};
export const WysiwygMode = {
  args: {
    value: '**Start typing in WYSIWYG mode**\n\nThis mode provides a rich text editing experience.',
    placeholder: 'Write your content here...',
    height: '400px',
    initialEditType: 'wysiwyg'
  },
  render: args => /*#__PURE__*/_jsx(MarkdownEditorWithState, {
    ...args
  })
};