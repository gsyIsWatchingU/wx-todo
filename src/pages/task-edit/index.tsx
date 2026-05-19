import { View, Text, Input, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { formatDate, parseDate } from '../../utils/dateTools';
import { createTask, updateTask, getCurrentUser } from '../../services/tasks';
import type { Task } from '../../types';
import './index.scss';

interface TaskEditPageProps {}

export default function TaskEditPage({}: TaskEditPageProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [listId, setListId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isUnmounted, setIsUnmounted] = useState(false);

  useEffect(() => {
    const { id, mode, date } = Taro.getCurrentInstance().router?.params || {};
    
    if (id) {
      setIsEditMode(true);
      setTaskId(id);
      loadTask(id);
    } else if (date) {
      setHasDueDate(true);
      setDueDate(date);
    }

    return () => {
      setIsUnmounted(true);
    };
  }, []);

  const loadTask = async (id: string) => {
    try {
      const { listTasks } = await import('../../services/tasks');
      const tasks = await listTasks();
      const task = tasks.find(t => t.id === id);
      if (task) {
        setTitle(task.title);
        setContent(task.content);
        setPriority(task.priority);
        setListId(task.listId);
        if (task.dueAt) {
          setHasDueDate(true);
          setDueDate(task.dueAt);
          setDueTime(task.dueTime || '12:00');
        }
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode && taskId) {
        await updateTask(taskId, {
          title,
          content,
          priority,
          listId,
          dueAt: hasDueDate ? dueDate : null,
          dueTime: hasDueDate ? dueTime : null,
        });
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await createTask({
          title,
          content,
          priority,
          listId: listId || undefined,
          dueAt: hasDueDate ? dueDate : null,
          dueTime: hasDueDate ? dueTime : null,
        });
        Taro.showToast({ title: '创建成功', icon: 'success' });
      }
      Taro.eventCenter.trigger('tasksRefresh');
      setTimeout(() => {
        Taro.navigateBack();
      }, 500);
    } catch (error) {
      console.error('Failed to save task:', error);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !taskId) return;

    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const { deleteTask } = await import('../../services/tasks');
            await deleteTask(taskId);
            Taro.eventCenter.trigger('tasksRefresh');
            Taro.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => {
              Taro.navigateBack();
            }, 500);
          } catch (error) {
            console.error('Failed to delete task:', error);
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  };

  const onDateChange = (e: any) => {
    setDueDate(e.detail.value);
  };

  const onTimeChange = (e: any) => {
    setDueTime(e.detail.value);
  };

  return (
    <View className='task-edit-page'>
      <View className='header'>
        <Text className='cancel-btn' onClick={() => Taro.navigateBack()}>取消</Text>
        <Text className='title'>{isEditMode ? '编辑任务' : '新建任务'}</Text>
        <Text 
          className={`save-btn ${isLoading ? 'loading' : ''}`}
          onClick={isLoading ? undefined : handleSave}
        >
          {isLoading ? '保存中...' : '保存'}
        </Text>
      </View>

      <View className='form'>
        <View className='form-section'>
          <Input
            className='title-input'
            placeholder='任务标题'
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        <View className='form-section'>
          <Text className='section-label'>内容</Text>
          <Input
            className='content-input'
            type='textarea'
            placeholder='添加备注...'
            value={content}
            onInput={(e) => setContent(e.detail.value)}
          />
        </View>

        <View className='form-section'>
          <Text className='section-label'>优先级</Text>
          <View className='priority-options'>
            <View 
              className={`priority-option ${priority === 1 ? 'active' : ''}`}
              onClick={() => setPriority(1)}
            >
              <Text>低</Text>
            </View>
            <View 
              className={`priority-option ${priority === 2 ? 'active' : ''}`}
              onClick={() => setPriority(2)}
            >
              <Text>中</Text>
            </View>
            <View 
              className={`priority-option high ${priority === 3 ? 'active' : ''}`}
              onClick={() => setPriority(3)}
            >
              <Text>高</Text>
            </View>
          </View>
        </View>

        <View className='form-section'>
          <View className='row'>
            <Text className='section-label'>截止日期</Text>
            <View 
              className={`toggle ${hasDueDate ? 'active' : ''}`}
              onClick={() => setHasDueDate(!hasDueDate)}
            >
              <View className='toggle-dot'></View>
            </View>
          </View>

          {hasDueDate && (
            <View className='date-time-pickers'>
              <Picker mode='date' value={dueDate} onChange={onDateChange}>
                <View className='picker'>
                  <Text>{dueDate || '选择日期'}</Text>
                </View>
              </Picker>
              <Picker mode='time' value={dueTime} onChange={onTimeChange}>
                <View className='picker'>
                  <Text>{dueTime || '选择时间'}</Text>
                </View>
              </Picker>
            </View>
          )}
        </View>
      </View>

      {isEditMode && (
        <View className='delete-section'>
          <Text className='delete-btn' onClick={handleDelete}>删除任务</Text>
        </View>
      )}
    </View>
  );
}
