import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import type { FileItem, FilePermissions } from '../types';
import { octalToPermissions, permissionsToOctal } from '../utils/permissions';
import { PermissionPopover } from './PermissionPopover';

interface BatchPermissionBarProps {
  selectedItems: FileItem[];
  onApplyBatch: (nextPermissions: FilePermissions, nextOwner: string) => void;
  onClearSelection: () => void;
}

const BATCH_QUICK_MODES = ['600', '644', '755'];

export const BatchPermissionBar: React.FC<BatchPermissionBarProps> = ({
  selectedItems,
  onApplyBatch,
  onClearSelection,
}) => {
  const [batchMatrixOpen, setBatchMatrixOpen] = useState(false);

  if (selectedItems.length < 2) {
    return null;
  }

  const firstItem = selectedItems[0];
  const allSameOctal = selectedItems.every(
    (item) => permissionsToOctal(item.permissions) === permissionsToOctal(firstItem.permissions)
  );
  const sharedOctal = allSameOctal ? permissionsToOctal(firstItem.permissions) : null;

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-[#34373e] bg-[#202226] px-4 py-2 text-xs">
      <div className="flex items-center gap-2 text-[#d1d5db]">
        <Shield className="h-3.5 w-3.5 text-[#c48e51]" />
        <span className="font-medium">
          {selectedItems.length} items selected
        </span>
        <span className="text-[#6b7280]" aria-hidden="true">
          ·
        </span>
        <span className="text-[#9ca3af]">
          Batch set permissions:
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {BATCH_QUICK_MODES.map((octal) => {
          const isCurrent = sharedOctal === octal;
          return (
            <button
              key={octal}
              type="button"
              onClick={() => {
                const parsed = octalToPermissions(octal);
                if (parsed) {
                  onApplyBatch(parsed, firstItem.ownerName);
                }
              }}
              className={`rounded border px-2 py-1 font-mono text-[11px] font-medium tabular-nums transition-colors ${
                isCurrent
                  ? 'border-[#c48e51] bg-[#c48e51] text-[#18191c]'
                  : 'border-[#383b42] bg-[#2a2d33] text-[#d1d5db] hover:border-[#4b4f58] hover:bg-[#32363d]'
              }`}
            >
              {octal}
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            onClick={() => setBatchMatrixOpen((prev) => !prev)}
            className="rounded border border-[#c48e51]/60 bg-[#c48e51]/15 px-2.5 py-1 text-[11px] font-medium text-[#e8b87d] transition-colors hover:bg-[#c48e51]/25"
          >
            Custom matrix…
          </button>

          {batchMatrixOpen && (
            <PermissionPopover
              title="Selected items"
              isFolder={selectedItems.some((item) => item.isFolder)}
              isBatch
              batchCount={selectedItems.length}
              initialPermissions={firstItem.permissions}
              initialOwner={firstItem.ownerName}
              openUpward
              onApply={(nextPerms, nextOwner) => onApplyBatch(nextPerms, nextOwner)}
              onClose={() => setBatchMatrixOpen(false)}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="ml-1 rounded p-1 text-[#8b929e] transition-colors hover:bg-[#2d3036] hover:text-[#e5e7eb]"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
