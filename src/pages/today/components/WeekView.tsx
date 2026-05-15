import { View, Text, ScrollView } from '@tarojs/components';
import type { Task } from '../../../types';
import { startOfWeek, formatDisplayDate, getWeekDays } from '../../../utils/dateTools';
import TaskItem from '../../../components/TaskItem';
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
    const dateStr = targetDate.toISOString().split('T')[0];
    return tasks.filter(t => t.dueAt === dateStr);
  };

  return (
    <ScrollView className='week-view' scrollY>
      <View className='week-header'>
        <Text className='week-title'>
          {weekStart.getMonth() + 1}月{weekStart.getDate()}日 - 
          {new Date(weekStart.getTime() + 6 * 86400000).getMonth() + 1}月
          {new Date(weekStart.getTime() + 6 * 86400000).getDate()}日
        </Text>
      </View>

      <View className='week-grid'>
        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + dayOffset);
          const dayTasks = getTasksForDay(dayOffset);
          const hasHighPriority = dayTasks.some(t => t.priority === 3);

          return (
            <View 
              key={dayOffset} 
              className='day-column'
              onClick={() => onDateClick(dayDate)}
            >
              <View className='day-header'>
                <Text className='day-name'>{weekDays[dayOffset]}</Text>
                <Text className='day-number'>{dayDate.getDate()}</Text>
              </View>

              {hasHighPriority && <View className='priority-dot'></View>}

              <View className='day-tasks'>
                {dayTasks.length === 0 ? (
                  <Text className='no-tasks'>-</Text>
                ) : (
                  dayTasks.map(task => (
                    <View 
                      key={task.id} 
                      className='task-preview'
                      onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    >
                      <Text className={`task-dot ${task.completed ? 'completed' : ''}`}>·</Text>
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