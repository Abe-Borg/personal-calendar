import type { PropsWithChildren } from 'react';
import useStore from '../../store/useStore';
import { Sidebar } from '../Sidebar/Sidebar';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  return (
    <div className={styles.shell} data-sidebar-closed={!sidebarOpen}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
