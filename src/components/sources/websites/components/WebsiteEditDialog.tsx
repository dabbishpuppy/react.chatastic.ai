
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgentSource } from '@/types/rag';

interface WebsiteEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: AgentSource | null;
  onSave: (sourceId: string, newUrl: string) => void;
}

const WebsiteEditDialog: React.FC<WebsiteEditDialogProps> = ({
  open,
  onOpenChange,
  source,
  onSave
}) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (source?.url) {
      setUrl(source.url);
    }
  }, [source]);

  const handleSave = () => {
    if (source && url.trim()) {
      onSave(source.id, url.trim());
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (source?.url) {
      setUrl(source.url);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Website URL</DialogTitle>
          <DialogDescription>
            Update the URL for this website source.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!url.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteEditDialog;
