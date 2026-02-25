'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
  Input,
  Banner,
} from '@/components/ui';
import { links as linksApi, type Link, type CreateLinkInput, type UpdateLinkInput, ApiError } from '@/lib/api';
import { getShortUrl, copyToClipboard } from '@/lib/format';

interface LinkModalProps {
  open: boolean;
  onClose: () => void;
  link?: Link | null; // If provided, edit mode
  onSuccess?: (link: Link) => void;
}

export function LinkModal({ open, onClose, link, onSuccess }: LinkModalProps) {
  const isEdit = Boolean(link);
  
  const [destination, setDestination] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Link | null>(null);

  // Reset form when modal opens/closes or link changes
  useEffect(() => {
    if (open) {
      setDestination(link?.destination || '');
      setSlug(link?.slug || '');
      setError(null);
      setSuccess(null);
    }
  }, [open, link]);

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    // Auto-add https:// if no protocol
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    const normalizedDestination = normalizeUrl(destination);
    
    setLoading(true);
    setError(null);

    try {
      let result: Link;
      
      if (isEdit && link) {
        const updates: UpdateLinkInput = {};
        if (normalizedDestination !== link.destination) updates.destination_url = normalizedDestination;
        if (slug !== link.slug) updates.slug = slug || undefined;
        result = await linksApi.update(link.id, updates);
      } else {
        const input: CreateLinkInput = { destination_url: normalizedDestination };
        if (slug.trim()) input.slug = slug;
        result = await linksApi.create(input);
      }

      setSuccess(result);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('This custom slug is already taken. Try a different one.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAndClose = async () => {
    if (success) {
      await copyToClipboard(getShortUrl(success.slug));
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      {success ? (
        <>
          <ModalHeader>
            <ModalTitle>
              {isEdit ? 'Link Updated' : 'Link Created'}
            </ModalTitle>
          </ModalHeader>
          <ModalContent>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-success-bg flex items-center justify-center">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-text-secondary mb-4">Your short link is ready:</p>
              <p className="text-lg font-medium text-accent-500 break-all">
                {getShortUrl(success.slug)}
              </p>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleCopyAndClose}>
              Copy & Close
            </Button>
          </ModalFooter>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>
              {isEdit ? 'Edit Link' : 'Create Link'}
            </ModalTitle>
          </ModalHeader>
          <ModalContent>
            {error && (
              <Banner variant="danger" className="mb-4">
                {error}
              </Banner>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-text-primary mb-1.5">
                  Destination URL <span className="text-danger">*</span>
                </label>
                <Input
                  id="destination"
                  type="text"
                  placeholder="example.com/your-page"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  autoFocus={!isEdit}
                />
                <p className="text-xs text-text-muted mt-1">
                  https:// will be added automatically if not included
                </p>
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-text-primary mb-1.5">
                  Custom slug <span className="text-text-muted">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">tor.io/</span>
                  <Input
                    id="slug"
                    type="text"
                    placeholder="my-link"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Leave empty to auto-generate a short slug
                </p>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !destination.trim()}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  {isEdit ? 'Saving...' : 'Creating...'}
                </span>
              ) : (
                isEdit ? 'Save Changes' : 'Create Link'
              )}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 spinner" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
