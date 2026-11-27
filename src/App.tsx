import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  ClipboardPaste,
  Copy,
  File as FileIcon,
  Filter,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  Minus,
  Plus,
  RotateCcw,
  RefreshCw,
  Scissors,
  Search,
  Square,
  Terminal,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { BatchPermissionBar } from './components/BatchPermissionBar';
import { LeftSidebar } from './components/LeftSidebar';
import { PermissionCell } from './components/PermissionCell';
import { TabStrip, type TabStripItem } from './components/TabStrip';
import { INITIAL_FILES, PLACES } from './data/mockFiles';
import type {
  FileItem,
  FilePermissions,
  PermissionInteractionMode,
  SidebarTreePattern,
  SortField,
  TabPlacementMode,
  TabState,
  ToolbarDensity,
  TreeVisualStyle,
} from './types';
import { octalToPermissions, permissionsToOctal } from './utils/permissions';

const TAB_PLACEMENTS: {
  id: TabPlacementMode;
  label: string;
  description: string;
}[] = [
  {
    id: 'titlebar',
    label: '1. Titlebar-Integrated',
    description:
      'Zero extra vertical height: tabs merge directly into the window titlebar while the shared nav bar and toolbar below reflect the active tab.',
  },
  {
    id: 'below-titlebar',
    label: '2. Below Titlebar',
    description:
      'Classic desktop FM strip: preserves a dedicated RediWM drag titlebar while clearly scoping the nav bar, sidebar, and file list beneath the active tab.',
  },
  {
    id: 'pane-scoped',
    label: '3. Pane-Scoped',
    description:
      'Anchored Places sidebar on the left; tabs sit directly above the file table. Saves width on multi-pane splits while keeping navigation bookmarks fixed.',
  },
];

const PERMISSION_MODES: {
  id: PermissionInteractionMode;
  label: string;
}[] = [
  { id: 'inline-bits', label: 'Inline Bits' },
  { id: 'popover', label: 'Matrix Popover' },
  { id: 'octal-combo', label: 'Octal Combo' },
];

const DENSITY_OPTIONS: {
  id: ToolbarDensity;
  label: string;
}[] = [
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'sweet-spot', label: 'Sweet Spot' },
  { id: 'compact', label: 'Compact' },
];

const TREE_STYLE_OPTIONS: {
  id: TreeVisualStyle;
  label: string;
}[] = [
  { id: 'tonal', label: 'Tonal Branches' },
  { id: 'drilldown', label: 'Ancestor Drill-Down' },
  { id: 'hover-minimal', label: 'Hover Chevrons' },
  { id: 'classic', label: 'Classic Lines' },
];

interface FolderPathSegment {
  id: string;
  label: string;
}

const FOLDER_BREADCRUMBS: Record<string, FolderPathSegment[]> = {
  'root-home': [{ id: 'root-home', label: 'Home' }],
  'root-trash': [{ id: 'root-trash', label: 'Trash' }],
  'root-recent': [{ id: 'root-recent', label: 'Recent' }],
  'dir-desktop': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-desktop', label: 'Desktop' },
  ],
  'dir-documents': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-documents', label: 'Documents' },
  ],
  'dir-downloads': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-downloads', label: 'Downloads' },
  ],
  'dir-pictures': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-pictures', label: 'Pictures' },
  ],
  'dir-music': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-music', label: 'Music' },
  ],
  'dir-videos': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-videos', label: 'Videos' },
  ],
  'dir-projects': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-projects', label: 'Projects' },
  ],
  'dir-adom': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-documents', label: 'Documents' },
    { id: 'dir-adom', label: 'ADOM' },
  ],
  'dir-specs': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-documents', label: 'Documents' },
    { id: 'dir-specs', label: 'Specs' },
  ],
  'adom-gog': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-documents', label: 'Documents' },
    { id: 'dir-adom', label: 'ADOM' },
    { id: 'adom-gog', label: 'adom_gog' },
  ],
  'adom-saves': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-documents', label: 'Documents' },
    { id: 'dir-adom', label: 'ADOM' },
    { id: 'adom-gog', label: 'adom_gog' },
    { id: 'adom-saves', label: 'savedg' },
  ],
  'proj-rediwm': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-projects', label: 'Projects' },
    { id: 'proj-rediwm', label: 'rediwm-files' },
  ],
  'proj-rediwm-src': [
    { id: 'root-home', label: 'Home' },
    { id: 'dir-projects', label: 'Projects' },
    { id: 'proj-rediwm', label: 'rediwm-files' },
    { id: 'proj-rediwm-src', label: 'src' },
  ],
  'disk-usb': [{ id: 'disk-usb', label: 'USB_DATA' }],
  'disk-usb-backups': [
    { id: 'disk-usb', label: 'USB_DATA' },
    { id: 'disk-usb-backups', label: 'Backups' },
  ],
};

function createTab(id: string, folderId: string): TabState {
  return {
    id,
    history: [folderId],
    historyIndex: 0,
    selectedIds: [],
    lastSelectedId: null,
    viewLayout: 'list',
    sortField: 'name',
    sortDirection: 'asc',
    filterOpen: false,
    filterQuery: '',
  };
}

const INITIAL_TABS: TabState[] = [
  createTab('tab-adom', 'dir-adom'),
  createTab('tab-gog', 'adom-gog'),
  createTab('tab-projects', 'dir-projects'),
];

interface UndoSnapshot {
  files: FileItem[];
  label: string;
}

