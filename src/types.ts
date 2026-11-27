export type PermissionInteractionMode = 'popover' | 'inline-bits' | 'octal-combo';

export type TabPlacementMode = 'titlebar' | 'below-titlebar' | 'pane-scoped';

export type ToolbarDensity = 'screenshot' | 'sweet-spot' | 'compact';

export type SidebarTreePattern = 'accordion-cards' | 'single-card-toggle';

export type TreeVisualStyle = 'tonal' | 'drilldown' | 'hover-minimal' | 'classic';

export interface PermissionScope {
  read: boolean;
  write: boolean;
  exec: boolean;
}

export interface FilePermissions {
  owner: PermissionScope;
  group: PermissionScope;
  other: PermissionScope;
}

export type SortField = 'name' | 'size' | 'type' | 'modified' | 'permissions';
export type SortDirection = 'asc' | 'desc';

export interface FileItem {
  id: string;
  parentId: string;
  name: string;
  isFolder: boolean;
  sizeBytes: number | null;
  sizeLabel: string;
  typeLabel: string;
  modifiedLabel: string;
  modifiedTimestamp: number;
  ownerName: string;
  permissions: FilePermissions;
}

export interface PlaceEntry {
  id: string;
  label: string;
  path: string[];
  folderId: string;
}

export interface TabState {
  id: string;
  history: string[];
  historyIndex: number;
  selectedIds: string[];
  lastSelectedId: string | null;
  viewLayout: 'list' | 'grid';
  sortField: SortField;
  sortDirection: SortDirection;
  filterOpen: boolean;
  filterQuery: string;
}
