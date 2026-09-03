import { useMemo } from 'react';
import { addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toISODate } from './dateHelpers';

export function useCalendarNav() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      /** Takes an ISO `yyyy-MM-dd` string — passing a Date here invites UTC/local drift. */
      goToDay: (iso: string) => navigate(`/day/${iso}`),
      goToMonth: (year: number, month: number) => navigate(`/calendar/${year}/${month + 1}`),
      goToToday: () => navigate('/calendar'),
      navigateMonth: (direction: 1 | -1, year: number, month: number) => {
        const d = addMonths(new Date(year, month, 1), direction);
        navigate(`/calendar/${d.getFullYear()}/${d.getMonth() + 1}`);
      },
      goToTodayDay: () => navigate(`/day/${toISODate(new Date())}`),
    }),
    [navigate],
  );
}