export default function App() {
  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);

  const [tabPlacement, setTabPlacement] = useState<TabPlacementMode>('titlebar');
  const [tabs, setTabs] = useState<TabState[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-adom');
  const [autoHideSingleTab, setAutoHideSingleTab] = useState<boolean>(false);
  const [density, setDensity] = useState<ToolbarDensity>('sweet-spot');

  const [sidebarPattern, setSidebarPattern] = useState<SidebarTreePattern>('accordion-cards');
  const [treeStyle, setTreeStyle] = useState<TreeVisualStyle>('tonal');
  const [allowBothOpen, setAllowBothOpen] = useState<boolean>(false);
  const [showDisks, setShowDisks] = useState<boolean>(true);
  const [showTransfers, setShowTransfers] = useState<boolean>(true);

  const [mode, setMode] = useState<PermissionInteractionMode>('inline-bits');
  const [requireSelectionForInlineBits, setRequireSelectionForInlineBits] = useState<boolean>(false);

  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Record<string, boolean>>({});
  const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'cut'; ids: string[] } | null>(null);
  const [lastCommandPreview, setLastCommandPreview] = useState<string | null>(null);
  const [showTerminalPreview, setShowTerminalPreview] = useState<boolean>(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const currentFolderId = activeTab.history[activeTab.historyIndex];
  const breadcrumbs = FOLDER_BREADCRUMBS[currentFolderId] ?? [{ id: 'dir-adom', label: 'ADOM' }];
  const currentTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? 'ADOM';

  const activePlacementMeta =
    TAB_PLACEMENTS.find((p) => p.id === tabPlacement) ?? TAB_PLACEMENTS[0];

  const updateActiveTab = (updater: (tab: TabState) => TabState) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? updater(t) : t)));
  };

  const navigateTo = (folderId: string) => {
    if (folderId === currentFolderId) return;
    setActivePopoverId(null);
    updateActiveTab((tab) => {
      const nextHistory = tab.history.slice(0, tab.historyIndex + 1);
      nextHistory.push(folderId);
      return {
        ...tab,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        selectedIds: [],
        lastSelectedId: null,
      };
    });
  };

  const openInNewTab = (folderId: string) => {
    const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setTabs((prev) => [...prev, createTab(newId, folderId)]);
    setActiveTabId(newId);
    setActivePopoverId(null);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === tabId);
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const fallback = nextTabs[Math.min(idx, nextTabs.length - 1)];
      setActiveTabId(fallback.id);
    }
    setActivePopoverId(null);
  };

  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.history.length - 1;
  const canGoUp = breadcrumbs.length > 1;

  const handleBack = () => {
    if (!canGoBack) return;
    setActivePopoverId(null);
    updateActiveTab((tab) => ({
      ...tab,
      historyIndex: tab.historyIndex - 1,
      selectedIds: [],
    }));
  };

  const handleForward = () => {
    if (!canGoForward) return;
    setActivePopoverId(null);
    updateActiveTab((tab) => ({
      ...tab,
      historyIndex: tab.historyIndex + 1,
      selectedIds: [],
    }));
  };

  const handleUp = () => {
    if (!canGoUp) return;
    const parentSegment = breadcrumbs[breadcrumbs.length - 2];
    if (parentSegment) {
      navigateTo(parentSegment.id);
    }
  };

  const tabStripItems: TabStripItem[] = useMemo(
    () =>
      tabs.map((t) => {
        const folderId = t.history[t.historyIndex];
        const segs = FOLDER_BREADCRUMBS[folderId] ?? [{ id: folderId, label: 'ADOM' }];
        return {
          id: t.id,
          label: segs[segs.length - 1]?.label ?? 'Folder',
          pathTitle: segs.map((s) => s.label).join(' › '),
        };
      }),
    [tabs]
  );

  const shouldRenderTabStrip = !autoHideSingleTab || tabs.length > 1;

  const visibleItems = useMemo(() => {
    let base: FileItem[];
    if (currentFolderId === 'root-recent') {
      base = files.filter((f) => !f.isFolder);
    } else {
      base = files.filter((f) => f.parentId === currentFolderId);
    }

    if (activeTab.filterQuery.trim()) {
      const q = activeTab.filterQuery.trim().toLowerCase();
      base = base.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.typeLabel.toLowerCase().includes(q) ||
          permissionsToOctal(f.permissions).includes(q)
      );
    }

    const sorted = [...base].sort((a, b) => {
      if (activeTab.sortField === 'name' && a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }

      let cmp = 0;
      switch (activeTab.sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = (a.sizeBytes ?? -1) - (b.sizeBytes ?? -1);
          break;
        case 'type':
          cmp = a.typeLabel.localeCompare(b.typeLabel);
          break;
        case 'modified':
          cmp = a.modifiedTimestamp - b.modifiedTimestamp;
          break;
        case 'permissions':
          cmp = permissionsToOctal(a.permissions).localeCompare(permissionsToOctal(b.permissions));
          break;
      }
      return activeTab.sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [
    files,
    currentFolderId,
    activeTab.filterQuery,
    activeTab.sortField,
    activeTab.sortDirection,
  ]);

  const selectedItems = useMemo(
    () => visibleItems.filter((item) => activeTab.selectedIds.includes(item.id)),
    [visibleItems, activeTab.selectedIds]
  );

  const handleSort = (field: SortField) => {
    updateActiveTab((tab) => {
      if (tab.sortField === field) {
        return { ...tab, sortDirection: tab.sortDirection === 'asc' ? 'desc' : 'asc' };
      }
      return { ...tab, sortField: field, sortDirection: 'asc' };
    });
  };

  const markRecentlyUpdated = (ids: string[]) => {
    setRecentlyUpdatedIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
    window.setTimeout(() => {
      setRecentlyUpdatedIds((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }, 1000);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const latest = undoStack[undoStack.length - 1];
    setFiles(latest.files);
    setUndoStack((prev) => prev.slice(0, -1));
    setLastCommandPreview(`Reverted: ${latest.label}`);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleCommitPermissions = (
    itemId: string,
    nextPermissions: FilePermissions,
    nextOwner: string,
    applyRecursive: boolean
  ) => {
    const target = files.find((f) => f.id === itemId);
    if (!target) return;

    const affectedIds = [itemId];
    if (applyRecursive && target.isFolder) {
      files.forEach((f) => {
        if (f.parentId === itemId) {
          affectedIds.push(f.id);
        }
      });
    }

    const octal = permissionsToOctal(nextPermissions);
    const recursiveFlag = applyRecursive && target.isFolder ? '-R ' : '';
    const cmdLabel = `chmod ${recursiveFlag}${octal} ${target.name}`;

    setUndoStack((prev) => [...prev.slice(-19), { files, label: cmdLabel }]);
    setFiles((prev) =>
      prev.map((f) => {
        if (!affectedIds.includes(f.id)) return f;
        return {
          ...f,
          permissions: nextPermissions,
          ownerName: nextOwner,
        };
      })
    );

    setLastCommandPreview(cmdLabel);
    markRecentlyUpdated(affectedIds);
  };

  const handleApplyBatchPermissions = (nextPermissions: FilePermissions, nextOwner: string) => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;

    const octal = permissionsToOctal(nextPermissions);
    const cmdLabel = `chmod ${octal} ${selectedItems.map((i) => i.name).join(' ')}`;

    setUndoStack((prev) => [...prev.slice(-19), { files, label: cmdLabel }]);
    setFiles((prev) =>
      prev.map((f) =>
        ids.includes(f.id)
          ? {
              ...f,
              permissions: nextPermissions,
              ownerName: nextOwner,
            }
          : f
      )
    );

    setLastCommandPreview(cmdLabel);
    markRecentlyUpdated(ids);
  };

  const handleRowClick = (e: React.MouseEvent, item: FileItem) => {
    setActivePopoverId(null);

    if (e.shiftKey && activeTab.lastSelectedId) {
      const startIdx = visibleItems.findIndex((f) => f.id === activeTab.lastSelectedId);
      const endIdx = visibleItems.findIndex((f) => f.id === item.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = visibleItems.slice(lo, hi + 1).map((f) => f.id);
        updateActiveTab((tab) => ({ ...tab, selectedIds: rangeIds }));
        return;
      }
    }

    if (e.metaKey || e.ctrlKey) {
      updateActiveTab((tab) => ({
        ...tab,
        selectedIds: tab.selectedIds.includes(item.id)
          ? tab.selectedIds.filter((id) => id !== item.id)
          : [...tab.selectedIds, item.id],
        lastSelectedId: item.id,
      }));
      return;
    }

    updateActiveTab((tab) => ({
      ...tab,
      selectedIds: [item.id],
      lastSelectedId: item.id,
    }));
  };

  const handleToggleCheckbox = (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    setActivePopoverId(null);
    updateActiveTab((tab) => ({
      ...tab,
      selectedIds: tab.selectedIds.includes(item.id)
        ? tab.selectedIds.filter((id) => id !== item.id)
        : [...tab.selectedIds, item.id],
      lastSelectedId: item.id,
    }));
  };

  const handleCreateNewFile = () => {
    const defaultPerms = octalToPermissions('644');
    if (!defaultPerms) return;
    const count = files.filter(
      (f) => f.parentId === currentFolderId && f.name.startsWith('untitled')
    ).length;
    const suffix = count === 0 ? '' : `_${count + 1}`;
    const newItem: FileItem = {
      id: `new-${Date.now()}`,
      parentId: currentFolderId,
      name: `untitled${suffix}.txt`,
      isFolder: false,
      sizeBytes: 0,
      sizeLabel: '0 B',
      typeLabel: 'txt',
      modifiedLabel: '2026-11-16 5:59 AM',
      modifiedTimestamp: Date.now(),
      ownerName: 'anon',
      permissions: defaultPerms,
    };
    setFiles((prev) => [...prev, newItem]);
    updateActiveTab((tab) => ({ ...tab, selectedIds: [newItem.id] }));
    setLastCommandPreview(`touch ${newItem.name} (0644)`);
  };

  const handleDeleteSelected = () => {
    if (activeTab.selectedIds.length === 0) return;
    if (currentFolderId === 'root-trash') {
      setFiles((prev) => prev.filter((f) => !activeTab.selectedIds.includes(f.id)));
    } else {
      setFiles((prev) =>
        prev.map((f) =>
          activeTab.selectedIds.includes(f.id) ? { ...f, parentId: 'root-trash' } : f
        )
      );
    }
    updateActiveTab((tab) => ({ ...tab, selectedIds: [] }));
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.ids.length === 0) return;
    if (clipboard.mode === 'cut') {
      setFiles((prev) =>
        prev.map((f) =>
          clipboard.ids.includes(f.id) ? { ...f, parentId: currentFolderId } : f
        )
      );
      setClipboard(null);
    } else {
      const copies = files
        .filter((f) => clipboard.ids.includes(f.id))
        .map((f, idx) => ({
          ...f,
          id: `${f.id}-copy-${Date.now()}-${idx}`,
          parentId: currentFolderId,
          name: f.name.includes('.') ? f.name.replace(/(\.[^.]+)$/, '_copy$1') : `${f.name}_copy`,
        }));
      setFiles((prev) => [...prev, ...copies]);
    }
  };

  const handleResetDemo = () => {
    setFiles(INITIAL_FILES);
    setUndoStack([]);
    setTabs(INITIAL_TABS);
    setActiveTabId('tab-adom');
    setActivePopoverId(null);
    setLastCommandPreview(null);
  };

  return (
    <div className="min-h-screen bg-[#141619] px-4 py-6 text-[#e5e7eb] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px] space-y-4">
        {/* Top Layout & Permission Mode Explorer Bar */}
        <header className="space-y-3 border-b border-[#26292f] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-[#f3f4f6]">
                RediWM Files — Tabs & Inline Permissions
              </h1>
              <p className="mt-0.5 text-xs text-[#9ca3af]">{activePlacementMeta.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className="inline-flex items-center rounded-lg border border-[#2c2f36] bg-[#1b1d21] p-1"
                role="tablist"
                aria-label="Tab placement option"
              >
                {TAB_PLACEMENTS.map((opt) => {
                  const active = opt.id === tabPlacement;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTabPlacement(opt.id)}
                      className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c48e51] ${
                        active
                          ? 'bg-[#c48e51] text-[#18191c] font-semibold'
                          : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2c2f36] bg-[#1b1d21] px-2.5 py-1.5 text-xs font-medium text-[#9ca3af] transition-colors hover:border-[#3a3e47] hover:text-[#e5e7eb]"
                title="Reset tabs and files"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Secondary Quick Controls: Sidebar Tree, Dynamic Panels, Chrome Density, Permissions */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9ca3af]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[#6b7280]">Tree Style:</span>
                <div className="inline-flex items-center rounded-md border border-[#2c2f36] bg-[#1b1d21] p-0.5">
                  {TREE_STYLE_OPTIONS.map((opt) => {
                    const active = opt.id === treeStyle;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTreeStyle(opt.id)}
                        className={`whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-[#c48e51] text-[#18191c] font-semibold'
                            : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#6b7280]">Cards:</span>
                <div className="inline-flex items-center rounded-md border border-[#2c2f36] bg-[#1b1d21] p-0.5">
                  <button
                    type="button"
                    onClick={() => setSidebarPattern('accordion-cards')}
                    className={`whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                      sidebarPattern === 'accordion-cards'
                        ? 'bg-[#31343b] text-[#f3f4f6]'
                        : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                    }`}
                  >
                    Competing
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarPattern('single-card-toggle')}
                    className={`whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                      sidebarPattern === 'single-card-toggle'
                        ? 'bg-[#31343b] text-[#f3f4f6]'
                        : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                    }`}
                  >
                    Single Toggle
                  </button>
                </div>
              </div>

              {sidebarPattern === 'accordion-cards' && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-[#d1d5db]">
                  <input
                    type="checkbox"
                    checked={allowBothOpen}
                    onChange={(e) => setAllowBothOpen(e.target.checked)}
                    className="h-3 w-3 accent-[#c48e51]"
                  />
                  <span>Allow both open</span>
                </label>
              )}

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-[#d1d5db]">
                <input
                  type="checkbox"
                  checked={showDisks}
                  onChange={(e) => setShowDisks(e.target.checked)}
                  className="h-3 w-3 accent-[#c48e51]"
                />
                <span>Disks panel</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-[#d1d5db]">
                <input
                  type="checkbox"
                  checked={showTransfers}
                  onChange={(e) => setShowTransfers(e.target.checked)}
                  className="h-3 w-3 accent-[#c48e51]"
                />
                <span>Transfers panel</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[#6b7280]">Permissions:</span>
                <div className="inline-flex items-center rounded-md border border-[#2c2f36] bg-[#1b1d21] p-0.5">
                  {PERMISSION_MODES.map((pm) => {
                    const active = pm.id === mode;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          setMode(pm.id);
                          setActivePopoverId(null);
                        }}
                        className={`whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-[#31343b] text-[#f3f4f6]'
                            : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                        }`}
                      >
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#6b7280]">Chrome:</span>
                <div className="inline-flex items-center rounded-md border border-[#2c2f36] bg-[#1b1d21] p-0.5">
                  {DENSITY_OPTIONS.map((opt) => {
                    const active = opt.id === density;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDensity(opt.id)}
                        className={`whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-[#31343b] text-[#f3f4f6]'
                            : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-[#d1d5db]">
                <input
                  type="checkbox"
                  checked={autoHideSingleTab}
                  onChange={(e) => setAutoHideSingleTab(e.target.checked)}
                  className="h-3 w-3 accent-[#c48e51]"
                />
                <span>Auto-hide 1 tab</span>
              </label>
            </div>
          </div>
        </header>

        {/* RediWM Files Window Shell */}
        <section
          aria-label="RediWM Files Window"
          className="overflow-visible rounded-lg border border-[#30333a] bg-[#24262a] shadow-2xl shadow-black/50"
        >
          {/* Window Title Bar (with integrated tabs when placement === 'titlebar') */}
          <div
            className={`flex items-center justify-between gap-2 rounded-t-lg border-b border-[#1c1e22] bg-[#1e2024] ${
              density === 'compact' ? 'px-2.5' : density === 'sweet-spot' ? 'px-3' : 'px-3.5'
            } ${
              tabPlacement === 'titlebar' && shouldRenderTabStrip
                ? density === 'compact'
                  ? 'pt-0.5 pb-0'
                  : 'pt-1 pb-0'
                : density === 'compact'
                ? 'py-1.5'
                : density === 'sweet-spot'
                ? 'py-2'
                : 'py-2.5'
            }`}
          >
            <div
              className={`flex items-center gap-2 shrink-0 ${
                tabPlacement === 'titlebar' && shouldRenderTabStrip
                  ? density === 'compact'
                    ? 'pb-1'
                    : 'pb-1.5'
                  : ''
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#a93226]/20 text-[#e05a47]">
                <Folder className="h-4 w-4 fill-[#d9483b] text-[#d9483b]" />
              </span>
              {!(tabPlacement === 'titlebar' && shouldRenderTabStrip) ? (
                <span className="text-[13px] font-semibold text-[#e5e7eb]">
                  {currentTitle} — RediWM Files
                </span>
              ) : (
                <span className="hidden text-[13px] font-semibold text-[#d1d5db] sm:inline">
                  RediWM Files
                </span>
              )}
            </div>

            {tabPlacement === 'titlebar' && shouldRenderTabStrip && (
              <TabStrip
                tabs={tabStripItems}
                activeTabId={activeTab.id}
                placement="titlebar"
                density={density}
                onSelectTab={(id) => {
                  setActiveTabId(id);
                  setActivePopoverId(null);
                }}
                onCloseTab={closeTab}
                onNewTab={() => openInNewTab(currentFolderId)}
              />
            )}

            <div
              className={`flex items-center gap-3 shrink-0 text-[#9ca3af] ${
                tabPlacement === 'titlebar' && shouldRenderTabStrip
                  ? density === 'compact'
                    ? 'pb-1 pl-1.5'
                    : 'pb-1.5 pl-2'
                  : ''
              }`}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              <Square className="h-3 w-3" aria-hidden="true" />
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>

          {/* Placement 2: Full-Width Tab Strip Directly Below Titlebar */}
          {tabPlacement === 'below-titlebar' && shouldRenderTabStrip && (
            <TabStrip
              tabs={tabStripItems}
              activeTabId={activeTab.id}
              placement="below-titlebar"
              density={density}
              onSelectTab={(id) => {
                setActiveTabId(id);
                setActivePopoverId(null);
              }}
              onCloseTab={closeTab}
              onNewTab={() => openInNewTab(currentFolderId)}
            />
          )}

          {/* Navigation + Breadcrumb Bar */}
          <div
            className={`flex items-center border-b border-[#2b2d33] bg-[#24262a] ${
              density === 'compact'
                ? 'gap-1.5 px-2.5 py-1'
                : density === 'sweet-spot'
                ? 'gap-2 px-3 py-1.5'
                : 'gap-2.5 px-3.5 py-2'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleBack}
                disabled={!canGoBack}
                aria-label="Back"
                className={`rounded text-[#d1d5db] transition-colors hover:bg-[#31343a] disabled:text-[#555962] disabled:hover:bg-transparent ${
                  density === 'compact' ? 'p-1' : 'p-1.5'
                }`}
              >
                <ArrowLeft className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
              <button
                type="button"
                onClick={handleForward}
                disabled={!canGoForward}
                aria-label="Forward"
                className={`rounded text-[#d1d5db] transition-colors hover:bg-[#31343a] disabled:text-[#555962] disabled:hover:bg-transparent ${
                  density === 'compact' ? 'p-1' : 'p-1.5'
                }`}
              >
                <ArrowRight className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
              <button
                type="button"
                onClick={handleUp}
                disabled={!canGoUp}
                aria-label="Up one level"
                className={`rounded text-[#d1d5db] transition-colors hover:bg-[#31343a] disabled:text-[#555962] disabled:hover:bg-transparent ${
                  density === 'compact' ? 'p-1' : 'p-1.5'
                }`}
              >
                <ArrowUp className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
            </div>

            {/* Breadcrumb Path Bar */}
            <nav
              aria-label="Breadcrumb"
              className={`flex flex-1 items-center gap-1 overflow-x-auto rounded border border-[#32353b] bg-[#191b1e] ${
                density === 'compact'
                  ? 'px-2 py-0.5 text-xs'
                  : density === 'sweet-spot'
                  ? 'px-2.5 py-1 text-[13px]'
                  : 'px-3 py-1.5 text-[13px]'
              }`}
            >
              {breadcrumbs.map((seg, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={seg.id}>
                    {idx > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                    )}
                    <button
                      type="button"
                      onClick={() => navigateTo(seg.id)}
                      className={`whitespace-nowrap rounded px-1 py-0.5 transition-colors hover:bg-[#2a2d33] ${
                        isLast ? 'font-medium text-[#f3f4f6]' : 'text-[#d1d5db]'
                      }`}
                    >
                      {seg.label}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setActivePopoverId(null)}
                aria-label="Refresh directory"
                className={`rounded text-[#d1d5db] transition-colors hover:bg-[#31343a] ${
                  density === 'compact' ? 'p-1' : 'p-1.5'
                }`}
              >
                <RefreshCw className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateActiveTab((tab) => ({ ...tab, filterOpen: !tab.filterOpen }))
                }
                aria-label="Search files"
                aria-pressed={activeTab.filterOpen}
                className={`rounded transition-colors ${density === 'compact' ? 'p-1' : 'p-1.5'} ${
                  activeTab.filterOpen
                    ? 'bg-[#c48e51]/20 text-[#e8b87d]'
                    : 'text-[#d1d5db] hover:bg-[#31343a]'
                }`}
              >
                <Search className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-b border-[#2b2d33] bg-[#24262a] ${
              density === 'compact'
                ? 'px-2.5 py-1'
                : density === 'sweet-spot'
                ? 'px-3 py-1.5'
                : 'px-3.5 py-2'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateNewFile}
                className={`inline-flex items-center gap-1.5 rounded border border-[#3a3d45] bg-[#31343a] text-xs font-medium text-[#f3f4f6] transition-colors hover:bg-[#3a3e46] ${
                  density === 'compact'
                    ? 'px-2 py-0.5'
                    : density === 'sweet-spot'
                    ? 'px-2.5 py-1'
                    : 'px-3 py-1.5'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>

              <div className="ml-0.5 flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={activeTab.selectedIds.length === 0}
                  onClick={() => setClipboard({ mode: 'cut', ids: activeTab.selectedIds })}
                  aria-label="Cut selected"
                  title="Cut"
                  className={`rounded text-[#9ca3af] transition-colors hover:bg-[#31343a] hover:text-[#e5e7eb] disabled:opacity-40 disabled:hover:bg-transparent ${
                    density === 'compact' ? 'p-1' : 'p-1.5'
                  }`}
                >
                  <Scissors className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
                <button
                  type="button"
                  disabled={activeTab.selectedIds.length === 0}
                  onClick={() => setClipboard({ mode: 'copy', ids: activeTab.selectedIds })}
                  aria-label="Copy selected"
                  title="Copy"
                  className={`rounded text-[#9ca3af] transition-colors hover:bg-[#31343a] hover:text-[#e5e7eb] disabled:opacity-40 disabled:hover:bg-transparent ${
                    density === 'compact' ? 'p-1' : 'p-1.5'
                  }`}
                >
                  <Copy className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
                <button
                  type="button"
                  disabled={!clipboard || clipboard.ids.length === 0}
                  onClick={handlePaste}
                  aria-label="Paste"
                  title="Paste"
                  className={`rounded text-[#9ca3af] transition-colors hover:bg-[#31343a] hover:text-[#e5e7eb] disabled:opacity-40 disabled:hover:bg-transparent ${
                    density === 'compact' ? 'p-1' : 'p-1.5'
                  }`}
                >
                  <ClipboardPaste className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
                <button
                  type="button"
                  disabled={activeTab.selectedIds.length === 0}
                  onClick={handleDeleteSelected}
                  aria-label="Delete selected"
                  title="Move to Trash"
                  className={`rounded text-[#9ca3af] transition-colors hover:bg-[#31343a] hover:text-red-400 disabled:opacity-40 disabled:hover:bg-transparent ${
                    density === 'compact' ? 'p-1' : 'p-1.5'
                  }`}
                >
                  <Trash2 className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeTab.filterOpen && (
                <input
                  type="text"
                  value={activeTab.filterQuery}
                  onChange={(e) =>
                    updateActiveTab((tab) => ({ ...tab, filterQuery: e.target.value }))
                  }
                  placeholder="Filter name, type, or 644…"
                  aria-label="Filter items"
                  autoFocus
                  className={`w-44 rounded border border-[#3a3d45] bg-[#191b1e] px-2 text-xs text-[#e5e7eb] placeholder-[#6b7280] focus:border-[#c48e51] focus:outline-none ${
                    density === 'compact' ? 'py-0.5' : 'py-1'
                  }`}
                />
              )}

              {/* Grid / List View Switcher */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => updateActiveTab((tab) => ({ ...tab, viewLayout: 'grid' }))}
                  aria-label="Grid view"
                  aria-pressed={activeTab.viewLayout === 'grid'}
                  className={`rounded transition-colors ${density === 'compact' ? 'p-1' : 'p-1.5'} ${
                    activeTab.viewLayout === 'grid'
                      ? 'bg-[#c48e51] text-[#18191c]'
                      : 'text-[#d1d5db] hover:bg-[#31343a]'
                  }`}
                >
                  <LayoutGrid className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveTab((tab) => ({ ...tab, viewLayout: 'list' }))}
                  aria-label="Detailed list view"
                  aria-pressed={activeTab.viewLayout === 'list'}
                  className={`rounded transition-colors ${density === 'compact' ? 'p-1' : 'p-1.5'} ${
                    activeTab.viewLayout === 'list'
                      ? 'bg-[#c48e51] text-[#18191c]'
                      : 'text-[#d1d5db] hover:bg-[#31343a]'
                  }`}
                >
                  <List className={density === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSort('name')}
                className={`inline-flex items-center gap-1.5 rounded border border-[#383b42] bg-[#303338] text-xs font-medium text-[#e5e7eb] transition-colors hover:bg-[#393d44] ${
                  density === 'compact'
                    ? 'px-2 py-0.5'
                    : density === 'sweet-spot'
                    ? 'px-2.5 py-1'
                    : 'px-3 py-1.5'
                }`}
              >
                <ArrowDownWideNarrow className="h-3.5 w-3.5 text-[#9ca3af]" />
                <span className="capitalize">{activeTab.sortField}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateActiveTab((tab) => ({ ...tab, filterOpen: !tab.filterOpen }))
                }
                className={`inline-flex items-center gap-1.5 rounded border text-xs font-medium transition-colors ${
                  density === 'compact'
                    ? 'px-2 py-0.5'
                    : density === 'sweet-spot'
                    ? 'px-2.5 py-1'
                    : 'px-3 py-1.5'
                } ${
                  activeTab.filterOpen || activeTab.filterQuery
                    ? 'border-[#c48e51]/60 bg-[#c48e51]/15 text-[#e8b87d]'
                    : 'border-[#383b42] bg-[#303338] text-[#e5e7eb] hover:bg-[#393d44]'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Main Split Workspace */}
          <div className="flex min-h-[430px] bg-[#25272b]">
            <LeftSidebar
              places={PLACES}
              files={files}
              currentFolderId={currentFolderId}
              pattern={sidebarPattern}
              treeStyle={treeStyle}
              allowBothOpen={allowBothOpen}
              showDisks={showDisks}
              showTransfers={showTransfers}
              onNavigate={navigateTo}
              onOpenInNewTab={openInNewTab}
            />

            {/* Right Pane: Optional Pane-Scoped Tab Strip + Table/Grid */}
            <div
              className="flex min-w-0 flex-1 flex-col justify-between"
              onClick={() => setActivePopoverId(null)}
            >
              <div>
                {/* Placement 3: Pane-Scoped Tab Strip Above Table Header */}
                {tabPlacement === 'pane-scoped' && shouldRenderTabStrip && (
                  <TabStrip
                    tabs={tabStripItems}
                    activeTabId={activeTab.id}
                    placement="pane-scoped"
                    density={density}
                    onSelectTab={(id) => {
                      setActiveTabId(id);
                      setActivePopoverId(null);
                    }}
                    onCloseTab={closeTab}
                    onNewTab={() => openInNewTab(currentFolderId)}
                  />
                )}

                {activeTab.viewLayout === 'list' ? (
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[#32353b] bg-[#2d3036] text-xs font-medium text-[#d1d5db]">
                          <th className="w-[30%] py-2 pl-4 pr-3">
                            <button
                              type="button"
                              onClick={() => handleSort('name')}
                              className="inline-flex items-center gap-1 hover:text-white"
                            >
                              <span>Name</span>
                              {activeTab.sortField === 'name' && (
                                <span className="text-[10px] text-[#9ca3af]">
                                  {activeTab.sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="w-[12%] border-l border-[#363940] px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort('size')}
                              className="inline-flex items-center gap-1 hover:text-white"
                            >
                              <span>Size</span>
                              {activeTab.sortField === 'size' && (
                                <span className="text-[10px] text-[#9ca3af]">
                                  {activeTab.sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="w-[12%] border-l border-[#363940] px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort('type')}
                              className="inline-flex items-center gap-1 hover:text-white"
                            >
                              <span>Type</span>
                              {activeTab.sortField === 'type' && (
                                <span className="text-[10px] text-[#9ca3af]">
                                  {activeTab.sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="w-[22%] border-l border-[#363940] px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort('modified')}
                              className="inline-flex items-center gap-1 hover:text-white"
                            >
                              <span>Modified</span>
                              {activeTab.sortField === 'modified' && (
                                <span className="text-[10px] text-[#9ca3af]">
                                  {activeTab.sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th className="w-[24%] border-l border-[#363940] px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort('permissions')}
                              className="inline-flex items-center gap-1 hover:text-white"
                            >
                              <span>Permissions</span>
                              {activeTab.sortField === 'permissions' && (
                                <span className="text-[10px] text-[#9ca3af]">
                                  {activeTab.sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-16 text-center text-xs text-[#6b7280]">
                              {activeTab.filterQuery
                                ? `No items match "${activeTab.filterQuery}".`
                                : 'This folder is empty.'}
                            </td>
                          </tr>
                        ) : (
                          visibleItems.map((item, idx) => {
                            const isSelected = activeTab.selectedIds.includes(item.id);
                            const openUpward =
                              visibleItems.length >= 4 && idx >= visibleItems.length - 2;
                            return (
                              <tr
                                key={item.id}
                                onClick={(e) => handleRowClick(e, item)}
                                onDoubleClick={() => {
                                  if (item.isFolder) {
                                    navigateTo(item.id);
                                  }
                                }}
                                onAuxClick={(e) => {
                                  if (e.button === 1 && item.isFolder) {
                                    e.preventDefault();
                                    openInNewTab(item.id);
                                  }
                                }}
                                className={`group/row cursor-default border-b border-transparent transition-colors duration-100 ${
                                  isSelected
                                    ? 'bg-[#c48e51]/15 text-[#f9fafb]'
                                    : 'hover:bg-[#2c2f35]'
                                }`}
                              >
                                <td className="py-1.5 pl-2.5 pr-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      onClick={(e) => handleToggleCheckbox(e, item)}
                                      aria-label={`Select ${item.name}`}
                                      className={`h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#c48e51] transition-opacity ${
                                        isSelected || activeTab.selectedIds.length > 0
                                          ? 'opacity-100'
                                          : 'opacity-0 group-hover/row:opacity-70'
                                      }`}
                                    />
                                    {item.isFolder ? (
                                      <FolderOpen className="h-4 w-4 shrink-0 text-[#9ca3af]" />
                                    ) : (
                                      <FileIcon className="h-4 w-4 shrink-0 text-[#6b7280]" />
                                    )}
                                    <span className="truncate font-normal text-[#e5e7eb]">
                                      {item.name}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-1.5 tabular-nums text-[#d1d5db]">
                                  {item.sizeLabel}
                                </td>

                                <td className="px-3 py-1.5 text-[#d1d5db]">{item.typeLabel}</td>

                                <td className="px-3 py-1.5 font-mono text-xs tabular-nums text-[#d1d5db]">
                                  {item.modifiedLabel}
                                </td>

                                <td className="px-3 py-1.5">
                                  <PermissionCell
                                    item={item}
                                    mode={mode}
                                    isSelected={isSelected}
                                    isActivePopover={activePopoverId === item.id}
                                    requireSelectionForInlineBits={requireSelectionForInlineBits}
                                    openUpward={openUpward}
                                    recentlyUpdated={Boolean(recentlyUpdatedIds[item.id])}
                                    onOpenPopover={() => setActivePopoverId(item.id)}
                                    onClosePopover={() => setActivePopoverId(null)}
                                    onCommitPermissions={handleCommitPermissions}
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid flex-1 grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-4">
                    {visibleItems.map((item) => {
                      const isSelected = activeTab.selectedIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => handleRowClick(e, item)}
                          onDoubleClick={() => {
                            if (item.isFolder) navigateTo(item.id);
                          }}
                          className={`flex flex-col items-center justify-center rounded-md border p-3 text-center transition-colors ${
                            isSelected
                              ? 'border-[#c48e51]/60 bg-[#c48e51]/15'
                              : 'border-transparent hover:bg-[#2c2f35]'
                          }`}
                        >
                          {item.isFolder ? (
                            <Folder className="mb-2 h-8 w-8 fill-[#9ca3af] text-[#9ca3af]" />
                          ) : (
                            <FileIcon className="mb-2 h-8 w-8 text-[#6b7280]" />
                          )}
                          <div className="w-full truncate text-xs text-[#e5e7eb]">{item.name}</div>
                          <div className="mt-1 font-mono text-[11px] tabular-nums text-[#9ca3af]">
                            {permissionsToOctal(item.permissions)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hybrid Batch Bar */}
              <BatchPermissionBar
                selectedItems={selectedItems}
                onApplyBatch={handleApplyBatchPermissions}
                onClearSelection={() => updateActiveTab((tab) => ({ ...tab, selectedIds: [] }))}
              />
            </div>
          </div>

          {/* Optional Equivalent CLI Preview Bar */}
          {showTerminalPreview && (
            <div className="flex items-center justify-between border-t border-[#32353b] bg-[#181a1d] px-3.5 py-2 font-mono text-xs text-[#d1d5db]">
              <div className="flex items-center gap-2 truncate">
                <span className="text-[#c48e51]">$</span>
                <span className="truncate">
                  {lastCommandPreview ??
                    'Toggle any r/w/x bit above to inspect the equivalent chmod command'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminalPreview(false)}
                className="ml-2 text-[#6b7280] hover:text-[#d1d5db]"
                aria-label="Close command preview"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Window Status Bar */}
          <div className="flex items-center justify-between rounded-b-lg border-t border-[#32353b] bg-[#222428] px-3.5 py-1.5 text-xs text-[#d1d5db]">
            <div className="flex items-center gap-2 tabular-nums">
              <span>
                {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
              </span>
              {activeTab.selectedIds.length > 0 && (
                <>
                  <span className="text-[#6b7280]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#e8b87d]">{activeTab.selectedIds.length} selected</span>
                </>
              )}
              {lastCommandPreview && (
                <>
                  <span className="text-[#6b7280]" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-[11px] text-[#9ca3af]">
                    {lastCommandPreview}
                  </span>
                </>
              )}
              {undoStack.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#e8b87d] hover:bg-[#31343a]"
                  title="Undo last permission change (Ctrl+Z)"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>Undo</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowTerminalPreview((p) => !p)}
              aria-label="Toggle chmod command preview"
              aria-pressed={showTerminalPreview}
              title="Toggle equivalent chmod command"
              className={`rounded p-1 transition-colors ${
                showTerminalPreview
                  ? 'bg-[#c48e51]/20 text-[#e8b87d]'
                  : 'text-[#9ca3af] hover:bg-[#31343a] hover:text-[#e5e7eb]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Concise Tab Design Rationale */}
        <footer className="grid gap-4 border-t border-[#26292f] pt-4 text-xs text-[#9ca3af] md:grid-cols-3">
          <div>
            <div className="font-medium text-[#e5e7eb]">1. Titlebar-Integrated (Recommended)</div>
            <p className="mt-1 leading-relaxed">
              Costs 0px of vertical height and keeps the shared address bar and toolbar directly attached beneath the active tab.
            </p>
          </div>
          <div>
            <div className="font-medium text-[#e5e7eb]">2. Below Titlebar</div>
            <p className="mt-1 leading-relaxed">
              Best if RediWM uses a separate WM-drawn titlebar or you need generous drag space when 6+ tabs are open.
            </p>
          </div>
          <div>
            <div className="font-medium text-[#e5e7eb]">3. Pane-Scoped + Open-in-Tab</div>
            <p className="mt-1 leading-relaxed">
              Keeps Places anchored. Hover any folder or Places item (or middle-click) to open it directly in a new tab.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
