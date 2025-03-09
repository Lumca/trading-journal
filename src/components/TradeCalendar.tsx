// src/components/TradeCalendar.tsx
// Place this file in your src/components directory
import { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Group, 
  Badge, 
  Grid, 
  Box, 
  Button, 
  Select,
  ActionIcon,
  Tooltip,
  Popover,
  Card,
  Divider,
  Center,
  Loader
} from '@mantine/core';
import { 
  IconChevronLeft, 
  IconChevronRight, 
  IconEdit,
  IconCalendarEvent 
} from '@tabler/icons-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';

interface CalendarProps {
  onEditTrade: (trade: Trade) => void;
}

export function TradeCalendar({ onEditTrade }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const { getTrades } = useSupabase();
  
  // Fetch trades on component mount
  useEffect(() => {
    fetchTrades();
  }, []);
  
  const fetchTrades = async () => {
    setLoading(true);
    try {
      const tradesData = await getTrades();
      setTrades(tradesData);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate month/year display
  const monthYear = currentDate.toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };
  
  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get day of week for first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Check if a trade occurred on a specific date
  const getTradesForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    return trades.filter(trade => {
      const entryDate = new Date(trade.entry_date);
      return (
        entryDate.getFullYear() === year &&
        entryDate.getMonth() === month &&
        entryDate.getDate() === day
      );
    });
  };

  // Check if trades were closed on a specific date
  const getClosedTradesForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    return trades.filter(trade => {
      if (!trade.exit_date) return false;
      
      const exitDate = new Date(trade.exit_date);
      return (
        exitDate.getFullYear() === year &&
        exitDate.getMonth() === month &&
        exitDate.getDate() === day
      );
    });
  };

  // Calculate net P/L for a specific date
  const getNetProfitLossForDate = (date: Date) => {
    const closedTrades = getClosedTradesForDate(date);
    
    if (closedTrades.length === 0) return 0;
    
    return closedTrades.reduce((total, trade) => {
      return total + (trade.profit_loss || 0);
    }, 0);
  };

  // Render a day cell in the calendar
  const renderDayCell = (date: Date, isCurrentMonth: boolean = true) => {
    const dayTrades = getTradesForDate(date);
    const closedTrades = getClosedTradesForDate(date);
    const netProfitLoss = getNetProfitLossForDate(date);
    const isToday = new Date().toDateString() === date.toDateString();
    
    // Count trades by direction
    const longTrades = dayTrades.filter(t => t.direction === 'long').length;
    const shortTrades = dayTrades.filter(t => t.direction === 'short').length;
    
    return (
      <Box
        key={date.toString()}
        p="xs"
        style={{ 
          minHeight: '100px',
          backgroundColor: !isCurrentMonth ? '#f9f9f9' : undefined,
          opacity: !isCurrentMonth ? 0.5 : 1,
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          position: 'relative',
          ...(isToday ? { border: '2px solid #228be6' } : {})
        }}
      >
        <Text 
          fw={500} 
          size="sm" 
          style={{ 
            textAlign: 'right',
            color: isToday ? '#228be6' : undefined
          }}
        >
          {date.getDate()}
        </Text>
        
        {(dayTrades.length > 0 || closedTrades.length > 0) && (
          <Popover width={300} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Box mt={4}>
                {dayTrades.length > 0 && (
                  <Group spacing={4}>
                    {longTrades > 0 && (
                      <Badge color="green" size="xs">
                        {longTrades} Long
                      </Badge>
                    )}
                    
                    {shortTrades > 0 && (
                      <Badge color="red" size="xs">
                        {shortTrades} Short
                      </Badge>
                    )}
                  </Group>
                )}
                
                {closedTrades.length > 0 && (
                  <Text 
                    size="xs" 
                    fw={500} 
                    c={netProfitLoss >= 0 ? 'green' : 'red'}
                    mt={4}
                  >
                    {formatCurrency(netProfitLoss)}
                  </Text>
                )}
              </Box>
            </Popover.Target>
            
            <Popover.Dropdown>
              <Text fw={700} size="sm">
                {date.toLocaleDateString('default', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              
              {dayTrades.length > 0 && (
                <>
                  <Text size="sm" fw={500} mt="xs">
                    Trades Opened:
                  </Text>
                  
                  {dayTrades.map(trade => (
                    <Card key={`entry-${trade.id}`} p="xs" withBorder mt={4}>
                      <Group position="apart" mb={4}>
                        <Group spacing={4}>
                          <Text size="sm" fw={700}>
                            {trade.symbol}
                          </Text>
                          <Badge 
                            color={trade.direction === 'long' ? 'green' : 'red'}
                            size="xs"
                          >
                            {trade.direction.toUpperCase()}
                          </Badge>
                        </Group>
                        
                        <Tooltip label="Edit Trade">
                          <ActionIcon 
                            size="xs" 
                            color="blue" 
                            onClick={() => onEditTrade(trade)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      
                      <Text size="xs">
                        Entry: {formatCurrency(trade.entry_price)} x {trade.quantity}
                      </Text>
                    </Card>
                  ))}
                </>
              )}
              
              {closedTrades.length > 0 && (
                <>
                  <Text size="sm" fw={500} mt="xs">
                    Trades Closed:
                  </Text>
                  
                  {closedTrades.map(trade => (
                    <Card key={`exit-${trade.id}`} p="xs" withBorder mt={4}>
                      <Group position="apart" mb={4}>
                        <Group spacing={4}>
                          <Text size="sm" fw={700}>
                            {trade.symbol}
                          </Text>
                          <Badge 
                            color={trade.direction === 'long' ? 'green' : 'red'}
                            size="xs"
                          >
                            {trade.direction.toUpperCase()}
                          </Badge>
                        </Group>
                        
                        <Tooltip label="Edit Trade">
                          <ActionIcon 
                            size="xs" 
                            color="blue" 
                            onClick={() => onEditTrade(trade)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      
                      <Text size="xs">
                        Exit: {formatCurrency(trade.exit_price || 0)} x {trade.quantity}
                      </Text>
                      
                      <Text 
                        size="xs" 
                        fw={500} 
                        c={trade.profit_loss && trade.profit_loss >= 0 ? 'green' : 'red'}
                      >
                        P/L: {formatCurrency(trade.profit_loss || 0)} 
                        ({trade.profit_loss_percent?.toFixed(2)}%)
                      </Text>
                    </Card>
                  ))}
                  
                  <Divider my="xs" />
                  
                  <Group position="apart">
                    <Text size="sm" fw={500}>
                      Net P/L:
                    </Text>
                    <Text 
                      size="sm" 
                      fw={700} 
                      c={netProfitLoss >= 0 ? 'green' : 'red'}
                    >
                      {formatCurrency(netProfitLoss)}
                    </Text>
                  </Group>
                </>
              )}
            </Popover.Dropdown>
          </Popover>
        )}
      </Box>
    );
  };
  
  // Render calendar for month view
  const renderMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // Calculate days from previous month to display
    const daysPreviousMonth = firstDayOfMonth;
    const previousMonthDays = [];
    if (daysPreviousMonth > 0) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevMonthYear = month === 0 ? year - 1 : year;
      const prevMonthDaysCount = getDaysInMonth(prevMonthYear, prevMonth);
      
      for (let i = prevMonthDaysCount - daysPreviousMonth + 1; i <= prevMonthDaysCount; i++) {
        previousMonthDays.push(new Date(prevMonthYear, prevMonth, i));
      }
    }
    
    // Current month days
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push(new Date(year, month, i));
    }
    
    // Calculate days from next month to display
    const totalDaysDisplayed = previousMonthDays.length + currentMonthDays.length;
    const daysNextMonth = Math.ceil(totalDaysDisplayed / 7) * 7 - totalDaysDisplayed;
    const nextMonthDays = [];
    if (daysNextMonth > 0) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextMonthYear = month === 11 ? year + 1 : year;
      
      for (let i = 1; i <= daysNextMonth; i++) {
        nextMonthDays.push(new Date(nextMonthYear, nextMonth, i));
      }
    }
    
    const allDays = [...previousMonthDays, ...currentMonthDays, ...nextMonthDays];
    
    // Group days into weeks
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    
    return (
      <>
        <Grid columns={7} gutter="xs" mb="xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Grid.Col span={1} key={day}>
              <Text fw={500} ta="center">{day}</Text>
            </Grid.Col>
          ))}
        </Grid>
        
        <Grid columns={7} gutter="xs">
          {previousMonthDays.map((date) => (
            <Grid.Col span={1} key={`prev-${date.getDate()}`}>
              {renderDayCell(date, false)}
            </Grid.Col>
          ))}
          
          {currentMonthDays.map((date) => (
            <Grid.Col span={1} key={date.getDate()}>
              {renderDayCell(date)}
            </Grid.Col>
          ))}
          
          {nextMonthDays.map((date) => (
            <Grid.Col span={1} key={`next-${date.getDate()}`}>
              {renderDayCell(date, false)}
            </Grid.Col>
          ))}
        </Grid>
      </>
    );
  };
  
  // Render calendar for week view
  const renderWeekCalendar = () => {
    // Clone current date
    const date = new Date(currentDate);
    
    // Get the first day of the week (Sunday)
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    
    // Generate array of 7 days starting from Sunday
    const week = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(date);
      week.push(currentDay);
      date.setDate(date.getDate() + 1);
    }
    
    return (
      <>
        <Grid columns={7} gutter="xs" mb="xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Grid.Col span={1} key={day}>
              <Text fw={500} ta="center">{day}</Text>
            </Grid.Col>
          ))}
        </Grid>
        
        <Grid columns={7} gutter="xs">
          {week.map((date, i) => (
            <Grid.Col span={1} key={i}>
              {renderDayCell(date, date.getMonth() === currentDate.getMonth())}
            </Grid.Col>
          ))}
        </Grid>
      </>
    );
  };
  
  if (loading) {
    return (
      <Center style={{ height: '300px' }}>
        <Loader size="lg" />
      </Center>
    );
  }
  
  return (
    <Paper p="md" shadow="xs" radius="md">
      <Group position="apart" mb="md">
        <Title order={3}>Trade Calendar</Title>
        
        <Group>
          <Select
            value={viewMode}
            onChange={(value) => setViewMode(value as 'month' | 'week')}
            data={[
              { value: 'month', label: 'Month View' },
              { value: 'week', label: 'Week View' }
            ]}
          />
          
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </Group>
      </Group>
      
      <Group position="apart" mb="md">
        <ActionIcon 
          variant="subtle" 
          size="lg" 
          onClick={prevMonth}
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        
        <Title order={4}>{monthYear}</Title>
        
        <ActionIcon 
          variant="subtle" 
          size="lg" 
          onClick={nextMonth}
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
      
      {viewMode === 'month' ? renderMonthCalendar() : renderWeekCalendar()}
    </Paper>
  );
}