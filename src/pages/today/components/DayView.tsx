import { View, Text, ScrollView } from '@tarojs/components';
import type { Task } from '../../../types';
import { formatDisplayDate, isToday } from '../../../utils/dateTools';
import TaskItem from '../../../components/TaskItem';
import './DayView.scss';

interface DayViewProps {
  selectedDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskToggle: (task: Task) => void;
}

export default function DayView({ selectedDate, tasks, onTaskClick, onTaskToggle }: DayViewProps) {
  const undatedTasks = isToday(selectedDate) ? tasks.filter(t => !t.dueAt) : [];
  const allDayTasks = tasks.filter(t => t.dueAt && t.dueTime === '00:00');
  const timedTasks = tasks.filter(t => t.dueAt && t.dueTime && t.dueTime !== '00:00');

  const sortedTimedTasks = [...timedTasks].sort((a, b) => 
    (a.dueTime || '').localeCompare(b.dueTime || '')
  );

  return (
    <ScrollView className='day-view' scrollY>
      <View className='day-header'>
        <Text className='day-date'>{formatDisplayDate(selectedDate)}</Text>
        {isToday(selectedDate) && <Text className='today-tag'>今天</Text>}
      </View>

      {undatedTasks.length > 0 && (
        <View className='task-section'>
          <Text className='section-title'>未安排</Text>
          {undatedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onToggle={() => onTaskToggle(task)}
            />
          ))}
        </View>
      )}

      {allDayTasks.length > 0 && (
        <View className='task-section'>
          <Text className='section-title'>全天</Text>
          {allDayTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onToggle={() => onTaskToggle(task)}
            />
          ))}
        </View>
      )}

      {sortedTimedTasks.length > 0 && (
        <View className='task-section'>
          <Text className='section-title'>定时任务</Text>
          {sortedTimedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onToggle={() => onTaskToggle(task)}
            />
          ))}
        </View>
      )}

      {undatedTasks.length === 0 && allDayTasks.length === 0 && sortedTimedTasks.length === 0 && (
        <View className='empty-state'>
          <Text className='empty-text'>暂无任务</Text>
        </View>
      )}
    </ScrollView>
  );
}