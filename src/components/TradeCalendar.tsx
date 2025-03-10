// src/components/TradeCalendar.tsx
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  Popover,
  Select,
  Text,
  Title,
  Tooltip
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useJournal } from '../contexts/JournalContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';
import { TradeDrawerButton } from './TradeDrawerButton';

interface CalendarProps {
  journalId?: number | null;
}

export function TradeCalendar({ journalId }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const { getTrades, getTradeEntries, getTradeExits } = useSupabase();
  const { selectedJournal } = useJournal();
  
  // Fetch trades whenever journalId changes
  useEffect(() => {
    fetchTrades();
  }, [journalId]);
  
  const fetchTrades = async () => {
    setLoading(true);
    try {
      // Get all trades for the journal
      const tradesData = await getTrades(journalId);
      
      // For each trade, fetch additional entry and exit points
      const tradesWithDetails = await Promise.all(
        tradesData.map(async (trade) => {
          const [entries, exits] = await Promise.all([
            getTradeEntries(trade.id),
            getTradeExits(trade.id)
          ]);
          
          return {
            ...trade,
            entries,
            exits
          };
        })
      );
      
      setTrades(tradesWithDetails);
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
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  // Check if a trade has entries on a specific date
  const getTradeEntriesForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Check main entry date first (for backward compatibility)
    const tradesWithMainEntry = trades.filter(trade => {
      const entryDate = new Date(trade.entry_date);
      return (
        entryDate.getFullYear() === year &&
        entryDate.getMonth() === month &&
        entryDate.getDate() === day
      );
    });
    
    // Check additional entry points
    const tradesWithEntries = trades.filter(trade => {
      if (!trade.entries) return false;
      
      return trade.entries.some(entry => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getFullYear() === year &&
          entryDate.getMonth() === month &&
          entryDate.getDate() === day
        );
      });
    });
    
    // Combine and remove duplicates
    const allTrades = [...tradesWithMainEntry];
    
    // Add trades with entries that aren't already included
    tradesWithEntries.forEach(trade => {
      if (!allTrades.some(t => t.id === trade.id)) {
        allTrades.push(trade);
      }
    });
    
    return allTrades;
  };

  // Check if trades were exited on a specific date
  const getTradeExitsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Check main exit date first (for backward compatibility)
    const tradesWithMainExit = trades.filter(trade => {
      if (!trade.exit_date) return false;
      
      const exitDate = new Date(trade.exit_date);
      return (
        exitDate.getFullYear() === year &&
        exitDate.getMonth() === month &&
        exitDate.getDate() === day
      );
    });
    
    // Check additional exit points
    const tradesWithExits = trades.filter(trade => {
      if (!trade.exits) return false;
      
      return trade.exits.some(exit => {
        if (!exit.date) return false;
        
        const exitDate = new Date(exit.date);
        return (
          exitDate.getFullYear() === year &&
          exitDate.getMonth() === month &&
          exitDate.getDate() === day &&
          exit.execution_status === 'executed'
        );
      });
    });
    
    // Combine and remove duplicates
    const allTrades = [...tradesWithMainExit];
    
    // Add trades with exits that aren't already included
    tradesWithExits.forEach(trade => {
      if (!allTrades.some(t => t.id === trade.id)) {
        allTrades.push(trade);
      }
    });
    
    return allTrades;
  };

  // Calculate net P/L for a specific date
  const getNetProfitLossForDate = (date: Date) => {
    const closedTrades = getTradeExitsForDate(date);
    
    if (closedTrades.length === 0) return 0;
    
    // For each trade, calculate the profit/loss for exits on this date
    return closedTrades.reduce((total, trade) => {
      // First check if the main exit date matches and use its P/L
      if (trade.exit_date) {
        const exitDate = new Date(trade.exit_date);
        if (
          exitDate.getFullYear() === date.getFullYear() &&
          exitDate.getMonth() === date.getMonth() &&
          exitDate.getDate() === date.getDate() &&
          trade.profit_loss !== undefined
        ) {
          return total + trade.profit_loss;
        }
      }
      
      // Next check additional exit points for this date
      if (trade.exits) {
        const exitsOnDate = trade.exits.filter(exit => {
          if (!exit.date || exit.execution_status !== 'executed') return false;
          
          const exitDate = new Date(exit.date);
          return (
            exitDate.getFullYear() === date.getFullYear() &&
            exitDate.getMonth() === date.getMonth() &&
            exitDate.getDate() === date.getDate()
          );
        });
        
        // Calculate P/L for these exits
        return total + exitsOnDate.reduce((exitTotal, exit) => {
          // Simple P/L calculation based on direction
          if (!exit.price || !exit.quantity) return exitTotal;
          
          if (trade.direction === 'long') {
            const entryValue = trade.entry_price * exit.quantity;
            const exitValue = exit.price * exit.quantity;
            return exitTotal + (exitValue - entryValue);
          } else {
            const entryValue = trade.entry_price * exit.quantity;
            const exitValue = exit.price * exit.quantity;
            return exitTotal + (entryValue - exitValue);
          }
        }, 0);
      }
      
      return total;
    }, 0);
  };

  // Calculate weekly summary
  const getWeeklySummary = (week: Date[]) => {
    let totalEntries = 0;
    let totalExits = 0;
    let netProfitLoss = 0;
    
    // Process each day in the week
    week.forEach(date => {
      const entriesForDay = getTradeEntriesForDate(date);
      const exitsForDay = getTradeExitsForDate(date);
      const plForDay = getNetProfitLossForDate(date);
      
      totalEntries += entriesForDay.length;
      totalExits += exitsForDay.length;
      netProfitLoss += plForDay;
    });
    
    return {
      totalEntries,
      totalExits,
      netProfitLoss
    };
  };

  // Render a day cell in the calendar
  const renderDayCell = (date: Date, isCurrentMonth: boolean = true) => {
    const dayEntries = getTradeEntriesForDate(date);
    const dayExits = getTradeExitsForDate(date);
    const netProfitLoss = getNetProfitLossForDate(date);
    const isToday = new Date().toDateString() === date.toDateString();
    
    // Count trades by direction
    const longEntries = dayEntries.filter(t => t.direction === 'long').length;
    const shortEntries = dayEntries.filter(t => t.direction === 'short').length;
    
    // Check if this date has any activity to show
    const hasActivity = dayEntries.length > 0 || dayExits.length > 0;
    
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
        
        {hasActivity ? (
          <Popover width={300} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Box mt={4} style={{ cursor: 'pointer' }}>
                {dayEntries.length > 0 && (
                  <Group gap={4}>
                    {longEntries > 0 && (
                      <Badge color="green" size="xs">
                        {longEntries} Long
                      </Badge>
                    )}
                    
                    {shortEntries > 0 && (
                      <Badge color="red" size="xs">
                        {shortEntries} Short
                      </Badge>
                    )}
                  </Group>
                )}
                
                {dayExits.length > 0 && (
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
              
              {dayEntries.length > 0 && (
                <>
                  <Text size="sm" fw={500} mt="xs">
                    Entries:
                  </Text>
                  
                  {dayEntries.map(trade => (
                    <Card key={`entry-${trade.id}`} p="xs" withBorder mt={4}>
                      <Group justify="apart" mb={4}>
                        <Group gap={4}>
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
                        
                        <TradeDrawerButton
                          mode="edit"
                          trade={trade}
                          onSuccess={fetchTrades}
                          size="xs"
                          iconOnly
                        />
                      </Group>
                      
                      <Text size="xs">
                        Price: {formatCurrency(trade.entry_price)} 
                      </Text>
                      <Text size="xs">
                        Qty: {trade.quantity}
                      </Text>
                    </Card>
                  ))}
                </>
              )}
              
              {dayExits.length > 0 && (
                <>
                  <Text size="sm" fw={500} mt="xs">
                    Exits:
                  </Text>
                  
                  {dayExits.map(trade => (
                    <Card key={`exit-${trade.id}`} p="xs" withBorder mt={4}>
                      <Group justify="apart" mb={4}>
                        <Group gap={4}>
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
                        
                        <TradeDrawerButton
                          mode="edit"
                          trade={trade}
                          onSuccess={fetchTrades}
                          size="xs"
                          iconOnly
                        />
                      </Group>
                      
                      <Text size="xs">
                        Exit: {formatCurrency(trade.exit_price || 0)} 
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
                  
                  <Group justify="apart">
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
        ) : null}
      </Box>
    );
  };

  // Render weekly summary row
  const renderWeeklySummary = (week: Date[]) => {
    const summary = getWeeklySummary(week);
    
    return (
      <Box
        p="xs"
        style={{ 
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '40px'
        }}
      >
        <Text size="sm" fw={500}>
          Week Summary
        </Text>
        <Group>
          {summary.totalEntries > 0 && (
            <Badge size="sm">
              {summary.totalEntries} {summary.totalEntries === 1 ? 'Entry' : 'Entries'}
            </Badge>
          )}
          {summary.totalExits > 0 && (
            <Badge size="sm">
              {summary.totalExits} {summary.totalExits === 1 ? 'Exit' : 'Exits'}
            </Badge>
          )}
          {summary.netProfitLoss !== 0 && (
            <Text 
              size="sm" 
              fw={700} 
              c={summary.netProfitLoss >= 0 ? 'green' : 'red'}
            >
              {formatCurrency(summary.netProfitLoss)}
            </Text>
          )}
        </Group>
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
        
        {weeks.map((week, weekIndex) => (
          <Box key={`week-${weekIndex}`}>
            <Grid columns={7} gutter="xs">
              {week.map((date, dayIndex) => {
                const isCurrentMonth = date.getMonth() === month;
                return (
                  <Grid.Col span={1} key={`day-${dayIndex}`}>
                    {renderDayCell(date, isCurrentMonth)}
                  </Grid.Col>
                );
              })}
            </Grid>
            
            {/* Weekly summary row */}
            <Box mt="xs" mb="md">
              {renderWeeklySummary(week)}
            </Box>
          </Box>
        ))}
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
        
        {/* Weekly summary row */}
        <Box mt="xs">
          {renderWeeklySummary(week)}
        </Box>
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
  
  // Journal title
  const journalTitle = selectedJournal ? 
    `Trade Calendar - ${selectedJournal.name}` : 
    "Trade Calendar";

  return (
    <>
      <Group justify="apart" mb="md">
        <Group>
          <Title order={3}>{journalTitle}</Title>
          <Tooltip label="Refresh">
            <ActionIcon onClick={fetchTrades}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
        
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
          
          <TradeDrawerButton
            mode="add"
            onSuccess={fetchTrades}
            journalId={journalId}
          />
        </Group>
      </Group>
      
      <Group justify="apart" mb="md">
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
    </>
  );
}