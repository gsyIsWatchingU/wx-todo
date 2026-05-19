import { View, Text, ScrollView } from '@tarojs/components';
import type { Task, List } from '../../../types';
import TaskItem from '../../../components/TaskItem';
import './ListView.scss';

interface ListViewProps {
  tasks: Task[];
  lists: List[];
  selectedListId: string | null;
  onListSelect: (listId: string | null) => void;
  onTaskClick: (task: Task) => void;
  onTaskToggle: (task: Task) => void;
}

export default function ListView({ tasks, lists, selectedListId, onListSelect, onTaskClick, onTaskToggle }: ListViewProps) {
  return (
    <ScrollView className='list-view' scrollY>
      <View className='list-filter'>
        <View 
          className={`filter-item ${selectedListId === null ? 'active' : ''}`}
          onClick={() => onListSelect(null)}
        >
          <Text>全部</Text>
        </View>
        {lists.map(list => (
          <View 
            key={list.id}
            className={`filter-item ${selectedListId === list.id ? 'active' : ''}`}
            onClick={() => onListSelect(list.id)}
          >
            <View className='list-dot' style={{ background: list.color }}></View>
            <Text>{list.name}</Text>
          </View>
        ))}
      </View>

      <View className='task-list'>
        {tasks.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-text'>暂无任务</Text>
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