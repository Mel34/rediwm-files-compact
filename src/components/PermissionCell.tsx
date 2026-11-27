import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import type { FileItem, FilePermissions, PermissionInteractionMode } from '../types';
import {
  PERMISSION_PRESETS,
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic,
  togglePermissionBit,
  type BitKey,
  type ScopeKey,
} from '../utils/permissions';
import { PermissionPopover } from './PermissionPopover';

interface PermissionCellProps {
  item: FileItem;
  mode: PermissionInteractionMode;
  isSelected: boolean;
  isActivePopover: boolean;
  requireSelectionForInlineBits: boolean;
  openUpward: boolean;
  recentlyUpdated: boolean;
  onOpenPopover: () => void;
  onClosePopover: () => void;
  onCommitPermissions: (
    itemId: string,
    nextPermissions: FilePermissions,
    nextOwner: string,
    applyRecursive: boolean
  ) => void;
}

interface BitDescriptor {
  scope: ScopeKey;
  scopeLabel: string;
  bit: BitKey;
  bitLabel: string;
  activeChar: 'r' | 'w' | 'x';
  active: boolean;
}

export const PermissionCell: React.FC<PermissionCellProps> = ({
  item,
  mode,
  isSelected,
  isActivePopover,
  requireSelectionForInlineBits,
  openUpward,
  recentlyUpdated,
  onOpenPopover,
  onClosePopover,
  onCommitPermissions,
}) => {
  const [inlineOctalEditing, setInlineOctalEditing] = useState(false);
  const [octalDraft, setOctalDraft] = useState(permissionsToOctal(item.permissions));
  const [hoveredBitInfo, setHoveredBitInfo] = useState<string | null>(null);
  const octalInputRef = useRef<HTMLInputElement>(null);
  const comboContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOctalDraft(permissionsToOctal(item.permissions));
  }, [item.permissions]);

  useEffect(() => {
    if (inlineOctalEditing) {
      octalInputRef.current?.focus();
      octalInputRef.current?.select();
    }
  }, [inlineOctalEditing]);

  useEffect(() => {
    if (!inlineOctalEditing) return;
    const handleOutside = (e: MouseEvent) => {
      if (comboContainerRef.current && !comboContainerRef.current.contains(e.target as Node)) {
        setInlineOctalEditing(false);
        setOctalDraft(permissionsToOctal(item.permissions));
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [inlineOctalEditing, item.permissions]);

  const symbolic = permissionsToSymbolic(item.permissions, item.isFolder);
  const octal = permissionsToOctal(item.permissions);

  const bitDescriptors: BitDescriptor[] = [
    { scope: 'owner', scopeLabel: 'Owner', bit: 'read', bitLabel: 'Read', activeChar: 'r', active: item.permissions.owner.read },
    { scope: 'owner', scopeLabel: 'Owner', bit: 'write', bitLabel: 'Write', activeChar: 'w', active: item.permissions.owner.write },
    { scope: 'owner', scopeLabel: 'Owner', bit: 'exec', bitLabel: 'Exec', activeChar: 'x', active: item.permissions.owner.exec },
    { scope: 'group', scopeLabel: 'Group', bit: 'read', bitLabel: 'Read', activeChar: 'r', active: item.permissions.group.read },
    { scope: 'group', scopeLabel: 'Group', bit: 'write', bitLabel: 'Write', activeChar: 'w', active: item.permissions.group.write },
    { scope: 'group', scopeLabel: 'Group', bit: 'exec', bitLabel: 'Exec', activeChar: 'x', active: item.permissions.group.exec },
    { scope: 'other', scopeLabel: 'Other', bit: 'read', bitLabel: 'Read', activeChar: 'r', active: item.permissions.other.read },
    { scope: 'other', scopeLabel: 'Other', bit: 'write', bitLabel: 'Write', activeChar: 'w', active: item.permissions.other.write },
    { scope: 'other', scopeLabel: 'Other', bit: 'exec', bitLabel: 'Exec', activeChar: 'x', active: item.permissions.other.exec },
  ];

  // Mode 1: Anchored 3x3 Popover
  if (mode === 'popover') {
    return (
      <div className="relative flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isActivePopover) {
              onClosePopover();
            } else {
              onOpenPopover();
            }
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          title={`Click to edit permissions (${octal})`}
          className={`group/perm inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -ml-1.5 font-mono text-[13px] tabular-nums transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c48e51] ${
            isActivePopover
              ? 'bg-[#c48e51]/20 text-[#f3c58b] ring-1 ring-[#c48e51]/60'
              : recentlyUpdated
              ? 'bg-[#c48e51]/15 text-[#e8b87d]'
              : 'text-[#d1d5db] hover:bg-[#34373e] hover:text-white'
          }`}
        >
          <span>{symbolic}</span>
          <span className="text-[#9ca3af] group-hover/perm:text-[#d1d5db]">({item.ownerName})</span>
          <Pencil
            className={`h-3 w-3 transition-opacity duration-150 ${
              isActivePopover
                ? 'opacity-100 text-[#e8b87d]'
                : 'opacity-0 text-[#9ca3af] group-hover/perm:opacity-100 group-hover/row:opacity-70'
            }`}
          />
        </button>

        {isActivePopover && (
          <PermissionPopover
            title={item.name}
            isFolder={item.isFolder}
            initialPermissions={item.permissions}
            initialOwner={item.ownerName}
            openUpward={openUpward}
            onApply={(nextPerms, nextOwner, recursive) =>
              onCommitPermissions(item.id, nextPerms, nextOwner, recursive)
            }
            onClose={onClosePopover}
          />
        )}
      </div>
    );
  }

  // Mode 2: Inline Bit-by-Bit Toggling
  if (mode === 'inline-bits') {
    const canToggleDirectly = !requireSelectionForInlineBits || isSelected;

    return (
      <div
        className="relative flex items-center gap-1.5"
        onClick={(e) => {
          if (canToggleDirectly) {
            e.stopPropagation();
          }
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div
          className={`inline-flex items-center rounded px-1 py-0.5 -ml-1 font-mono text-[13px] tabular-nums transition-colors ${
            recentlyUpdated
              ? 'bg-[#c48e51]/15 text-[#e8b87d]'
              : canToggleDirectly
              ? 'group-hover/row:bg-[#2c2f36]/90'
              : 'hover:bg-[#32353c]/60'
          }`}
        >
          <span className="w-[1ch] text-center text-[#6b7280] select-none">
            {item.isFolder ? 'd' : '-'}
          </span>

          {bitDescriptors.map((bd, idx) => {
            const isGroupBreak = idx === 3 || idx === 6;
            const char = bd.active ? bd.activeChar : '-';
            return (
              <React.Fragment key={`${bd.scope}-${bd.bit}`}>
                {isGroupBreak && (
                  <span
                    className={`inline-block transition-all duration-150 ${
                      canToggleDirectly ? 'w-0 group-hover/row:w-1' : 'w-0'
                    }`}
                  />
                )}
                <button
                  type="button"
                  disabled={!canToggleDirectly}
                  onMouseEnter={() => {
                    if (canToggleDirectly) {
                      setHoveredBitInfo(
                        `${bd.scopeLabel} ${bd.bitLabel}: ${bd.active ? 'Enabled' : 'Disabled'} (${octal})`
                      );
                    }
                  }}
                  onMouseLeave={() => setHoveredBitInfo(null)}
                  onClick={(e) => {
                    if (!canToggleDirectly) return;
                    e.stopPropagation();
                    const next = togglePermissionBit(item.permissions, bd.scope, bd.bit);
                    onCommitPermissions(item.id, next, item.ownerName, false);
                  }}
                  aria-label={`${bd.scopeLabel} ${bd.bitLabel}`}
                  className={`w-[1.15ch] py-0.5 text-center rounded-[2px] transition-colors duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c48e51] ${
                    !canToggleDirectly
                      ? 'cursor-default text-[#d1d5db]'
                      : bd.active
                      ? 'cursor-pointer text-[#e8b87d] hover:bg-[#c48e51]/30 hover:text-white'
                      : 'cursor-pointer text-[#6b7280] hover:bg-[#3d4149] hover:text-[#e5e7eb]'
                  }`}
                >
                  {char}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <span className="font-mono text-[13px] text-[#9ca3af] select-none">
          ({item.ownerName})
        </span>

        {!canToggleDirectly && (
          <span className="ml-1 hidden text-[11px] text-[#6b7280] group-hover/row:inline">
            Select row to edit
          </span>
        )}

        {hoveredBitInfo && canToggleDirectly && (
          <div
            className={`pointer-events-none absolute left-0 z-40 whitespace-nowrap rounded border border-[#3a3d45] bg-[#181a1d] px-2 py-1 text-[11px] font-medium text-[#e5e7eb] shadow-lg ${
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            {hoveredBitInfo}
          </div>
        )}
      </div>
    );
  }

  // Mode 3: Inline Octal + Preset Combobox
  return (
    <div
      ref={comboContainerRef}
      className="relative flex items-center"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {!inlineOctalEditing ? (
        <button
          type="button"
          onClick={() => {
            setOctalDraft(octal);
            setInlineOctalEditing(true);
          }}
          className={`group/combo inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -ml-1.5 font-mono text-[13px] tabular-nums transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c48e51] ${
            recentlyUpdated
              ? 'bg-[#c48e51]/15 text-[#e8b87d]'
              : 'text-[#d1d5db] hover:bg-[#34373e] hover:text-white'
          }`}
          title="Click to enter octal mode or choose preset"
        >
          <span>{symbolic}</span>
          <span className="text-[#9ca3af]">({item.ownerName})</span>
          <ChevronDown className="h-3 w-3 text-[#8b929e] opacity-0 transition-opacity group-hover/combo:opacity-100 group-hover/row:opacity-70" />
        </button>
      ) : (
        <div className="relative flex items-center gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = octalToPermissions(octalDraft);
              if (parsed) {
                onCommitPermissions(item.id, parsed, item.ownerName, false);
                setInlineOctalEditing(false);
              }
            }}
            className="flex items-center gap-1"
          >
            <input
              ref={octalInputRef}
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={octalDraft}
              onChange={(e) => setOctalDraft(e.target.value.replace(/[^0-7]/g, '').slice(0, 3))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setInlineOctalEditing(false);
                }
              }}
              className="w-12 rounded border border-[#c48e51] bg-[#141619] px-1.5 py-0.5 text-center font-mono text-xs font-semibold tabular-nums text-[#f3f4f6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={octalDraft.length !== 3}
              className="rounded bg-[#c48e51] px-2 py-0.5 text-[11px] font-semibold text-[#18191c] hover:bg-[#d19b5e] disabled:opacity-40"
            >
              Set
            </button>
          </form>

          {/* Compact preset dropdown anchored directly beneath the inline input */}
          <div
            className={`absolute left-0 z-50 w-44 rounded-md border border-[#3a3d45] bg-[#1c1e22] py-1 shadow-xl ${
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            {PERMISSION_PRESETS.map((preset) => {
              const active = preset.octal === octal;
              return (
                <button
                  key={preset.octal}
                  type="button"
                  onClick={() => {
                    const parsed = octalToPermissions(preset.octal);
                    if (parsed) {
                      onCommitPermissions(item.id, parsed, item.ownerName, false);
                      setInlineOctalEditing(false);
                    }
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? 'bg-[#c48e51]/20 text-[#e8b87d]'
                      : 'text-[#d1d5db] hover:bg-[#2a2d34]'
                  }`}
                >
                  <span className="font-mono font-semibold tabular-nums">{preset.octal}</span>
                  <span className="font-mono text-[11px] text-[#8b929e]">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
