import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import {
  GridIcon,
  InfoIcon,
  LogoMark,
  LogoutIcon,
  MenuIcon,
} from "@/components/ui/icons";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`${styles.shell} ${isSidebarOpen ? "" : styles.collapsed}`}>
      <aside
        id="app-sidebar"
        className={styles.sidebar}
      >
        <div className={styles.brand}>
          {isSidebarOpen && <div className={styles.brandContent}>
            <LogoMark width={32} height={32} />
            <div>
              <strong>Claritas</strong>
              <span>AI Role Play</span>
            </div>
          </div>}
          <button
            type="button"
            className={isSidebarOpen ? styles.menuToggle : styles.logoToggle}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isSidebarOpen}
            aria-controls="app-sidebar"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
          >
            {isSidebarOpen ? (
              <MenuIcon width={22} height={22} aria-hidden="true" />
            ) : (
              <LogoMark width={32} height={32} />
            )}
          </button>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          <NavLink
            to="/"
            aria-label="Scenarios"
            title={!isSidebarOpen ? "Scenarios" : undefined}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ""}`
            }
            end
          >
            <GridIcon width={16} height={16} aria-hidden="true" />
            {isSidebarOpen && "Scenarios"}
          </NavLink>
          {isSidebarOpen && <NavLink
            to="/about"
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ""}`
            }
          >
            <InfoIcon width={16} height={16} />
            About
          </NavLink>}
        </nav>

        <div className={styles.footer}>
          <Avatar name={user.displayName} />
          {isSidebarOpen && <div className={styles.userMeta}>
            <strong>{user.displayName}</strong>
            <button
              type="button"
              className={styles.logout}
              onClick={() => void signOut()}
            >
              <LogoutIcon width={14} height={14} />
              Logout
            </button>
          </div>}
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
