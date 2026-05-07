import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell/AppShell';
import { CalendarHeader } from './components/CalendarHeader/CalendarHeader';
import { MonthView } from './components/MonthView/MonthView';
import { DayView } from './components/DayView/DayView';
import { EventModal } from './components/EventModal/EventModal';
import useStore from './store/useStore';
import { useKeyboardShortcuts } from './utils/useKeyboardShortcuts';
import { RouteSync } from './utils/RouteSync';

function MainPanel() {
  const view = useStore((s) => s.view);
  useKeyboardShortcuts();
  return (
    <>
      <CalendarHeader />
      {view === 'month' ? <MonthView /> : <DayView />}
      <EventModal />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteSync />
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<MainPanel />} />
          <Route path="/calendar/:year/:month" element={<MainPanel />} />
          <Route path="/day/:date" element={<MainPanel />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
