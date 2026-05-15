import { View, Text } from '@tarojs/components';
import type { Task } from '../../../types';
import { getCalendarDays, getWeekDays, isSameDay, isToday, isSameMonth } from '../../../utils/dateTools';
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
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.dueAt === dateStr).length;
  };

  const hasHighPriorityForDay = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.some(t => t.dueAt === dateStr && t.priority === 3);
  };

  return (
    <View className='month-view'>
      <View className='month-header'>
        <Text className='month-title'>
          {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
        </Text>
      </View>

      <View className='weekday-row'>
        {weekDays.map((day, index) => (
          <View key={index} className='weekday-cell'>
            <Text className='weekday-text'>{day}</Text>
          </View>
        ))}
      </View>

      <View className='calendar-grid'>
        {calendarDays.map((date, index) => {
          const taskCount = getTaskCountForDay(date);
          const hasHighPriority = hasHighPriorityForDay(date);
          const isCurrentMonth = isSameMonth(date, selectedDate);
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);

          return (
            <View
              key={index}
              className={`calendar-cell ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => onDateClick(date)}
            >
              <View className='date-number'>{date.getDate()}</View>
              {taskCount > 0 && (
                <View className='task-indicators'>
                  <View className={`task-count ${taskCount > 2 ? 'many' : ''}`}>
                    {taskCount}
                  </View>
                  {hasHighPriority && <View className='high-priority-flag'></View>}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}