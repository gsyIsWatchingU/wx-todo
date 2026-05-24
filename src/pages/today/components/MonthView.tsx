import { View, Text } from '@tarojs/components';
import type { Task } from '../../../types';
import { getCalendarDays, getWeekDays, isSameDay, isToday, isSameMonth, formatDate, formatMonthYear } from '../../../utils/dateTools';
import './MonthView.scss';

interface MonthViewProps {
  selectedDate: Date;
  tasks: Task[];
  onDateClick: (date: Date) => void;
}

export default function MonthView({ selectedDate, tasks, onDateClick }: MonthViewProps) {
  const calendarDays = getCalendarDays(selectedDate);
  const weekDays = getWeekDays();

  const getTaskCountForDay = (date: Date): number => {
    const dateStr = formatDate(date);
    return tasks.filter(task => task.dueAt === dateStr).length;
  };

  const hasHighPriorityForDay = (date: Date): boolean => {
    const dateStr = formatDate(date);
    return tasks.some(task => task.dueAt === dateStr && task.priority === 3);
  };

  return (
    <View className='month-view'>
      <View className='month-header'>
        <Text className='month-title'>{formatMonthYear(selectedDate)}</Text>
      </View>

      <View className='weekday-row'>
        {weekDays.map(day => (
          <View key={day} className='weekday-cell'>
            <Text className='weekday-text'>{day}</Text>
          </View>
        ))}
      </View>

      <View className='calendar-grid'>
        {calendarDays.map(date => {
          const taskCount = getTaskCountForDay(date);
          const hasHighPriority = hasHighPriorityForDay(date);
          const isCurrentMonth = isSameMonth(date, selectedDate);
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const cellKey = `${formatDate(date)}-${isCurrentMonth ? 'current' : 'other'}`;

          return (
            <View
              key={cellKey}
              className={`calendar-cell ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => onDateClick(date)}
            >
              <View className='date-number'>{date.getDate()}</View>
              {taskCount > 0 ? (
                <View className='task-indicators'>
                  <View className={`task-count ${taskCount > 2 ? 'many' : ''}`}>
                    {taskCount}
                  </View>
                  {hasHighPriority ? <View className='high-priority-flag'></View> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
