import { View, Text, ScrollView } from '@tarojs/components';
import type { Task } from '../../../types';
import TaskItem from '../../../components/TaskItem';
import './ListView.scss';

interface ListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskToggle: (task: Task) => void;
}

export default function ListView({ tasks, onTaskClick, onTaskToggle }: ListViewProps) {
  return (
    <ScrollView className='list-view' scrollY>
      <View className='task-list'>
        {tasks.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-text'>No tasks match these filters.</Text>
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
