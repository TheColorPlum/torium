'use client';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@/components/ui';
import { formatNumber, formatUrl, getShortUrl, copyToClipboard } from '@/lib/format';
import { type Link } from '@/lib/api';
import { useState } from 'react';

interface LinksTableProps {
  links: Link[];
  loading?: boolean;
  onEdit?: (link: Link) => void;
  onToggleStatus?: (link: Link) => void;
  onView?: (link: Link) => void;
}

export function LinksTable({ links, loading, onEdit, onToggleStatus, onView }: LinksTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (link: Link) => {
    const success = await copyToClipboard(getShortUrl(link.slug));
    if (success) {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-bg-tertiary rounded-sm" />
        ))}
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-bg-tertiary flex items-center justify-center">
          <LinkIcon className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-secondary mb-2">No links yet</p>
        <p className="text-sm text-text-muted">Create your first short link to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Short URL</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead className="text-right">Clicks (7d)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.map((link) => (
          <TableRow key={link.id}>
            <TableCell>
              <button
                onClick={() => handleCopy(link)}
                className="flex items-center gap-2 text-accent-500 hover:text-accent-600 transition-colors duration-150 ease-out"
                title="Click to copy"
              >
                <span className="font-medium">{getShortUrl(link.slug)}</span>
                {copiedId === link.id ? (
                  <CheckIcon className="w-4 h-4 text-success" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
              </button>
            </TableCell>
            <TableCell>
              <span className="text-text-secondary" title={link.destination}>
                {formatUrl(link.destination)}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(link.clicks7d)}
            </TableCell>
            <TableCell>
              <StatusBadge status={link.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                {onView && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onView(link)}
                  >
                    View
                  </Button>
                )}
                {onToggleStatus && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onToggleStatus(link)}
                  >
                    {link.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(link)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ status }: { status: 'active' | 'paused' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm ${
        status === 'active'
          ? 'bg-success-bg text-success'
          : 'bg-bg-tertiary text-text-muted'
      }`}
    >
      {status === 'active' ? 'Active' : 'Paused'}
    </span>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
