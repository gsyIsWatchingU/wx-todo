import { View, Text, ScrollView } from '@tarojs/components';
import type { Task } from '../../../types';
import { startOfWeek, formatWeekRange, getWeekDays, formatDate } from '../../../utils/dateTools';
import './WeekView.scss';

interface WeekViewProps {
  selectedDate: Date;
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  onTaskToggle: (task: Task) => void;
}

export default function WeekView({ selectedDate, tasks, onDateClick, onTaskClick, onTaskToggle }: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate);
  const weekDays = getWeekDays();

  const getTasksForDay = (dayOffset: number): Task[] => {
    const targetDate = new Date(weekStart);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateStr = formatDate(targetDate);
    return tasks.filter(task => task.dueAt === dateStr);
  };

  return (
    <ScrollView className='week-view' scrollY>
      <View className='week-header'>
        <Text className='week-title'>{formatWeekRange(selectedDate)}</Text>
      </View>

      <View className='week-grid'>
        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + dayOffset);
          const dayTasks = getTasksForDay(dayOffset);
          const hasHighPriority = dayTasks.some(task => task.priority === 3);

          return (
            <View
              key={dayOffset}
              className='day-column'
              onClick={() => onDateClick(dayDate)}
            >
              <View className='day-header'>
                <Text className='day-name'>{weekDays[dayOffset]}</Text>
                <Text className={`day-number ${hasHighPriority ? 'has-high-priority' : ''}`}>
                  {dayDate.getDate()}
                </Text>
              </View>

              <View className='day-tasks'>
                {dayTasks.length === 0 ? (
                  <Text className='no-tasks'>-</Text>
                ) : (
                  dayTasks.map(task => (
                    <View
                      key={task.id}
                      className='task-preview'
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      onLongPress={(e) => {
                        e.stopPropagation();
                        onTaskToggle(task);
                      }}
                    >
                      <Text
                        className={`task-dot ${task.completed ? 'completed' : ''} ${task.priority === 3 ? 'high-priority' : ''} ${task.priority === 1 ? 'low-priority' : ''}`}
                      >
                        •
                      </Text>
                      <Text className={`task-title ${task.completed ? 'done' : ''}`}>
                        {task.title}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
