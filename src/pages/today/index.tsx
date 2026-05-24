import { View, Text, Input, Picker } from '@tarojs/components';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import type { Task, List, ViewMode, TaskFilter, TaskStatusFilter } from '../../types';
import { formatDate, addDays, addWeeks, addMonths, isToday, startOfWeek, startOfMonth } from '../../utils/dateTools';
import { listTasks, listLists, createTask, toggleTask } from '../../services/tasks';
import { isLoggedIn } from '../../services/auth';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import ListView from './components/ListView';
import './index.scss';

type PriorityFilter = 'all' | 1 | 2 | 3;
type ListFilterValue = 'all' | string | null;
type DateRangePreset = 'current-view' | 'custom' | 'none';

const STATUS_OPTIONS: Array<{ label: string; value: TaskStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: PriorityFilter }> = [
  { label: 'All priorities', value: 'all' },
  { label: 'P1', value: 1 },
  { label: 'P2', value: 2 },
  { label: 'P3', value: 3 },
];

const DATE_PRESET_OPTIONS: Array<{ label: string; value: DateRangePreset }> = [
  { label: 'Current view', value: 'current-view' },
  { label: 'Custom range', value: 'custom' },
  { label: 'No date limit', value: 'none' },
];

function getDateRangeForView(viewMode: ViewMode, selectedDate: Date) {
  if (viewMode === 'day') {
    return {
      dateStart: formatDate(selectedDate),
      dateEnd: formatDate(addDays(selectedDate, 1)),
      includeUndated: isToday(selectedDate),
    };
  }

  if (viewMode === 'week') {
    const weekStart = startOfWeek(selectedDate);
    return {
      dateStart: formatDate(weekStart),
      dateEnd: formatDate(addDays(weekStart, 7)),
      includeUndated: false,
    };
  }

  if (viewMode === 'month') {
    const monthStart = startOfMonth(selectedDate);
    const nextMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    return {
      dateStart: formatDate(monthStart),
      dateEnd: formatDate(nextMonthStart),
      includeUndated: false,
    };
  }

  return {
    includeUndated: false,
  };
}

