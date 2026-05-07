import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store/useStore';

export function RouteSync() {
  const { pathname } = useLocation();
  const setRouteState = useStore((s) => s.setRouteState);

  useEffect(() => {
    const day = pathname.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
    if (day) {
      const [year, month] = day[1].split('-').map(Number);
      setRouteState({ view: 'day', selectedDate: day[1], currentYear: year, currentMonth: month - 1 });
      return;
    }
    const month = pathname.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);
    if (month) {
      setRouteState({ view: 'month', currentYear: +month[1], currentMonth: +month[2] - 1, selectedDate: null });
      return;
    }
    const today = new Date();
    setRouteState({ view: 'month', currentYear: today.getFullYear(), currentMonth: today.getMonth(), selectedDate: null });
  }, [pathname, setRouteState]);

  return null;
}
