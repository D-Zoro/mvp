"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-sm border border-border bg-surface p-4 shadow-sm">
          <p className="mb-3 font-sans text-sm text-muted">This section could not be loaded.</p>
          <Button variant="secondary" onClick={() => this.setState({ hasError: false })}>Retry</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
