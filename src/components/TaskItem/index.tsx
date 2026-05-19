import { View, Text } from '@tarojs/components';
import type { Task } from '../../types';
import './index.scss';

import { formatDisplayDate } from '../../utils/dateTools';

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onToggle: () => void;
  showDate?: boolean;
}

export default function TaskItem({ task, onClick, onToggle, showDate = false }: TaskItemProps) {
  return (
    <View className={`task-item ${task.completed ? 'completed' : ''}`} onClick={onClick}>
      <View className='checkbox-wrapper' onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        <View className={`checkbox ${task.completed ? 'checked' : ''}`}>
          {task.completed && <Text className='check-mark'>✓</Text>}
        </View>
      </View>
      <View className='task-content'>
        <Text className={`task-title ${task.completed ? 'done' : ''}`}>{task.title}</Text>
        <View className='task-meta'>
          {showDate && task.dueAt && (
            <Text className='task-date'>{formatDisplayDate(task.dueAt)}</Text>
          )}
          {task.dueTime && (
            <Text className='task-time'>{task.dueTime}</Text>
          )}
        </View>
      </View>
      {task.priority === 3 && <View className='priority-flag'></View>}
    </View>
  );
}