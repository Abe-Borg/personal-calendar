import { useEffect, useState, type PropsWithChildren } from 'react';
import useStore from '../../store/useStore';
import { openDatabase } from '../../db/db';
import { Sidebar } from '../Sidebar/Sidebar';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    void openDatabase().then(setDbError);
  }, []);

  if (dbError) {
    return (
      <div className={styles.fatal} role="alert">
        <h1>Storage is unavailable</h1>
        <p>
          This calendar keeps everything in your browser’s local database, and the browser refused to
          open it. That usually means private/incognito browsing, or site data is blocked for this page.
        </p>
        <p className={styles.fatalDetail}>{dbError}</p>
        <p>Open this file in a normal window, or allow site data for it, then reload.</p>
      </div>
    );
  }

  return (
    <div className={styles.shell} data-sidebar-closed={!sidebarOpen}>
      <Sidebar />
      {/* Pointer convenience only. The drawer has its own labelled close button,
          so keeping this out of the tab order avoids a duplicate control. */}
      {sidebarOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-hidden="true"
          tabIndex={-1}
          onClick={toggleSidebar}
        />
      )}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
