import { View, Text, Input, Image } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import type { Task, List } from '../../types';
import type { ViewMode } from '../../types';
import { formatDate, addDays, addWeeks, addMonths, isToday, isSameDay } from '../../utils/dateTools';
import { listTasks, createTask, toggleTask } from '../../services/tasks';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import ListView from './components/ListView';
import './index.scss';

interface TodayPageProps { }

export default function TodayPage({ }: TodayPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const showQuickAdd = viewMode === 'day' || viewMode === 'list';

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      let filter: any = { status: 'active' };

      if (viewMode === 'day') {
        filter.dateStart = formatDate(selectedDate);
        filter.dateEnd = formatDate(addDays(selectedDate, 1));
        if (isToday(selectedDate)) {
          filter.includeUndated = true;
        }
      } else if (viewMode === 'week') {
        const weekStart = addDays(selectedDate, -((selectedDate.getDay() + 6) % 7));
        filter.dateStart = formatDate(weekStart);
        filter.dateEnd = formatDate(addDays(weekStart, 7));
      } else if (viewMode === 'month') {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        filter.dateStart = formatDate(monthStart);
        filter.dateEnd = formatDate(addDays(monthEnd, 1));
      } else if (viewMode === 'list') {
        if (selectedListId) {
          filter.listId = selectedListId;
        }
      }

      const loadedTasks = await listTasks(filter);
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToToday = () => {
    setSelectedDate(new Date());
    setViewMode('day');
  };

  const handlePrev = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, -1));
    } else if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, -1));
    } else if (viewMode === 'month') {
      setSelectedDate(addMonths(selectedDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else if (viewMode === 'month') {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const handleTaskClick = (task: Task) => {
    Taro.navigateTo({
      url: `/pages/task-edit/index?id=${task.id}&mode=${viewMode}&date=${formatDate(selectedDate)}`
    });
  };

  const handleTaskToggle = async (task: Task) => {
    try {
      await toggleTask(task.id, !task.completed);
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) return;

    try {
      const newTask = await createTask({
        title: quickAddValue,
        dueAt: viewMode === 'day' ? formatDate(selectedDate) :
          viewMode === 'week' || viewMode === 'month' ? formatDate(selectedDate) : null,
      });
      setTasks([...tasks, newTask]);
      setQuickAddValue('');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const filteredTasks = viewMode === 'list' && selectedListId
    ? tasks.filter(t => t.listId === selectedListId)
    : tasks;

  return (
    <View className='today-page'>
      <View className='header'>
        <View className='view-switcher'>
          <View
            className={`view-tab ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <Text>日</Text>
          </View>
          <View
            className={`view-tab ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <Text>周</Text>
          </View>
          <View
            className={`view-tab ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <Text>月</Text>
          </View>
          <View
            className={`view-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <Text>清单</Text>
          </View>
        </View>

        <View className='nav-controls'>
          <Text className='today-btn' onClick={handleGoToToday}>今天</Text>
          <View className='nav-arrows'>
            <Text className='nav-arrow left' onClick={handlePrev}>‹</Text>
            <Text className='nav-arrow right' onClick={handleNext}>›</Text>
          </View>
        </View>
      </View>

      <View className='content'>
        {viewMode === 'day' && (
          <DayView
            selectedDate={selectedDate}
            tasks={tasks.filter(t => {
              if (isToday(selectedDate) && !t.dueAt) return true;
              return t.dueAt === formatDate(selectedDate);
            })}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            selectedDate={selectedDate}
            tasks={tasks}
            onDateClick={handleDateClick}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        )}

        {viewMode === 'month' && (
          <MonthView
            selectedDate={selectedDate}
            tasks={tasks}
            onDateClick={handleDateClick}
          />
        )}

        {viewMode === 'list' && (
          <ListView
            tasks={filteredTasks}
            lists={lists}
            selectedListId={selectedListId}
            onListSelect={setSelectedListId}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        )}
      </View>

      {showQuickAdd && (
        <View className='quick-add'>
          <Input
            className='quick-add-input'
            placeholder='快速添加任务...'
            value={quickAddValue}
            onInput={(e) => setQuickAddValue(e.detail.value)}
            onConfirm={handleQuickAdd}
          />
          <Text className='quick-add-btn' onClick={handleQuickAdd}>添加</Text>
        </View>
      )}

      <View className={`fab ${showQuickAdd ? 'with-quick-add' : ''}`} onClick={() => {
        Taro.navigateTo({
          url: `/pages/task-edit/index?mode=${viewMode}&date=${formatDate(selectedDate)}`
        });
      }}>
        <Text className='fab-icon'>+</Text>
      </View>
    </View>
  );
}