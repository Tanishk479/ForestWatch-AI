"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import {
  Trees,
  LayoutDashboard,
  ScanLine,
  Radio,
  Map,
  ArrowUpRight,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  Bell,
  Command,
} from "lucide-react";
import { Region, regions } from "@/lib/data";
const Context = createContext<{ region: Region; period: string }>({
  region: "Western Ghats",
  period: "Last 30 days",
});
export const useMonitor = () => useContext(Context);
const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/monitoring", label: "Forest monitoring", icon: ScanLine },
  { href: "/map", label: "Geospatial map", icon: Map },
  { href: "/devices", label: "Device network", icon: Radio },
];
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region>("Western Ghats");
  const [period, setPeriod] = useState("Last 30 days");
  const [notice, setNotice] = useState(false);
  return (
    <Context.Provider value={{ region, period }}>
      <div className="app-shell">
        <aside className={`sidebar ${open ? "is-open" : ""}`}>
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-icon">
              <Trees size={25} />
            </span>
            <span>
              ForestWatch<span className="brand-ai"> AI</span>
              <small>INTELLIGENCE FOR THE WILD</small>
            </span>
          </Link>
          <div className="workspace-label">WORKSPACE</div>
          <nav>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`nav-link ${path === href ? "active" : ""}`}
              >
                <Icon size={18} />
                {label}
                {path === href && <span className="nav-active-dot" />}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="mission">
              <div className="mission-icon">
                <ShieldCheck size={23} />
              </div>
              <strong>
                A living planet.
                <br />A shared responsibility.
              </strong>
              <p>
                Every signal helps protect
                <br />
                what matters.
              </p>
              <Link href="/monitoring">
                Explore forest insights <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="user">
              <div className="avatar">AK</div>
              <div>
                <strong>Alex Kim</strong>
                <small>Conservation analyst · Demo</small>
              </div>
              <span className="online-dot" />
            </div>
          </div>
        </aside>
        {open && (
          <button
            aria-label="Close navigation"
            className="nav-backdrop"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen(!open)}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
              <Command size={16} />
              <span>Workspace</span>
              <span className="slash">/</span>
              <strong>
                {links.find((x) => x.href === path)?.label ?? "ForestWatch"}
              </strong>
            </div>
            <div className="topbar-right">
              <span className="sample-pill">
                <span /> DEMO WORKSPACE
              </span>
              <button
                className="icon-button notification"
                aria-label="Show workspace notifications"
                onClick={() => setNotice(!notice)}
              >
                <Bell size={18} />
                <i />
              </button>
              <div className="avatar small">AK</div>
            </div>
            {notice && (
              <div className="notification-popover">
                <strong>Workspace notifications</strong>
                <p>4 sample events are available in the alert timeline.</p>
                <p>
                  All monitoring values are illustrative. No hardware is
                  connected.
                </p>
                <button
                  className="text-button"
                  onClick={() => setNotice(false)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </header>
          <main>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="online-dot" /> FOREST INTELLIGENCE PLATFORM
                </div>
                <h1>
                  {path === "/"
                    ? "Eyes on the forest."
                    : path === "/monitoring"
                      ? "See change. Take action."
                      : path === "/devices"
                        ? "Connected to the wild."
                        : "A clearer view from above."}
                </h1>
                <p>
                  {path === "/"
                    ? "A connected view of your forests. Every acre, every signal, in focus."
                    : path === "/monitoring"
                      ? "Track canopy health and understand how your landscape is changing."
                      : path === "/devices"
                        ? "Explore the simulated sensor network and its operational health."
                        : "Explore sample events, monitoring zones, and sensor locations."}
                </p>
              </div>
              <div className="heading-filters">
                <label className="select-wrap">
                  <Map size={14} />
                  <select
                    aria-label="Monitoring region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value as Region)}
                  >
                    {regions.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                <label className="select-wrap">
                  <select
                    aria-label="Reporting period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option>Last 30 days</option>
                    <option>Last 7 days</option>
                    <option>Last 90 days</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
              </div>
            </div>
            <div className="demo-banner">
              <span className="online-dot" /> Sample data environment{" "}
              <span className="banner-divider">/</span>
              <span>
                Illustrative satellite analysis and simulated devices. No live
                monitoring.
              </span>
            </div>
            {children}
            <footer>
              <span>
                <Trees size={14} /> ForestWatch AI
              </span>
              <span>Built for a greener tomorrow.</span>
              <span>Sample dataset · 03 Nov 2026, 14:32 IST</span>
            </footer>
          </main>
        </div>
      </div>
    </Context.Provider>
  );
}
