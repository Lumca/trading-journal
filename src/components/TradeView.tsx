// src/components/TradeView.tsx
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Grid,
    Group,
    Image,
    Loader,
    Modal,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    Title
} from '@mantine/core';
import { IconArrowLeft, IconMaximize } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useJournal } from '../contexts/JournalContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';
import { TradeEntry, TradeExit } from '../lib/types';
import { TradeDrawerButton } from './TradeDrawerButton';
import { Screenshot } from './TradeScreenshots';

interface TradeViewProps {
  trade: Trade;
  onBack: () => void;
  onEdit: (trade: Trade) => void;
}

export function TradeView({ trade, onBack, onEdit }: TradeViewProps) {
  const { getTradeIndicators, getTradeScreenshots, getTradeEntries, getTradeExits } = useSupabase();
  const { selectedJournal } = useJournal();
  const [indicators, setIndicators] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [exits, setExits] = useState<TradeExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  
  useEffect(() => {
    fetchTradeDetails();
  }, [trade.id]);
  
  const fetchTradeDetails = async () => {
    setLoading(true);
    try {
      // Fetch indicators
      const indicatorsData = await getTradeIndicators(trade.id);
      setIndicators(indicatorsData.map(ind => ind.indicator_name));
      
      // Fetch screenshots
      const screenshotsData = await getTradeScreenshots(trade.id);
      const formattedScreenshots: Screenshot[] = screenshotsData.map(s => ({
        id: s.id,
        url: s.url,
        tradeId: s.trade_id,
        fileName: s.file_name
      }));
      setScreenshots(formattedScreenshots);

      // Fetch entries and exits
      const [entriesData, exitsData] = await Promise.all([
        getTradeEntries(trade.id),
        getTradeExits(trade.id)
      ]);
      
      setEntries(entriesData);
      setExits(exitsData);
    } catch (error) {
      console.error('Error fetching trade details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const openImagePreview = (screenshot: Screenshot) => {
    setSelectedImage(screenshot);
    setImageModalOpen(true);
  };

  if (loading) {
    return (
      <Paper p="md" shadow="xs" radius="md">
        <Center h={300}>
          <Loader size="lg" />
        </Center>
      </Paper>
    );
  }

  // Calculate some statistics based on entries and exits
  const calculateTotals = () => {
    const totalEntryQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const executedExits = exits.filter(exit => exit.execution_status === 'executed');
    const totalExitQuantity = executedExits.reduce((sum, exit) => sum + (exit.quantity || 0), 0);
    
    const totalEntryValue = entries.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
    const totalExitValue = executedExits.reduce((sum, exit) => 
      sum + ((exit.price || 0) * (exit.quantity || 0)), 0);
    
    const avgEntryPrice = totalEntryQuantity > 0 ? totalEntryValue / totalEntryQuantity : 0;
    const avgExitPrice = totalExitQuantity > 0 ? totalExitValue / totalExitQuantity : 0;
    
    return {
      totalEntryQuantity,
      totalExitQuantity,
      avgEntryPrice,
      avgExitPrice,
      remainingQuantity: totalEntryQuantity - totalExitQuantity
    };
  };

  const totals = calculateTotals();

  return (
    <Paper p="md" shadow="xs" radius="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="apart">
          <Group>
            <Button 
              leftSection={<IconArrowLeft size={16} />} 
              variant="light" 
              onClick={onBack}
            >
              Back
            </Button>
            <Title order={3}>{trade.symbol} Trade Details</Title>
            <Badge 
              color={trade.direction === 'long' ? 'green' : 'red'} 
              size="lg"
            >
              {(trade.direction || '').toUpperCase()}
            </Badge>
            <Badge 
              color={trade.status === 'open' ? 'blue' : 'green'}
              size="lg"
            >
              {(trade.status || '').toUpperCase()}
            </Badge>
          </Group>
          
          <TradeDrawerButton 
            mode="edit" 
            trade={trade} 
            onSuccess={() => onEdit(trade)}
          />
        </Group>
        
        {/* Trade Summary */}
        <Card withBorder shadow="xs">
          <Stack gap={0}>
            <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
              <Title order={4}>Trade Summary</Title>
            </Box>
            
            <Box p="md">
              <Grid>
                <Grid.Col span={6}>
                  <Stack gap="xs">
                    <Text fw={500}>Initial Entry Date</Text>
                    <Text>{formatDate(trade.entry_date)}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack gap="xs">
                    <Text fw={500}>Last Exit Date</Text>
                    <Text>{formatDate(trade.exit_date)}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack gap="xs">
                    <Text fw={500}>Total Quantity</Text>
                    <Text>{totals.totalEntryQuantity}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack gap="xs">
                    <Text fw={500}>Strategy</Text>
                    <Text>{trade.strategy || '-'}</Text>
                  </Stack>
                </Grid.Col>
                
                
<Grid.Col span={6}>
  <Stack gap="xs">
    <Text fw={500}>Fees</Text>
    <Text c="red">{formatCurrency(trade.fees || 0)}</Text>
  </Stack>
</Grid.Col>

{trade.status === 'closed' && (
  <>
    <Grid.Col span={6}>
      <Stack gap="xs">
        <Text fw={500}>Gross P/L</Text>
        <Text fw={700} c={trade.profit_loss && trade.profit_loss >= 0 ? 'green' : 'red'}>
          {formatCurrency(trade.profit_loss || 0)}
        </Text>
      </Stack>
    </Grid.Col>
    
    <Grid.Col span={6}>
      <Stack gap="xs">
        <Text fw={500}>Net P/L (after fees)</Text>
        <Text fw={700} c={trade.profit_loss && (trade.profit_loss - (trade.fees || 0)) >= 0 ? 'green' : 'red'}>
          {formatCurrency((trade.profit_loss || 0) - (trade.fees || 0))}
        </Text>
      </Stack>
    </Grid.Col>
    
    <Grid.Col span={6}>
      <Stack gap="xs">
        <Text fw={500}>P/L %</Text>
        <Text fw={700} c={trade.profit_loss_percent && trade.profit_loss_percent >= 0 ? 'green' : 'red'}>
          {trade.profit_loss_percent?.toFixed(2)}%
        </Text>
      </Stack>
    </Grid.Col>
  </>
)}
              </Grid>
            </Box>
          </Stack>
        </Card>
        
        {/* Entry Points */}
        <Card withBorder shadow="xs">
          <Stack gap={0}>
            <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
              <Title order={4}>Entry Points</Title>
            </Box>
            
            <Box p="md">
              {entries && entries.length > 0 ? (
                <Stack gap="sm">
                  {entries.map((entry, index) => (
                    <Card key={entry.id} p="xs" withBorder>
                      <Group justify="apart">
                        <Text fw={500}>Entry #{index + 1}</Text>
                        <Text>{formatDate(entry.date)}</Text>
                      </Group>
                      <Group grow mt="xs">
                        <Text>Price: {formatCurrency(entry.price)}</Text>
                        <Text>Quantity: {entry.quantity}</Text>
                      </Group>
                      {entry.notes && (
                        <Text size="sm" mt="xs" c="dimmed">
                          Notes: {entry.notes}
                        </Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">No detailed entry points available.</Text>
              )}
            </Box>
          </Stack>
        </Card>
        
        {/* Exit Points */}
        <Card withBorder shadow="xs">
          <Stack gap={0}>
            <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
              <Title order={4}>Exit Points & Orders</Title>
            </Box>
            
            <Box p="md">
              {exits && exits.length > 0 ? (
                <Stack gap="sm">
                  {exits.map((exit, index) => (
                    <Card key={exit.id} p="xs" withBorder>
                      <Group justify="apart">
                        <Group>
                          <Text fw={500}>Exit #{index + 1}</Text>
                          {exit.is_stop_loss && (
                            <Badge color="red">Stop Loss</Badge>
                          )}
                          {exit.is_take_profit && (
                            <Badge color="green">Take Profit</Badge>
                          )}
                          <Badge 
                            color={
                              exit.execution_status === 'executed' ? 'green' :
                              exit.execution_status === 'pending' ? 'blue' : 'gray'
                            }
                          >
                            {(exit.execution_status || "").toUpperCase()}
                          </Badge>
                        </Group>
                        <Text>{exit.date ? formatDate(exit.date) : 'No date'}</Text>
                      </Group>
                      <Group grow mt="xs">
                        <Text>Price: {formatCurrency(exit.price || 0)}</Text>
                        <Text>Quantity: {exit.quantity || 0}</Text>
                      </Group>
                      {exit.notes && (
                        <Text size="sm" mt="xs" c="dimmed">
                          Notes: {exit.notes}
                        </Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">No detailed exit points available.</Text>
              )}
            </Box>
          </Stack>
        </Card>
        
        {/* Indicators */}
        <Card withBorder shadow="xs">
          <Stack gap={0}>
            <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
              <Title order={4}>Technical Indicators</Title>
            </Box>
            
            <Box p="md">
              {indicators.length > 0 ? (
                <Group>
                  {indicators.map((indicator, index) => (
                    <Badge key={index} size="lg">{indicator}</Badge>
                  ))}
                </Group>
              ) : (
                <Text c="dimmed">No indicators used for this trade.</Text>
              )}
            </Box>
          </Stack>
        </Card>
        
        {/* Tags */}
        {trade.tags && trade.tags.length > 0 && (
          <Card withBorder shadow="xs">
            <Stack gap={0}>
              <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
                <Title order={4}>Tags</Title>
              </Box>
              
              <Box p="md">
                <Group>
                  {trade.tags.map((tag, index) => (
                    <Badge key={index} size="lg" color="blue">{tag}</Badge>
                  ))}
                </Group>
              </Box>
            </Stack>
          </Card>
        )}
        
        {/* Notes */}
        {trade.notes && (
          <Card withBorder shadow="xs">
            <Stack gap={0}>
              <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
                <Title order={4}>Notes</Title>
              </Box>
              
              <Box p="md">
                <Text>{trade.notes}</Text>
              </Box>
            </Stack>
          </Card>
        )}
        
        {/* Screenshots */}
        {screenshots.length > 0 && (
          <Card withBorder shadow="xs">
            <Stack gap={0}>
              <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
                <Title order={4}>Screenshots</Title>
              </Box>
              
              <Box p="md">
                <SimpleGrid cols={3} breakpoints={[
                  { maxWidth: 'md', cols: 2 },
                  { maxWidth: 'sm', cols: 1 }
                ]}>
                  {screenshots.map((screenshot, index) => (
                    <Card key={index} p="xs" withBorder shadow="xs">
                      <Box style={{ position: 'relative' }}>
                        <Image 
                          src={screenshot.url} 
                          alt={`Trade screenshot ${index + 1}`}
                          fit="cover"
                          height={140}
                          sx={{ 
                            objectFit: 'cover',
                            objectPosition: 'center top'
                          }}
                        />
                        <ActionIcon
                          style={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                          }}
                          variant="transparent"
                          onClick={() => openImagePreview(screenshot)}
                        >
                          <IconMaximize color="white" size={16} />
                        </ActionIcon>
                      </Box>
                      <Text size="xs" fw={500} mt={6} lineClamp={1}>
                        {screenshot.fileName}
                      </Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            </Stack>
          </Card>
        )}
      </Stack>
      
      {/* Image Preview Modal */}
      <Modal
        opened={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={selectedImage?.fileName || "Screenshot"}
        size="xl"
        centered
      >
        {selectedImage && (
          <Image 
            src={selectedImage.url} 
            alt="Trade screenshot" 
            fit="contain"
            style={{ maxHeight: 'calc(80vh - 60px)' }}
          />
        )}
      </Modal>
    </Paper>
  );
}