import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { isISODate } from './dateHelpers';

export function RouteSync() {
  const { pathname } = useLocation();
  const setRouteState = useStore((s) => s.setRouteState);

  useEffect(() => {
    const day = pathname.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
    // Shape alone is not enough: /day/2026-02-30 matches but is not a real date,
    // and formatting an Invalid Date throws during render.
    if (day && isISODate(day[1])) {
      const [year, month] = day[1].split('-').map(Number);
      setRouteState({ view: 'day', selectedDate: day[1], currentYear: year, currentMonth: month - 1 });
      return;
    }
    const month = pathname.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);
    if (month && +month[2] >= 1 && +month[2] <= 12) {
      setRouteState({ view: 'month', currentYear: +month[1], currentMonth: +month[2] - 1, selectedDate: null });
      return;
    }
    const today = new Date();
    setRouteState({ view: 'month', currentYear: today.getFullYear(), currentMonth: today.getMonth(), selectedDate: null });
  }, [pathname, setRouteState]);

  return null;
}
