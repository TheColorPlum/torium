'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import { LinksTable, LinkModal } from '@/components/dashboard';
import { useAsync, useDebounce } from '@/lib/hooks';
import { links as linksApi, type Link } from '@/lib/api';

export default function LinksPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  
  const debouncedSearch = useDebounce(search, 300);

  const { data, loading, refetch } = useAsync(
    () => linksApi.list(),
    []
  );

  // Client-side filtering
  const filteredLinks = useMemo(() => {
    if (!data?.links) return [];
    if (!debouncedSearch) return data.links;
    
    const searchLower = debouncedSearch.toLowerCase();
    return data.links.filter(
      (link) =>
        link.slug.toLowerCase().includes(searchLower) ||
        link.destination.toLowerCase().includes(searchLower)
    );
  }, [data?.links, debouncedSearch]);

  const handleCreateClick = () => {
    setEditingLink(null);
    setModalOpen(true);
  };

  const handleEditClick = (link: Link) => {
    setEditingLink(link);
    setModalOpen(true);
  };

  const handleViewClick = (link: Link) => {
    router.push(`/dashboard/links/${link.id}`);
  };

  const handleToggleStatus = async (link: Link) => {
    try {
      await linksApi.update(link.id, {
        status: link.status === 'active' ? 'paused' : 'active',
      });
      refetch();
    } catch {
      // Handle error silently or show toast
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingLink(null);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Your Links</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                type="text"
                placeholder="Search links..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button onClick={handleCreateClick}>
              <span className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Create Link
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LinksTable
            links={filteredLinks}
            loading={loading}
            onEdit={handleEditClick}
            onToggleStatus={handleToggleStatus}
            onView={handleViewClick}
          />
          
          {/* Results summary */}
          {!loading && data?.links && (
            <p className="text-sm text-text-muted mt-4">
              {debouncedSearch
                ? `${filteredLinks.length} of ${data.links.length} links`
                : `${data.links.length} total links`}
            </p>
          )}
        </CardContent>
      </Card>

      <LinkModal
        open={modalOpen}
        onClose={handleModalClose}
        link={editingLink}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
