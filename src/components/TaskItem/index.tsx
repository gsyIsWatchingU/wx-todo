import { View, Text } from '@tarojs/components';
import type { Task } from '../../types';
import './index.scss';

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onToggle: () => void;
}

export default function TaskItem({ task, onClick, onToggle }: TaskItemProps) {
  return (
    <View className={`task-item ${task.completed ? 'completed' : ''}`} onClick={onClick}>
      <View className='checkbox-wrapper' onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        <View className={`checkbox ${task.completed ? 'checked' : ''}`}>
          {task.completed && <Text className='check-mark'>✓</Text>}
        </View>
      </View>
      <View className='task-content'>
        <Text className={`task-title ${task.completed ? 'done' : ''}`}>{task.title}</Text>
        {task.dueTime && (
          <Text className='task-time'>{task.dueTime}</Text>
        )}
      </View>
      {task.priority === 3 && <View className='priority-flag'></View>}
    </View>
  );
}