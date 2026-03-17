import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

export function useCalendarNav() {
  const navigate = useNavigate();
  const store = useStore();
  return {
    goToDay: (date: Date) => {
      const iso = format(date, 'yyyy-MM-dd');
      store.selectDate(iso);
      navigate(`/day/${iso}`);
    },
    goToMonth: (year: number, month: number) => {
      store.goToMonthView();
      navigate(`/calendar/${year}/${month + 1}`);
    },
    goToToday: () => {
      store.goToToday();
      navigate('/calendar');
    },
  };
}
