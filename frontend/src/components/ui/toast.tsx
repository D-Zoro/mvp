"use client";

export function Toaster() {
  return <div id="toast-root" className="fixed right-4 top-20 z-50" />;
}

export function useToast() {
  return {
    toast: ({ title }: { title: string; description?: string }) => {
      if (typeof window !== "undefined") window.alert(title);
    },
  };
}
