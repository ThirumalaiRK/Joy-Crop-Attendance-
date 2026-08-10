'use client';

import React, { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

export interface EmployeeAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  employeeId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  editable?: boolean;
  onAvatarChange?: (newUrl: string | null) => void;
  showBadge?: boolean;
  status?: 'online' | 'offline' | 'active' | 'suspended';
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px] rounded-lg',
  sm: 'w-8 h-8 text-xs rounded-xl',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-14 h-14 text-base rounded-2xl',
  xl: 'w-16 h-16 text-lg rounded-2xl',
  '2xl': 'w-24 h-24 text-2xl rounded-3xl',
};

const GRADIENT_PALETTES = [
  'from-indigo-600 to-violet-700 text-white shadow-indigo-500/20',
  'from-cyan-600 to-blue-700 text-white shadow-cyan-500/20',
  'from-emerald-600 to-teal-700 text-white shadow-emerald-500/20',
  'from-amber-600 to-orange-700 text-white shadow-amber-500/20',
  'from-rose-600 to-pink-700 text-white shadow-rose-500/20',
  'from-fuchsia-600 to-purple-700 text-white shadow-fuchsia-500/20',
  'from-violet-600 to-indigo-800 text-white shadow-violet-500/20',
];

export function getInitials(name?: string): string {
  if (!name) return 'EM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name?: string): string {
  if (!name) return GRADIENT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

export function EmployeeAvatar({
  name = 'Employee',
  avatarUrl,
  employeeId,
  size = 'md',
  className,
  editable = false,
  onAvatarChange,
  showBadge = false,
  status,
}: EmployeeAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(name);
  const gradient = getGradient(name);
  const hasValidImage = Boolean(avatarUrl) && !imageError;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size must be less than 5 MB.');
      return;
    }

    setIsUploading(true);
    const tid = toast.loading('Uploading employee avatar...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeeId', employeeId);

      const res = await fetch('/api/admin/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setImageError(false);
      onAvatarChange?.(data.avatarUrl);
      toast.success('✅ Avatar photo updated successfully!', { id: tid });
    } catch (err: any) {
      toast.error(`❌ ${err.message || 'Failed to upload photo'}`, { id: tid });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!employeeId) return;
    if (!confirm('Remove profile photo and use initials avatar?')) return;

    const tid = toast.loading('Removing avatar...');
    try {
      const res = await fetch(`/api/admin/avatar?employeeId=${encodeURIComponent(employeeId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remove failed');

      setImageError(true);
      onAvatarChange?.(null);
      toast.success('Avatar removed. Initials fallback active.', { id: tid });
    } catch (err: any) {
      toast.error(`Failed to remove avatar: ${err.message}`, { id: tid });
    }
  };

  return (
    <div className="relative inline-block group shrink-0">
      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* Main Avatar Frame */}
      <div
        className={clsx(
          'relative overflow-hidden flex items-center justify-center font-black tracking-wider transition-all duration-200 border-2 select-none shadow-md',
          SIZE_MAP[size],
          hasValidImage ? 'border-amber-500/40 bg-slate-900' : clsx('bg-gradient-to-br border-slate-700/80', gradient),
          className
        )}
      >
        {hasValidImage ? (
          <img
            src={avatarUrl!}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}

        {/* Uploading Overlay Spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          </div>
        )}

        {/* Hover Edit Overlay */}
        {editable && !isUploading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10"
            title="Click to upload new avatar"
          >
            <Camera className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Quick Remove Button on Hover if photo exists */}
      {editable && hasValidImage && (
        <button
          type="button"
          onClick={handleRemoveAvatar}
          className="absolute -top-1 -right-1 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-md z-30"
          title="Remove profile photo"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Optional Status Indicator Badge */}
      {showBadge && status && (
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950',
            status === 'active' || status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
          )}
        />
      )}
    </div>
  );
}
