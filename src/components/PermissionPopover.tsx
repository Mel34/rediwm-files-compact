import React, { useEffect, useRef, useState } from 'react';
import { Check, FolderTree, Lock, RotateCcw, User } from 'lucide-react';
import type { FilePermissions } from '../types';
import {
  OWNER_OPTIONS,
  PERMISSION_PRESETS,
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic,
  togglePermissionBit,
  type BitKey,
  type ScopeKey,
} from '../utils/permissions';

interface PermissionPopoverProps {
  title: string;
  isFolder: boolean;
  isBatch?: boolean;
  batchCount?: number;
  initialPermissions: FilePermissions;
  initialOwner: string;
  openUpward?: boolean;
  onApply: (
    nextPermissions: FilePermissions,
    nextOwner: string,
    applyRecursive: boolean
  ) => void;
  onClose: () => void;
}

const SCOPES: { key: ScopeKey; label: string; hint: string }[] = [
  { key: 'owner', label: 'Owner', hint: 'u' },
  { key: 'group', label: 'Group', hint: 'g' },
  { key: 'other', label: 'Other', hint: 'o' },
];

const BITS: { key: BitKey; short: string; label: string }[] = [
  { key: 'read', short: 'R', label: 'Read' },
  { key: 'write', short: 'W', label: 'Write' },
  { key: 'exec', short: 'X', label: 'Exec' },
];

