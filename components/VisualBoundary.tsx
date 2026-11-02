"use client";
import { Component, ReactNode } from "react";
import Link from "next/link";
export default class VisualBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="visual-fallback">
        <strong>This visualization is unavailable.</strong>
        <p>
          Your browser may not support WebGL. The monitoring data is still
          available.
        </p>
        <Link href="/map">Open the 2D map →</Link>
      </div>
    ) : (
      this.props.children
    );
  }
}
