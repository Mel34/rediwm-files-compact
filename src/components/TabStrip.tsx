import React from 'react';
import { Folder, Plus, X } from 'lucide-react';
import type { TabPlacementMode, ToolbarDensity } from '../types';

export interface TabStripItem {
  id: string;
  label: string;
  pathTitle: string;
}

interface TabStripProps {
  tabs: TabStripItem[];
  activeTabId: string;
  placement: TabPlacementMode;
  density?: ToolbarDensity;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabStrip: React.FC<TabStripProps> = ({
  tabs,
  activeTabId,
  placement,
  density = 'sweet-spot',
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const isTitlebar = placement === 'titlebar';
  const isPaneScoped = placement === 'pane-scoped';

  const tabHeightClass =
    density === 'compact'
      ? 'h-7 px-2'
      : density === 'sweet-spot'
      ? 'h-[30px] px-2.5'
      : 'h-8 px-2.5';

  return (
    <div
      role="tablist"
      aria-label="Open directory tabs"
      className={`flex min-w-0 items-end gap-1 overflow-x-auto select-none ${
        isTitlebar
          ? `flex-1 pl-1 ${density === 'compact' ? 'pt-0.5' : 'pt-1'}`
          : isPaneScoped
          ? `border-b border-[#30333a] bg-[#1e2024] px-2 ${density === 'compact' ? 'pt-1' : 'pt-1.5'}`
          : `border-b border-[#2b2d33] bg-[#1b1d21] px-2.5 ${density === 'compact' ? 'pt-1' : 'pt-1.5'}`
      }`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const canClose = tabs.length > 1;

        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            title={tab.pathTitle}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1 && canClose) {
                e.preventDefault();
                onCloseTab(tab.id);
              }
            }}
            className={`group relative flex min-w-[108px] max-w-[188px] cursor-pointer items-center justify-between gap-2 rounded-t-md border-x border-t text-xs transition-colors duration-100 ${tabHeightClass} ${
              isActive
                ? isTitlebar
                  ? 'border-[#33363d] bg-[#24262a] text-[#f3f4f6]'
                  : isPaneScoped
                  ? 'border-[#33363d] bg-[#25272b] text-[#f3f4f6]'
                  : 'border-[#33363d] bg-[#24262a] text-[#f3f4f6]'
                : 'border-transparent bg-transparent text-[#9ca3af] hover:bg-[#282b30]/70 hover:text-[#e5e7eb]'
            }`}
          >
            {/* Subtle top accent rule on active tab (2px top edge, matching RediWM amber) */}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[2px] rounded-t-md bg-[#c48e51]"
              />
            )}

            <div className="flex min-w-0 items-center gap-1.5">
              <Folder
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive ? 'fill-[#c48e51]/80 text-[#c48e51]' : 'fill-[#6b7280]/50 text-[#6b7280]'
                }`}
              />
              <span className="truncate font-medium">{tab.label}</span>
            </div>

            {canClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                aria-label={`Close ${tab.label} tab`}
                className={`rounded p-0.5 transition-opacity duration-100 hover:bg-[#3a3d45] hover:text-white ${
                  isActive ? 'opacity-75 hover:opacity-100' : 'opacity-0 group-hover:opacity-75'
                }`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onNewTab}
        aria-label="Open new tab"
        title="New tab (Ctrl+T)"
        className="mb-1 ml-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#9ca3af] transition-colors hover:bg-[#31343a] hover:text-[#f3f4f6]"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
