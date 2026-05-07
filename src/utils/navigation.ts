import { addMonths, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function useCalendarNav() {
  const navigate = useNavigate();
  return {
    goToDay: (date: Date) => navigate(`/day/${format(date, 'yyyy-MM-dd')}`),
    goToMonth: (year: number, month: number) => navigate(`/calendar/${year}/${month + 1}`),
    goToToday: () => navigate('/calendar'),
    navigateMonth: (direction: 1 | -1, year: number, month: number) => {
      const d = addMonths(new Date(year, month, 1), direction);
      navigate(`/calendar/${d.getFullYear()}/${d.getMonth() + 1}`);
    },
  };
}
