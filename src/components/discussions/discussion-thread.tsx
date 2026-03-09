"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useDiscussions, useCreateDiscussion, useDeleteDiscussion } from '@/hooks/use-discussions';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Discussion } from '@/types/contracts';

interface DiscussionThreadProps {
  contractId?: string;
  vendorId?: string;
}

export function DiscussionThread({ contractId, vendorId }: DiscussionThreadProps) {
  const [body, setBody] = useState('');
  const { data: discussions, isLoading } = useDiscussions(contractId, vendorId);
  const createDiscussion = useCreateDiscussion();
  const deleteDiscussion = useDeleteDiscussion();
  const { data: currentUser } = useCurrentUser();

  const handleSubmit = () => {
    if (!body.trim()) return;
    createDiscussion.mutate(
      { body: body.trim(), contract_id: contractId, vendor_id: vendorId },
      { onSuccess: () => setBody('') }
    );
  };

  const getInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />
          ))}
        </div>
      ) : !discussions || discussions.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-50)', textAlign: 'center', padding: 32 }}>
          No comments yet. Start the discussion below.
        </p>
      ) : (
        <div className="disc-thread">
          {discussions.map((disc: Discussion) => (
            <div key={disc.id} className="disc-msg">
              <div className="disc-avatar">{getInitials(disc.user_id)}</div>
              <div className="disc-body">
                <div className="disc-meta">
                  <span className="disc-name">{disc.user_id.slice(0, 8)}</span>
                  <span className="disc-time">{formatDistanceToNow(new Date(disc.created_at), { addSuffix: true })}</span>
                  {currentUser?.id === disc.user_id && (
                    <button
                      onClick={() => deleteDiscussion.mutate(disc.id)}
                      style={{ fontSize: 11, color: 'var(--red)', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="disc-text">{disc.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="disc-composer" style={{ marginTop: 16 }}>
        <textarea
          className="disc-input"
          rows={2}
          placeholder="Add a comment..."
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!body.trim() || createDiscussion.isPending}
          style={{ alignSelf: 'flex-end' }}
        >
          {createDiscussion.isPending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
