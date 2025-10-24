import { within, userEvent } from '@storybook/test';
import { BrowserRouter } from 'react-router-dom';
import { ExperimentOutlined, FileTextOutlined, BarChartOutlined, UserOutlined } from '@ant-design/icons';
import TabsBar from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/TabsBar.js';
import { TabProvider } from '../contexts/TabContext';
import { useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabs } from '../contexts/TabContext';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/TabsBar',
  component: TabsBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A tab navigation component that allows users to manage multiple open pages/views in FailSquare. Supports drag & drop reordering, touch gestures for mobile, and tab closing.'
      }
    }
  },
  decorators: [Story => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsx(Story, {})
    })
  })]
};
export default meta;
// Helper component to set up tabs for stories
const TabsBarWithTabs = ({
  initialTabs
}) => {
  const {
    openTab
  } = useTabs();
  useEffect(() => {
    initialTabs.forEach(tab => {
      openTab(tab);
    });
  }, [openTab, initialTabs]);
  return /*#__PURE__*/_jsx(TabsBar, {});
};
export const Default = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsx(TabsBar, {})
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Default state with just the Dashboard tab (non-closable).'
      }
    }
  }
};
export const WithMultipleTabs = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsx(TabsBarWithTabs, {
        initialTabs: [{
          title: 'Submit Failure',
          path: '/submit-failure',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'Failure History',
          path: '/failure-history',
          icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
          closable: true
        }, {
          title: 'Analytics',
          path: '/analytics',
          icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
          closable: true
        }]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Multiple tabs with different FailSquare pages. Shows icons and closable tabs.'
      }
    }
  }
};
export const ManyTabsOverflow = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsx(TabsBarWithTabs, {
        initialTabs: [{
          title: 'Neural Network Tensor Architecture',
          path: '/failure/neural-network-tensor',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'Quantum Error Correction Attempt',
          path: '/failure/quantum-error-correction',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'Distributed Graph Database',
          path: '/failure/distributed-graph-db',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'Post-Quantum Cryptography',
          path: '/failure/post-quantum-crypto',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'Real-time ML Pipeline',
          path: '/failure/realtime-ml-pipeline',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'Blockchain Consensus',
          path: '/failure/blockchain-consensus',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          closable: true
        }, {
          title: 'User Profile',
          path: '/profile',
          icon: /*#__PURE__*/_jsx(UserOutlined, {}),
          closable: true
        }]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows how the tab bar behaves when there are many tabs, demonstrating horizontal scrolling.'
      }
    }
  }
};
export const WithLongTitles = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsx(TabsBarWithTabs, {
        initialTabs: [{
          title: 'A Very Long Tab Title That Should Get Truncated',
          path: '/long-title-1',
          closable: true
        }, {
          title: 'Another Extremely Long Tab Title For Testing Purposes',
          path: '/long-title-2',
          closable: true
        }, {
          title: 'Short',
          path: '/short',
          closable: true
        }]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Tests how long tab titles are handled with text truncation.'
      }
    }
  }
};
export const MixedClosableTypes = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsx(TabsBarWithTabs, {
        initialTabs: [{
          title: 'Analytics (Pinned)',
          path: '/analytics-pinned',
          icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
          closable: false
        }, {
          title: 'Failure Documentation',
          path: '/failure-doc',
          icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
          closable: true
        }, {
          title: 'User Settings',
          path: '/settings',
          icon: /*#__PURE__*/_jsx(UserOutlined, {}),
          closable: true
        }]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Mix of closable and non-closable tabs. Non-closable tabs don\'t show close buttons.'
      }
    }
  }
};

// Interactive test story
export const Interactive = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(TabProvider, {
      children: /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsxs("div", {
          className: "mb-4 p-4 bg-gray-100 text-sm",
          children: [/*#__PURE__*/_jsx("p", {
            children: /*#__PURE__*/_jsx("strong", {
              children: "Interactive Demo:"
            })
          }), /*#__PURE__*/_jsxs("ul", {
            className: "list-disc ml-4 mt-2",
            children: [/*#__PURE__*/_jsx("li", {
              children: "Click tabs to activate them"
            }), /*#__PURE__*/_jsx("li", {
              children: "Click X to close closable tabs"
            }), /*#__PURE__*/_jsx("li", {
              children: "Drag tabs to reorder them"
            }), /*#__PURE__*/_jsx("li", {
              children: "On mobile: swipe left to close tabs"
            })]
          })]
        }), /*#__PURE__*/_jsx(TabsBarWithTabs, {
          initialTabs: [{
            title: 'Submit New Failure',
            path: '/submit',
            icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
            closable: true
          }, {
            title: 'Browse Failures',
            path: '/browse',
            icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
            closable: true
          }, {
            title: 'My Profile',
            path: '/profile',
            icon: /*#__PURE__*/_jsx(UserOutlined, {}),
            closable: true
          }]
        })]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing all tab functionality including drag & drop reordering and tab closing.'
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);

    // Test tab clicking
    const firstTab = canvas.getByText('Submit New Failure');
    await userEvent.click(firstTab);

    // Test closing a tab (find close button)
    const closeBtns = canvas.getAllByLabelText('Close tab');
    if (closeBtns.length > 0) {
      await userEvent.click(closeBtns[0]);
    }
  }
};