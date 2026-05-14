import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ open, title, body, onCancel, onConfirm }: { open: boolean; title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <p className="mb-4 font-sans text-sm leading-normal text-muted">{body}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>Confirm</Button>
      </div>
    </Dialog>
  );
}
