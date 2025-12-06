/**
 * Test fixture for usePredictHint hook
 * usePredictHint allows manual registration of predictive rendering hints
 * Used when automatic prediction isn't sufficient
 */

import { usePredictHint, useState } from '@minimact/core';

export function TestUsePredictHint() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Register prediction hints for tab switching
  // The server will pre-compute patches for these state transitions
  usePredictHint('tab-overview', { activeTab: 'overview' });
  usePredictHint('tab-details', { activeTab: 'details' });
  usePredictHint('tab-reviews', { activeTab: 'reviews' });
  usePredictHint('tab-related', { activeTab: 'related' });

  // Register hints for expand/collapse
  usePredictHint('expanded', { isExpanded: true });
  usePredictHint('collapsed', { isExpanded: false });

  // Register hints for view mode toggle
  usePredictHint('view-grid', { viewMode: 'grid' });
  usePredictHint('view-list', { viewMode: 'list' });

  // Register compound hints (multiple state changes)
  usePredictHint('reset-view', {
    activeTab: 'overview',
    isExpanded: false,
    viewMode: 'grid',
    selectedItems: []
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleReset = () => {
    setActiveTab('overview');
    setIsExpanded(false);
    setViewMode('grid');
    setSelectedItems([]);
  };

  return (
    <div className="predict-hint-test">
      <h2>Predictive Hint Test</h2>

      <div className="controls">
        <button onClick={handleReset}>Reset View</button>
        <button onClick={handleToggleExpand}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
        <div className="view-toggle">
          <button
            onClick={() => handleViewModeChange('grid')}
            className={viewMode === 'grid' ? 'active' : ''}
          >
            Grid
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={viewMode === 'list' ? 'active' : ''}
          >
            List
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          onClick={() => handleTabChange('overview')}
          className={activeTab === 'overview' ? 'active' : ''}
        >
          Overview
        </button>
        <button
          onClick={() => handleTabChange('details')}
          className={activeTab === 'details' ? 'active' : ''}
        >
          Details
        </button>
        <button
          onClick={() => handleTabChange('reviews')}
          className={activeTab === 'reviews' ? 'active' : ''}
        >
          Reviews
        </button>
        <button
          onClick={() => handleTabChange('related')}
          className={activeTab === 'related' ? 'active' : ''}
        >
          Related
        </button>
      </div>

      <div className={`content ${isExpanded ? 'expanded' : ''} ${viewMode}`}>
        {activeTab === 'overview' && (
          <div className="tab-content overview">
            <h3>Product Overview</h3>
            <p>This is the overview content.</p>
          </div>
        )}
        {activeTab === 'details' && (
          <div className="tab-content details">
            <h3>Product Details</h3>
            <p>This is the details content.</p>
          </div>
        )}
        {activeTab === 'reviews' && (
          <div className="tab-content reviews">
            <h3>Customer Reviews</h3>
            <p>This is the reviews content.</p>
          </div>
        )}
        {activeTab === 'related' && (
          <div className="tab-content related">
            <h3>Related Products</h3>
            <p>This is the related products content.</p>
          </div>
        )}
      </div>

      <div className="selection-info">
        Selected items: {selectedItems.length}
      </div>
    </div>
  );
}