export default function TodayPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<TaskStatusFilter>('all');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [listId, setListId] = useState<ListFilterValue>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('current-view');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const isUnmountedRef = useRef(false);
  const showQuickAdd = viewMode === 'day' || viewMode === 'list';

  const buildTaskFilter = (): TaskFilter => {
    const filter: TaskFilter = {
      keyword: keyword.trim() || undefined,
      status,
      priority: priority === 'all' ? undefined : priority,
      listId: typeof listId === 'string' && listId !== 'all' ? listId : undefined,
    };

    if (dateRangePreset === 'current-view') {
      const viewDateFilter = getDateRangeForView(viewMode, selectedDate);
      return {
        ...filter,
        ...viewDateFilter,
      };
    }

    if (dateRangePreset === 'custom' && customDateStart && customDateEnd) {
      return {
        ...filter,
        dateStart: customDateStart,
        dateEnd: formatDate(addDays(new Date(customDateEnd), 1)),
        includeUndated: false,
      };
    }

    return filter;
  };

  const loadTasksForCurrentFilters = async () => {
    setIsLoading(true);
    try {
      const loadedTasks = await listTasks(buildTaskFilter());
      if (!isUnmountedRef.current) {
        setTasks(loadedTasks);
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        console.error('Failed to load tasks:', error);
        Taro.showToast({ title: 'Failed to load tasks', icon: 'none' });
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: '/pages/auth/index' });
      return;
    }

    listLists()
      .then((loadedLists) => {
        if (!isUnmountedRef.current) {
          setLists(loadedLists);
        }
      })
      .catch(error => console.error('Failed to load lists:', error));

    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    void loadTasksForCurrentFilters();
  }, [viewMode, selectedDate, keyword, status, priority, listId, dateRangePreset, customDateStart, customDateEnd]);

  useEffect(() => {
    const unsubscribe = Taro.eventCenter.on('tasksRefresh', () => {
      void loadTasksForCurrentFilters();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [viewMode, selectedDate, keyword, status, priority, listId, dateRangePreset, customDateStart, customDateEnd]);

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
      url: `/pages/task-edit/index?id=${task.id}&mode=${viewMode}&date=${formatDate(selectedDate)}`,
    });
  };

  const handleTaskToggle = async (task: Task) => {
    try {
      await toggleTask(task.id, !task.completed);
      await loadTasksForCurrentFilters();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      Taro.showToast({ title: 'Failed to update task', icon: 'none' });
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) return;

    try {
      const quickAddDate = viewMode === 'day'
        ? formatDate(selectedDate)
        : formatDate(new Date());

      await createTask({
        title: quickAddValue.trim(),
        dueAt: quickAddDate,
        dueTime: '23:59',
        listId: typeof listId === 'string' && listId !== 'all' ? listId : undefined,
      });

      setQuickAddValue('');
      Taro.showToast({ title: 'Task created', icon: 'success' });
      await loadTasksForCurrentFilters();
    } catch (error) {
      console.error('Failed to create task:', error);
      Taro.showToast({ title: 'Failed to create task', icon: 'none' });
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatus('all');
    setPriority('all');
    setListId('all');
    setDateRangePreset('current-view');
    setCustomDateStart('');
    setCustomDateEnd('');
  };

  const activeFilterLabels = [
    keyword.trim() ? `Search: ${keyword.trim()}` : '',
    status !== 'all' ? `Status: ${status}` : '',
    priority !== 'all' ? `Priority: P${priority}` : '',
    typeof listId === 'string' && listId !== 'all'
      ? `List: ${lists.find(list => list.id === listId)?.name || 'Custom'}`
      : '',
    dateRangePreset === 'custom' && customDateStart && customDateEnd
      ? `Date: ${customDateStart} to ${customDateEnd}`
      : '',
    dateRangePreset === 'none' ? 'Date: none' : '',
  ].filter(Boolean);

  return (
    <View className='today-page'>
      <View className='header'>
        <View className='view-switcher'>
          <View className={`view-tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>
            <Text>Day</Text>
          </View>
          <View className={`view-tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>
            <Text>Week</Text>
          </View>
          <View className={`view-tab ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>
            <Text>Month</Text>
          </View>
          <View className={`view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Text>List</Text>
          </View>
        </View>

        <View className='search-row'>
          <Input
            className='search-input'
            placeholder='Search title or notes'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
          <Text className='filter-toggle' onClick={() => setShowFilters(value => !value)}>
            {showFilters ? 'Hide' : 'Filter'}
          </Text>
        </View>

        {showFilters ? (
          <View className='filter-panel'>
            <View className='filter-group'>
              <Text className='filter-label'>Status</Text>
              <View className='chip-row'>
                {STATUS_OPTIONS.map(option => (
                  <Text
                    key={option.value}
                    className={`chip ${status === option.value ? 'active' : ''}`}
                    onClick={() => setStatus(option.value)}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </View>

            <View className='filter-group'>
              <Text className='filter-label'>Priority</Text>
              <View className='chip-row'>
                {PRIORITY_OPTIONS.map(option => (
                  <Text
                    key={String(option.value)}
                    className={`chip ${priority === option.value ? 'active' : ''}`}
                    onClick={() => setPriority(option.value)}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </View>

            <View className='filter-group'>
              <Text className='filter-label'>List</Text>
              <View className='chip-row'>
                <Text
                  className={`chip ${listId === 'all' ? 'active' : ''}`}
                  onClick={() => setListId('all')}
                >
                  All lists
                </Text>
                {lists.map(list => (
                  <Text
                    key={list.id}
                    className={`chip ${listId === list.id ? 'active' : ''}`}
                    onClick={() => setListId(list.id)}
                  >
                    {list.name}
                  </Text>
                ))}
              </View>
            </View>

            <View className='filter-group'>
              <Text className='filter-label'>Date range</Text>
              <View className='chip-row'>
                {DATE_PRESET_OPTIONS.map(option => (
                  <Text
                    key={option.value}
                    className={`chip ${dateRangePreset === option.value ? 'active' : ''}`}
                    onClick={() => setDateRangePreset(option.value)}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </View>

            {dateRangePreset === 'custom' ? (
              <View className='custom-date-row'>
                <Picker mode='date' value={customDateStart} onChange={(e) => setCustomDateStart(e.detail.value)}>
                  <View className='date-picker'>
                    <Text>{customDateStart || 'Start date'}</Text>
                  </View>
                </Picker>
                <Picker mode='date' value={customDateEnd} onChange={(e) => setCustomDateEnd(e.detail.value)}>
                  <View className='date-picker'>
                    <Text>{customDateEnd || 'End date'}</Text>
                  </View>
                </Picker>
              </View>
            ) : null}

            <View className='filter-actions'>
              <Text className='secondary-action' onClick={handleResetFilters}>Reset</Text>
              <Text className='secondary-action' onClick={() => setShowFilters(false)}>Done</Text>
            </View>
          </View>
        ) : null}

        {activeFilterLabels.length > 0 ? (
          <View className='active-filters'>
            {activeFilterLabels.map(label => (
              <Text key={label} className='active-filter-tag'>{label}</Text>
            ))}
          </View>
        ) : null}

        <View className='nav-controls'>
          <Text className='today-btn' onClick={handleGoToToday}>Today</Text>
          {isLoading ? <Text className='loading-text'>Loading...</Text> : <Text className='loading-text'>{tasks.length} tasks</Text>}
          <View className='nav-arrows'>
            <Text className='nav-arrow left' onClick={handlePrev}>&lt;</Text>
            <Text className='nav-arrow right' onClick={handleNext}>&gt;</Text>
          </View>
        </View>
      </View>

      <View className='content'>
        {viewMode === 'day' ? (
          <DayView
            selectedDate={selectedDate}
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}

        {viewMode === 'week' ? (
          <WeekView
            selectedDate={selectedDate}
            tasks={tasks}
            onDateClick={handleDateClick}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}

        {viewMode === 'month' ? (
          <MonthView
            selectedDate={selectedDate}
            tasks={tasks}
            onDateClick={handleDateClick}
          />
        ) : null}

        {viewMode === 'list' ? (
          <ListView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}
      </View>

      {showQuickAdd ? (
        <View className='quick-add'>
          <Input
            className='quick-add-input'
            placeholder='Quick add a task...'
            value={quickAddValue}
            onInput={(e) => setQuickAddValue(e.detail.value)}
            onConfirm={handleQuickAdd}
          />
          <Text className='quick-add-btn' onClick={handleQuickAdd}>Add</Text>
        </View>
      ) : null}

      <View
        className={`fab ${showQuickAdd ? 'with-quick-add' : ''}`}
        onClick={() => {
          Taro.navigateTo({
            url: `/pages/task-edit/index?mode=${viewMode}&date=${formatDate(selectedDate)}`,
          });
        }}
      >
        <Text className='fab-icon'>+</Text>
      </View>
    </View>
  );
}
