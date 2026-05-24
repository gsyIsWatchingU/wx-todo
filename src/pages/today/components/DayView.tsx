import { View, Text, ScrollView } from '@tarojs/components';
import type { Task } from '../../../types';
import { formatDate, formatDisplayDate, isToday } from '../../../utils/dateTools';
import TaskItem from '../../../components/TaskItem';
import './DayView.scss';

interface DayViewProps {
  selectedDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskToggle: (task: Task) => void;
}

export default function DayView({ selectedDate, tasks, onTaskClick, onTaskToggle }: DayViewProps) {
  const selectedDateText = formatDate(selectedDate);
  const undatedTasks = isToday(selectedDate) ? tasks.filter(task => !task.dueAt) : [];
  const datedTasks = tasks.filter(task => task.dueAt === selectedDateText);
  const sortedDatedTasks = [...datedTasks].sort((a, b) =>
    (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99')
  );

  return (
    <ScrollView className='day-view' scrollY>
      <View className='day-header'>
        <Text className='day-date'>{formatDisplayDate(selectedDate)}</Text>
        {isToday(selectedDate) ? <Text className='today-tag'>Today</Text> : null}
      </View>

      {undatedTasks.length > 0 ? (
        <View className='task-section'>
          <Text className='section-title'>No due date</Text>
          {undatedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onToggle={() => onTaskToggle(task)}
            />
          ))}
        </View>
      ) : null}

      {sortedDatedTasks.length > 0 ? (
        <View className='task-section'>
          <Text className='section-title'>Scheduled</Text>
          {sortedDatedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onToggle={() => onTaskToggle(task)}
            />
          ))}
        </View>
      ) : null}

      {undatedTasks.length === 0 && sortedDatedTasks.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-text'>No tasks match these filters.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
