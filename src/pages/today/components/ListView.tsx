import { View, Text, ScrollView } from '@tarojs/components';
import type { Task } from '../../../types';
import TaskItem from '../../../components/TaskItem';
import './ListView.scss';

interface ListViewProps {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick: (task: Task) => void;
  onTaskToggle: (task: Task) => void;
}

export default function ListView({ tasks, isLoading, onTaskClick, onTaskToggle }: ListViewProps) {
  return (
    <ScrollView className='list-view' scrollY>
      <View className='task-list'>
        {isLoading ? (
          <View className='empty-state'>
            <Text className='empty-text'>加载中...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-text'>没有匹配的任务。</Text>
          </View>
        ) : (
          tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onToggle={() => onTaskToggle(task)}
              showDate
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