export const PermissionPopover: React.FC<PermissionPopoverProps> = ({
  title,
  isFolder,
  isBatch = false,
  batchCount = 0,
  initialPermissions,
  initialOwner,
  openUpward = false,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState<FilePermissions>(initialPermissions);
  const [owner, setOwner] = useState<string>(initialOwner);
  const [octalInput, setOctalInput] = useState<string>(permissionsToOctal(initialPermissions));
  const [octalError, setOctalError] = useState<boolean>(false);
  const [applyRecursive, setApplyRecursive] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleToggleBit = (scope: ScopeKey, bit: BitKey) => {
    const next = togglePermissionBit(draft, scope, bit);
    setDraft(next);
    setOctalInput(permissionsToOctal(next));
    setOctalError(false);
  };

  const handleOctalChange = (value: string) => {
    const cleaned = value.replace(/[^0-7]/g, '').slice(0, 3);
    setOctalInput(cleaned);
    if (cleaned.length === 3) {
      const parsed = octalToPermissions(cleaned);
      if (parsed) {
        setDraft(parsed);
        setOctalError(false);
        return;
      }
    }
    setOctalError(cleaned.length > 0 && cleaned.length < 3);
  };

  const handlePresetSelect = (octal: string) => {
    const parsed = octalToPermissions(octal);
    if (parsed) {
      setDraft(parsed);
      setOctalInput(octal);
      setOctalError(false);
    }
  };

  const handleReset = () => {
    setDraft(initialPermissions);
    setOwner(initialOwner);
    setOctalInput(permissionsToOctal(initialPermissions));
    setOctalError(false);
    setApplyRecursive(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (octalInput.length !== 3) {
      setOctalError(true);
      return;
    }
    onApply(draft, owner, applyRecursive);
    onClose();
  };

  const currentOctal = permissionsToOctal(draft);
  const currentSymbolic = permissionsToSymbolic(draft, isFolder);
  const folderMissingExec = isFolder && !draft.owner.exec;

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`absolute right-0 z-50 w-[280px] rounded-lg border border-[#3a3d45] bg-[#1e2024] p-3 text-[#e5e7eb] shadow-2xl shadow-black/60 transition-all duration-150 ${
        openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      }`}
      role="dialog"
      aria-label={`Edit permissions for ${title}`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Header: Target name + live symbolic/octal readout */}
        <div className="flex items-center justify-between gap-2 border-b border-[#2d3036] pb-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-[#f3f4f6]">
              {isBatch ? `${batchCount} selected items` : title}
            </div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[#c48e51]">
              {currentSymbolic}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="octal-mode-input" className="sr-only">
              Octal mode
            </label>
            <input
              id="octal-mode-input"
              type="text"
              inputMode="numeric"
              value={octalInput}
              onChange={(e) => handleOctalChange(e.target.value)}
              maxLength={3}
              aria-invalid={octalError}
              className={`w-12 rounded border bg-[#141619] px-1.5 py-1 text-center font-mono text-xs font-medium tabular-nums focus:outline-none focus-visible:ring-1 ${
                octalError
                  ? 'border-red-500/80 text-red-400 focus-visible:ring-red-400'
                  : 'border-[#383b42] text-[#f3f4f6] focus:border-[#c48e51] focus-visible:ring-[#c48e51]'
              }`}
              title="3-digit octal mode (e.g. 755 or 644)"
            />
          </div>
        </div>

        {/* 3x3 Permission Matrix */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_repeat(3,40px)] items-center gap-1.5 px-0.5 text-[11px] font-medium text-[#8b929e]">
            <span>Scope</span>
            {BITS.map((b) => (
              <span key={b.key} className="text-center" title={b.label}>
                {b.label}
              </span>
            ))}
          </div>

          {SCOPES.map((scope) => (
            <div
              key={scope.key}
              className="grid grid-cols-[1fr_repeat(3,40px)] items-center gap-1.5"
            >
              <div className="flex items-baseline gap-1.5 pl-0.5">
                <span className="text-xs font-medium text-[#d1d5db]">{scope.label}</span>
                <span className="font-mono text-[10px] text-[#6b7280]">{scope.hint}</span>
              </div>

              {BITS.map((bit) => {
                const active = draft[scope.key][bit.key];
                return (
                  <button
                    key={bit.key}
                    type="button"
                    onClick={() => handleToggleBit(scope.key, bit.key)}
                    aria-pressed={active}
                    className={`h-7 rounded border font-mono text-xs font-semibold transition-colors duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c48e51] ${
                      active
                        ? 'border-[#c48e51]/70 bg-[#c48e51]/20 text-[#e8b87d] hover:bg-[#c48e51]/30'
                        : 'border-[#30333a] bg-[#25282e] text-[#6b7280] hover:border-[#42464f] hover:text-[#9ca3af]'
                    }`}
                  >
                    {active ? bit.short.toLowerCase() : '—'}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Warning if directory lacks +x */}
        {folderMissingExec && (
          <div className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>Removing Owner Exec (x) prevents opening this folder.</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-1.5 border-t border-[#2d3036] pt-2.5">
          <div className="text-[11px] font-medium text-[#8b929e]">Presets</div>
          <div className="grid grid-cols-5 gap-1">
            {PERMISSION_PRESETS.map((preset) => {
              const isSelected = currentOctal === preset.octal;
              return (
                <button
                  key={preset.octal}
                  type="button"
                  onClick={() => handlePresetSelect(preset.octal)}
                  title={`${preset.label} (${preset.description})`}
                  className={`rounded border py-1 font-mono text-[11px] font-medium tabular-nums transition-colors duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c48e51] ${
                    isSelected
                      ? 'border-[#c48e51] bg-[#c48e51] text-[#18191c]'
                      : 'border-[#32353c] bg-[#25282e] text-[#c5c9d1] hover:border-[#454952] hover:bg-[#2d3037]'
                  }`}
                >
                  {preset.octal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Owner + Optional Recursive Toggle */}
        <div className="flex items-center justify-between gap-2 border-t border-[#2d3036] pt-2.5">
          <label className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
            <User className="h-3.5 w-3.5 text-[#6b7280]" />
            <span>Owner</span>
          </label>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="rounded border border-[#34373e] bg-[#16181b] px-2 py-1 font-mono text-xs text-[#e5e7eb] focus:border-[#c48e51] focus:outline-none"
          >
            {OWNER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {isFolder && !isBatch && (
          <label className="flex cursor-pointer items-center gap-2 rounded bg-[#25282e] px-2 py-1.5 text-xs text-[#d1d5db] hover:bg-[#2b2e35]">
            <input
              type="checkbox"
              checked={applyRecursive}
              onChange={(e) => setApplyRecursive(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#c48e51]"
            />
            <FolderTree className="h-3.5 w-3.5 text-[#9ca3af]" />
            <span>Apply to enclosed files</span>
          </label>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[#9ca3af] transition-colors hover:bg-[#2a2d34] hover:text-[#e5e7eb]"
            title="Revert changes"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#363941] bg-[#25282e] px-2.5 py-1 text-xs font-medium text-[#d1d5db] transition-colors hover:bg-[#2f333a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded bg-[#c48e51] px-3 py-1 text-xs font-semibold text-[#18191c] transition-colors hover:bg-[#d19b5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8b87d]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
