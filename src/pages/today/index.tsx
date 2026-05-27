import { View, Text, Input, Picker } from '@tarojs/components';
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import type { Task, ViewMode, TaskFilter, TaskStatusFilter } from '../../types';
import { formatDate, addDays, addWeeks, addMonths, isToday, startOfWeek, startOfMonth } from '../../utils/dateTools';
import { listTasks, createTask, toggleTask } from '../../services/tasks';
import { isLoggedIn } from '../../services/auth';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import ListView from './components/ListView';
import './index.scss';

type PriorityFilter = 'all' | 1 | 2 | 3;
type DateRangePreset = 'current-view' | 'custom' | 'none';

const STATUS_OPTIONS: Array<{ label: string; value: TaskStatusFilter }> = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: 'active' },
  { label: '已完成', value: 'completed' },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: PriorityFilter }> = [
  { label: '全部优先级', value: 'all' },
  { label: 'P1', value: 1 },
  { label: 'P2', value: 2 },
  { label: 'P3', value: 3 },
];

const DATE_PRESET_OPTIONS: Array<{ label: string; value: DateRangePreset }> = [
  { label: '当前视图', value: 'current-view' },
  { label: '自定义范围', value: 'custom' },
  { label: '不限日期', value: 'none' },
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
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<TaskStatusFilter>('all');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('current-view');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isUnmountedRef = useRef(false);

  const showQuickAdd = viewMode === 'day' || viewMode === 'list';
  const trimmedKeyword = keyword.trim();
  const hasNonDateFilters = status !== 'all' || priority !== 'all';
  const hasSearchCriteria = Boolean(trimmedKeyword) || hasNonDateFilters;
  const showFilteredResultsAsList = viewMode !== 'list' && hasSearchCriteria;

  const statusRange = STATUS_OPTIONS.map(option => option.label);
  const priorityRange = PRIORITY_OPTIONS.map(option => option.label);
  const datePresetRange = DATE_PRESET_OPTIONS.map(option => option.label);

  const selectedStatusIndex = Math.max(STATUS_OPTIONS.findIndex(option => option.value === status), 0);
  const selectedPriorityIndex = Math.max(PRIORITY_OPTIONS.findIndex(option => option.value === priority), 0);
  const selectedDatePresetIndex = Math.max(DATE_PRESET_OPTIONS.findIndex(option => option.value === dateRangePreset), 0);

  const selectedStatusLabel = STATUS_OPTIONS[selectedStatusIndex]?.label || STATUS_OPTIONS[0].label;
  const selectedPriorityLabel = PRIORITY_OPTIONS[selectedPriorityIndex]?.label || PRIORITY_OPTIONS[0].label;
  const selectedDatePresetLabel = DATE_PRESET_OPTIONS[selectedDatePresetIndex]?.label || DATE_PRESET_OPTIONS[0].label;

  const buildTaskFilter = (): TaskFilter => {
    const filter: TaskFilter = {
      keyword: trimmedKeyword || undefined,
      status,
      priority: priority === 'all' ? undefined : priority,
    };

    if (dateRangePreset === 'current-view' && !hasSearchCriteria) {
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
        Taro.showToast({ title: '加载任务失败', icon: 'none' });
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

    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    void loadTasksForCurrentFilters();
  }, [viewMode, selectedDate, keyword, status, priority, dateRangePreset, customDateStart, customDateEnd]);

  useEffect(() => {
    const unsubscribe = Taro.eventCenter.on('tasksRefresh', () => {
      void loadTasksForCurrentFilters();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [viewMode, selectedDate, keyword, status, priority, dateRangePreset, customDateStart, customDateEnd]);

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
      Taro.showToast({ title: '更新任务失败', icon: 'none' });
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
      });

      setQuickAddValue('');
      Taro.showToast({ title: '任务创建成功', icon: 'success' });
      await loadTasksForCurrentFilters();
    } catch (error) {
      console.error('Failed to create task:', error);
      Taro.showToast({ title: '创建任务失败', icon: 'none' });
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatus('all');
    setPriority('all');
    setDateRangePreset('current-view');
    setCustomDateStart('');
    setCustomDateEnd('');
  };

  const activeFilterLabels = [
    trimmedKeyword ? `搜索: ${trimmedKeyword}` : '',
    status !== 'all' ? `状态: ${selectedStatusLabel}` : '',
    priority !== 'all' ? `优先级: P${priority}` : '',
    dateRangePreset === 'custom' && customDateStart && customDateEnd
      ? `日期: ${customDateStart} 至 ${customDateEnd}`
      : '',
    dateRangePreset === 'none' ? '日期: 不限' : '',
  ].filter(Boolean);

  return (
    <View className='today-page'>
      <View className='header'>
        <View className='view-switcher'>
          <View className={`view-tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>
            <Text>日</Text>
          </View>
          <View className={`view-tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>
            <Text>周</Text>
          </View>
          <View className={`view-tab ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>
            <Text>月</Text>
          </View>
          <View className={`view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Text>列表</Text>
          </View>
        </View>

        <View className='search-row'>
          <Input
            className='search-input'
            placeholder='搜索任务标题或内容'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>

        <View className='filter-panel'>
          <View className='filter-bar'>
            <Picker
              mode='selector'
              range={statusRange}
              value={selectedStatusIndex}
              onChange={(e) => setStatus(STATUS_OPTIONS[Number(e.detail.value)]?.value ?? 'all')}
            >
              <View className='filter-select'>
                <Text className='filter-select-label'>状态</Text>
                <Text className='filter-select-value'>{selectedStatusLabel}</Text>
              </View>
            </Picker>

            <Picker
              mode='selector'
              range={priorityRange}
              value={selectedPriorityIndex}
              onChange={(e) => setPriority(PRIORITY_OPTIONS[Number(e.detail.value)]?.value ?? 'all')}
            >
              <View className='filter-select'>
                <Text className='filter-select-label'>优先级</Text>
                <Text className='filter-select-value'>{selectedPriorityLabel}</Text>
              </View>
            </Picker>

            <Picker
              mode='selector'
              range={datePresetRange}
              value={selectedDatePresetIndex}
              onChange={(e) => setDateRangePreset(DATE_PRESET_OPTIONS[Number(e.detail.value)]?.value ?? 'current-view')}
            >
              <View className='filter-select'>
                <Text className='filter-select-label'>日期</Text>
                <Text className='filter-select-value'>{selectedDatePresetLabel}</Text>
              </View>
            </Picker>
          </View>

          {dateRangePreset === 'custom' ? (
            <View className='custom-date-row'>
              <Picker mode='date' value={customDateStart} onChange={(e) => setCustomDateStart(e.detail.value)}>
                <View className='date-picker'>
                  <Text>{customDateStart || '开始日期'}</Text>
                </View>
              </Picker>
              <Picker mode='date' value={customDateEnd} onChange={(e) => setCustomDateEnd(e.detail.value)}>
                <View className='date-picker'>
                  <Text>{customDateEnd || '结束日期'}</Text>
                </View>
              </Picker>
            </View>
          ) : null}

          <View className='filter-actions'>
            <Text className='secondary-action' onClick={handleResetFilters}>重置筛选</Text>
          </View>
        </View>

        {activeFilterLabels.length > 0 ? (
          <View className='active-filters'>
            {activeFilterLabels.map(label => (
              <Text key={label} className='active-filter-tag'>{label}</Text>
            ))}
          </View>
        ) : null}

        <View className='nav-controls'>
          <Text className='today-btn' onClick={handleGoToToday}>今天</Text>
          {isLoading ? <Text className='loading-text'>加载中...</Text> : <Text className='loading-text'>{tasks.length} 个任务</Text>}
          <View className='nav-arrows'>
            <Text className='nav-arrow left' onClick={handlePrev}>&lt;</Text>
            <Text className='nav-arrow right' onClick={handleNext}>&gt;</Text>
          </View>
        </View>
      </View>

      <View className='content'>
        {showFilteredResultsAsList ? (
          <ListView
            tasks={tasks}
            isLoading={isLoading}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}

        {!showFilteredResultsAsList && viewMode === 'day' ? (
          <DayView
            selectedDate={selectedDate}
            tasks={tasks}
            isLoading={isLoading}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}

        {!showFilteredResultsAsList && viewMode === 'week' ? (
          <WeekView
            selectedDate={selectedDate}
            tasks={tasks}
            onDateClick={handleDateClick}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}

        {!showFilteredResultsAsList && viewMode === 'month' ? (
          <MonthView
            selectedDate={selectedDate}
            tasks={tasks}
            onDateClick={handleDateClick}
          />
        ) : null}

        {!showFilteredResultsAsList && viewMode === 'list' ? (
          <ListView
            tasks={tasks}
            isLoading={isLoading}
            onTaskClick={handleTaskClick}
            onTaskToggle={handleTaskToggle}
          />
        ) : null}
      </View>

      {showQuickAdd ? (
        <View className='quick-add'>
          <Input
            className='quick-add-input'
            placeholder='快速添加一个任务...'
            value={quickAddValue}
            onInput={(e) => setQuickAddValue(e.detail.value)}
            onConfirm={handleQuickAdd}
          />
          <Text className='quick-add-btn' onClick={handleQuickAdd}>添加</Text>
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
