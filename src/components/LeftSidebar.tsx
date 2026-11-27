import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerLeftUp,
  Folder,
  FolderOpen,
  FolderTree,
  HardDrive,
  Home,
  List,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import type { FileItem, PlaceEntry, SidebarTreePattern, TreeVisualStyle } from '../types';

interface LeftSidebarProps {
  places: PlaceEntry[];
  files: FileItem[];
  currentFolderId: string;
  pattern: SidebarTreePattern;
  treeStyle: TreeVisualStyle;
  allowBothOpen: boolean;
  showDisks: boolean;
  showTransfers: boolean;
  onNavigate: (folderId: string) => void;
  onOpenInNewTab: (folderId: string) => void;
}

function getPlaceIcon(id: string) {
  switch (id) {
    case 'home':
      return <Home className="h-4 w-4 shrink-0 text-[#d1d5db]" />;
    case 'trash':
      return <Trash2 className="h-4 w-4 shrink-0 text-[#d1d5db]" />;
    case 'recent':
      return <Clock className="h-4 w-4 shrink-0 text-[#d1d5db]" />;
    default:
      return <Folder className="h-4 w-4 shrink-0 fill-[#d1d5db] text-[#d1d5db]" />;
  }
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  places,
  files,
  currentFolderId,
  pattern,
  treeStyle,
  allowBothOpen,
  showDisks,
  showTransfers,
  onNavigate,
  onOpenInNewTab,
}) => {
  const [placesOpen, setPlacesOpen] = useState<boolean>(false);
  const [treeOpen, setTreeOpen] = useState<boolean>(true);
  const [disksOpen, setDisksOpen] = useState<boolean>(true);
  const [transfersOpen, setTransfersOpen] = useState<boolean>(true);
  const [singleCardTab, setSingleCardTab] = useState<'places' | 'tree'>('tree');

  const [transferPaused, setTransferPaused] = useState<boolean>(false);
  const [transferProgress, setTransferProgress] = useState<number>(64);

  useEffect(() => {
    if (!showTransfers || transferPaused) return;
    const timer = window.setInterval(() => {
      setTransferProgress((prev) => (prev >= 100 ? 12 : prev + 3));
    }, 650);
    return () => window.clearInterval(timer);
  }, [showTransfers, transferPaused]);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'root-home': true,
    'dir-documents': true,
    'dir-adom': true,
  });

  const folderById = useMemo(() => {
    const map: Record<string, FileItem> = {};
    files.forEach((f) => {
      if (f.isFolder) {
        map[f.id] = f;
      }
    });
    return map;
  }, [files]);

  const childFoldersByParent = useMemo(() => {
    const map: Record<string, FileItem[]> = {};
    files.forEach((f) => {
      if (!f.isFolder) return;
      if (!map[f.parentId]) map[f.parentId] = [];
      map[f.parentId].push(f);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    );
    return map;
  }, [files]);

  // Compute ancestor chain for active-branch highlighting and drill-down mode
  const activeAncestorChain = useMemo(() => {
    const chain: { id: string; label: string; isHome?: boolean; isDisk?: boolean }[] = [];
    const visited = new Set<string>();
    let cursorId: string | null = currentFolderId;

    while (cursorId && !visited.has(cursorId)) {
      visited.add(cursorId);
      if (cursorId === 'root-home') {
        chain.unshift({ id: 'root-home', label: 'Home', isHome: true });
        break;
      }
      if (cursorId === 'disk-usb') {
        chain.unshift({ id: 'disk-usb', label: 'USB_DATA', isDisk: true });
        break;
      }
      const folder: FileItem | undefined = folderById[cursorId];
      if (!folder) break;
      chain.unshift({ id: folder.id, label: folder.name });
      cursorId = folder.parentId;
    }

    if (chain.length === 0) {
      return [{ id: 'root-home', label: 'Home', isHome: true }];
    }
    return chain;
  }, [currentFolderId, folderById]);

  const activeAncestorSet = useMemo(
    () => new Set(activeAncestorChain.map((item) => item.id)),
    [activeAncestorChain]
  );

  // Auto-expand ancestor chain whenever currentFolderId changes
  useEffect(() => {
    const toExpand: string[] = [];
    let cursor = folderById[currentFolderId];
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor.parentId)) {
      visited.add(cursor.parentId);
      toExpand.push(cursor.parentId);
      cursor = folderById[cursor.parentId];
    }
    if (toExpand.length > 0) {
      setExpandedIds((prev) => {
        const next = { ...prev };
        let changed = false;
        toExpand.forEach((id) => {
          if (!next[id]) {
            next[id] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [currentFolderId, folderById]);

  const toggleTreeExpand = (folderId: string) => {
    setExpandedIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleTogglePlacesCard = () => {
    setPlacesOpen((prev) => {
      const next = !prev;
      if (next && !allowBothOpen) {
        setTreeOpen(false);
      }
      return next;
    });
  };

  const handleToggleTreeCard = () => {
    setTreeOpen((prev) => {
      const next = !prev;
      if (next && !allowBothOpen) {
        setPlacesOpen(false);
      }
      return next;
    });
  };

  const renderActiveRowBackground = (isActive: boolean) =>
    isActive
      ? 'bg-gradient-to-r from-[#c48e51]/25 via-[#c48e51]/10 to-transparent text-[#f9fafb] font-medium'
      : 'text-[#d1d5db] hover:bg-[#2a2d33]';

  // Style 1: Tonal Branches (Zero lines, zero chevrons, surface grouping)
  const renderTonalNode = (
    id: string,
    label: string,
    depth: number,
    isRootHome = false
  ): React.ReactNode => {
    const children = childFoldersByParent[id] ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = Boolean(expandedIds[id]);
    const isActive = currentFolderId === id;
    const isBranchOpen = hasChildren && isExpanded;

    return (
      <div
        key={id}
        className={`rounded-md transition-colors duration-150 ${
          isBranchOpen
            ? depth === 0
              ? 'bg-white/[0.03] p-0.5'
              : 'bg-white/[0.028] py-0.5'
            : ''
        }`}
      >
        <div
          onClick={() => onNavigate(id)}
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              onOpenInNewTab(id);
            }
          }}
          style={{ paddingLeft: `${depth * 10 + 6}px` }}
          className={`group/tonal relative flex cursor-pointer items-center gap-1.5 rounded py-1 pr-2 text-[12.5px] transition-colors select-none ${renderActiveRowBackground(
            isActive
          )}`}
          title={
            hasChildren
              ? `${label} — click icon to ${isExpanded ? 'collapse' : 'expand'}, middle-click for new tab`
              : `${label} (middle-click for new tab)`
          }
        >
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0 w-[3px] rounded-r bg-[#c48e51]"
            />
          )}

          {/* Folder icon doubles as expand/collapse toggle */}
          <button
            type="button"
            tabIndex={hasChildren ? 0 : -1}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleTreeExpand(id);
              } else {
                onNavigate(id);
              }
            }}
            aria-label={
              hasChildren ? `${isExpanded ? 'Collapse' : 'Expand'} ${label}` : label
            }
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
              hasChildren
                ? 'hover:bg-white/[0.08]'
                : 'cursor-default'
            }`}
          >
            {isRootHome ? (
              <Home
                className={`h-3.5 w-3.5 ${
                  isActive || isBranchOpen ? 'text-[#e8b87d]' : 'text-[#d1d5db]'
                }`}
              />
            ) : isBranchOpen ? (
              <FolderOpen
                className={`h-3.5 w-3.5 ${
                  isActive ? 'text-[#e8b87d]' : 'text-[#c48e51]'
                }`}
              />
            ) : (
              <Folder
                className={`h-3.5 w-3.5 ${
                  isActive
                    ? 'fill-[#c48e51]/85 text-[#c48e51]'
                    : hasChildren
                    ? 'fill-[#9ca3af]/80 text-[#9ca3af]'
                    : 'text-[#6b7280]'
                }`}
              />
            )}
          </button>

          <span className="truncate">{label}</span>

          {hasChildren && !isExpanded && (
            <span className="ml-auto font-mono text-[10px] text-[#6b7280]">
              {children.length}
            </span>
          )}
        </div>

        {isBranchOpen && (
          <div className="mt-0.5 space-y-0.5">
            {children.map((child) => renderTonalNode(child.id, child.name, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Style 2: Ancestor-Pinned Drill-Down (Zero indentation)
  const renderDrillDownTree = () => {
    const isExternalView =
      currentFolderId === 'root-trash' || currentFolderId === 'root-recent';
    const focusFolderId = isExternalView ? 'root-home' : currentFolderId;
    const subfolders = childFoldersByParent[focusFolderId] ?? [];
    const parentSegment =
      activeAncestorChain.length > 1
        ? activeAncestorChain[activeAncestorChain.length - 2]
        : null;

    return (
      <div className="space-y-1.5 px-1.5 pb-2">
        {/* Pinned Ancestor Chain */}
        <div className="space-y-0.5">
          {activeAncestorChain.map((seg, idx) => {
            const isCurrent = seg.id === currentFolderId;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => onNavigate(seg.id)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onOpenInNewTab(seg.id);
                  }
                }}
                className={`relative flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] transition-colors ${
                  isCurrent
                    ? renderActiveRowBackground(true)
                    : 'text-[#9ca3af] hover:bg-[#2a2d33] hover:text-[#e5e7eb]'
                }`}
              >
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0.5 left-0 w-[3px] rounded-r bg-[#c48e51]"
                  />
                )}
                {seg.isHome ? (
                  <Home className="h-3.5 w-3.5 shrink-0 text-[#e8b87d]" />
                ) : seg.isDisk ? (
                  <HardDrive className="h-3.5 w-3.5 shrink-0 text-[#e8b87d]" />
                ) : (
                  <FolderOpen
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isCurrent ? 'text-[#e8b87d]' : 'text-[#8b929e]'
                    }`}
                  />
                )}
                <span className="truncate">{seg.label}</span>
                {idx < activeAncestorChain.length - 1 && (
                  <span className="ml-auto text-[10px] text-[#5c626d]">level {idx}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-[#2d3036]" />

        {/* Current Folder's Direct Subfolders (Zero Indentation) */}
        <div className="space-y-0.5">
          {subfolders.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-[#6b7280]">
              <div>No subfolders here</div>
              {parentSegment && (
                <button
                  type="button"
                  onClick={() => onNavigate(parentSegment.id)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[#c48e51] hover:text-[#e8b87d]"
                >
                  <CornerLeftUp className="h-3 w-3" />
                  <span>Up to {parentSegment.label}</span>
                </button>
              )}
            </div>
          ) : (
            subfolders.map((sub) => {
              const subChildCount = (childFoldersByParent[sub.id] ?? []).length;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onNavigate(sub.id)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      onOpenInNewTab(sub.id);
                    }
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12.5px] text-[#d1d5db] transition-colors hover:bg-[#2a2d33] hover:text-white"
                  title={`${sub.name} (middle-click to open in new tab)`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-3.5 w-3.5 shrink-0 fill-[#9ca3af]/75 text-[#9ca3af]" />
                    <span className="truncate">{sub.name}</span>
                  </span>
                  {subChildCount > 0 && (
                    <span className="font-mono text-[10px] text-[#6b7280]">
                      {subChildCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Style 3 & 4: Hover-Minimal (No lines, hover chevrons, branch dimming) or Classic Lines
  const renderIndentedNode = (
    id: string,
    label: string,
    depth: number,
    isRootHome = false
  ): React.ReactNode => {
    const children = childFoldersByParent[id] ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = Boolean(expandedIds[id]);
    const isActive = currentFolderId === id;
    const isOnActivePath = activeAncestorSet.has(id);
    const isHoverMinimal = treeStyle === 'hover-minimal';

    return (
      <div key={id}>
        <div
          onClick={() => onNavigate(id)}
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              onOpenInNewTab(id);
            }
          }}
          style={{ paddingLeft: `${depth * 11 + 6}px` }}
          className={`group/node relative flex cursor-pointer items-center gap-1 rounded py-1 pr-2 text-[12.5px] transition-all duration-150 select-none ${
            isActive
              ? renderActiveRowBackground(true)
              : isHoverMinimal && !isOnActivePath
              ? 'text-[#7c828d] hover:bg-[#2a2d33] hover:text-[#e5e7eb]'
              : 'text-[#d1d5db] hover:bg-[#2a2d33]'
          }`}
          title={`${label} (middle-click to open in new tab)`}
        >
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0 w-[3px] rounded-r bg-[#c48e51]"
            />
          )}

          <button
            type="button"
            tabIndex={hasChildren ? 0 : -1}
            disabled={!hasChildren}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleTreeExpand(id);
            }}
            aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-opacity ${
              !hasChildren
                ? 'opacity-0 pointer-events-none'
                : isHoverMinimal
                ? 'text-[#9ca3af] opacity-0 group-hover/tree:opacity-75 hover:!opacity-100 hover:bg-[#383b42] hover:text-white'
                : 'text-[#9ca3af] hover:bg-[#383b42] hover:text-white'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          {isRootHome ? (
            <Home
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive ? 'text-[#e8b87d]' : 'text-[#d1d5db]'
              }`}
            />
          ) : isExpanded && hasChildren ? (
            <FolderOpen
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive ? 'text-[#e8b87d]' : 'text-[#9ca3af]'
              }`}
            />
          ) : (
            <Folder
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive
                  ? 'fill-[#c48e51]/80 text-[#c48e51]'
                  : 'fill-[#9ca3af]/70 text-[#9ca3af]'
              }`}
            />
          )}

          <span className="truncate">{label}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            {!isHoverMinimal && (
              <span
                aria-hidden="true"
                style={{ left: `${depth * 11 + 13}px` }}
                className="pointer-events-none absolute inset-y-0.5 w-px bg-[#33363e]"
              />
            )}
            {children.map((child) => renderIndentedNode(child.id, child.name, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderPlacesList = () => (
    <div className="space-y-0.5 px-1.5 pb-2">
      {places.slice(0, 3).map((place) => {
        const active = currentFolderId === place.folderId;
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onNavigate(place.folderId)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onOpenInNewTab(place.folderId);
              }
            }}
            className={`relative flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-[13px] transition-colors ${renderActiveRowBackground(
              active
            )}`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0.5 left-0 w-[3px] rounded-r bg-[#c48e51]"
              />
            )}
            {getPlaceIcon(place.id)}
            <span className="truncate">{place.label}</span>
          </button>
        );
      })}

      <div className="my-1.5 border-t border-[#2d3036]" />

      {places.slice(3).map((place) => {
        const active = currentFolderId === place.folderId;
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onNavigate(place.folderId)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onOpenInNewTab(place.folderId);
              }
            }}
            className={`relative flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-[13px] transition-colors ${renderActiveRowBackground(
              active
            )}`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0.5 left-0 w-[3px] rounded-r bg-[#c48e51]"
              />
            )}
            {getPlaceIcon(place.id)}
            <span className="truncate">{place.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderTreeList = () => {
    if (treeStyle === 'drilldown') {
      return renderDrillDownTree();
    }

    if (treeStyle === 'tonal') {
      return (
        <div className="space-y-1 px-1.5 pb-2">
          {renderTonalNode('root-home', 'Home', 0, true)}
          {showDisks && renderTonalNode('disk-usb', 'USB_DATA', 0)}
        </div>
      );
    }

    return (
      <div className="group/tree space-y-0.5 px-1.5 pb-2">
        {renderIndentedNode('root-home', 'Home', 0, true)}
        {showDisks && renderIndentedNode('disk-usb', 'USB_DATA', 0)}
      </div>
    );
  };

  return (
    <aside className="hidden w-[224px] shrink-0 flex-col gap-2 border-r border-[#303339] bg-[#212327] p-2 md:flex max-h-[470px]">
      {pattern === 'accordion-cards' ? (
        <>
          <div
            className={`flex flex-col rounded-lg border border-[#32353c] bg-[#23252a] ${
              placesOpen ? 'min-h-0 flex-1' : 'shrink-0'
            }`}
          >
            <button
              type="button"
              onClick={handleTogglePlacesCard}
              className="flex w-full shrink-0 items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wider text-[#d1d5db] hover:text-white"
            >
              <span>PLACES</span>
              {placesOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#9ca3af]" />
              )}
            </button>

            {placesOpen && (
              <div className="min-h-0 flex-1 overflow-y-auto">{renderPlacesList()}</div>
            )}
          </div>

          <div
            className={`flex flex-col rounded-lg border border-[#32353c] bg-[#23252a] ${
              treeOpen ? 'min-h-0 flex-1' : 'shrink-0'
            }`}
          >
            <button
              type="button"
              onClick={handleToggleTreeCard}
              className="flex w-full shrink-0 items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wider text-[#d1d5db] hover:text-white"
            >
              <span>TREE</span>
              {treeOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#9ca3af]" />
              )}
            </button>

            {treeOpen && (
              <div className="min-h-0 flex-1 overflow-y-auto">{renderTreeList()}</div>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[#32353c] bg-[#23252a]">
          <div className="flex shrink-0 items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-[#d1d5db]">
              {singleCardTab === 'places' ? 'PLACES' : 'TREE'}
            </span>

            <div className="inline-flex items-center rounded border border-[#34373e] bg-[#1a1c20] p-0.5">
              <button
                type="button"
                onClick={() => setSingleCardTab('places')}
                title="Places bookmarks"
                aria-label="Places view"
                aria-pressed={singleCardTab === 'places'}
                className={`rounded p-1 transition-colors ${
                  singleCardTab === 'places'
                    ? 'bg-[#c48e51] text-[#18191c]'
                    : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
              >
                <List className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setSingleCardTab('tree')}
                title="Folder hierarchy tree"
                aria-label="Folder tree view"
                aria-pressed={singleCardTab === 'tree'}
                className={`rounded p-1 transition-colors ${
                  singleCardTab === 'tree'
                    ? 'bg-[#c48e51] text-[#18191c]'
                    : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
              >
                <FolderTree className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {singleCardTab === 'places' ? renderPlacesList() : renderTreeList()}
          </div>
        </div>
      )}

      {/* Dynamic Panel: DISKS */}
      {showDisks && (
        <div className="shrink-0 rounded-lg border border-[#32353c] bg-[#23252a]">
          <button
            type="button"
            onClick={() => setDisksOpen((p) => !p)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#d1d5db] hover:text-white"
          >
            <span>DISKS</span>
            {disksOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[#9ca3af]" />
            )}
          </button>

          {disksOpen && (
            <div className="space-y-1 px-2 pb-2">
              <button
                type="button"
                onClick={() => onNavigate('disk-usb')}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onOpenInNewTab('disk-usb');
                  }
                }}
                className={`relative flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${renderActiveRowBackground(
                  currentFolderId === 'disk-usb'
                )}`}
              >
                {currentFolderId === 'disk-usb' && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0.5 left-0 w-[3px] rounded-r bg-[#c48e51]"
                  />
                )}
                <div className="flex min-w-0 items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[#e5e7eb]">USB_DATA</div>
                    <div className="font-mono text-[10px] tabular-nums text-[#8b929e]">
                      11.4 / 16 GB
                    </div>
                  </div>
                </div>
                <ArrowUpFromLine
                  className="h-3 w-3 shrink-0 text-[#6b7280]"
                  aria-label="Mounted"
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Panel: TRANSFERS */}
      {showTransfers && (
        <div className="shrink-0 rounded-lg border border-[#32353c] bg-[#23252a]">
          <button
            type="button"
            onClick={() => setTransfersOpen((p) => !p)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#d1d5db] hover:text-white"
          >
            <span>TRANSFERS</span>
            {transfersOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[#9ca3af]" />
            )}
          </button>

          {transfersOpen && (
            <div className="space-y-1.5 px-2.5 pb-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-[#d1d5db]">Copying adom_backup.tar.gz</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono tabular-nums text-[#9ca3af]">
                    {transferProgress}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransferPaused((p) => !p)}
                    aria-label={transferPaused ? 'Resume transfer' : 'Pause transfer'}
                    className="rounded p-0.5 text-[#9ca3af] hover:bg-[#34373e] hover:text-white"
                  >
                    {transferPaused ? (
                      <Play className="h-3 w-3" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#181a1d]">
                <div
                  className="h-full rounded-full bg-[#c48e51] transition-all duration-300"
                  style={{ width: `${transferProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
