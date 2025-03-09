// src/components/TradeView.tsx
import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Grid,
  Box,
  Divider,
  Card,
  ActionIcon,
  Tooltip,
  Image,
  SimpleGrid
} from '@mantine/core';
import { IconEdit, IconArrowLeft } from '@tabler/icons-react';
import { FaEye } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { Trade } from '../lib/supabase';
import { Screenshot } from './TradeScreenshots';

interface TradeViewProps {
  trade: Trade;
  onBack: () => void;
  onEdit: (trade: Trade) => void;
}

export function TradeView({ trade, onBack, onEdit }: TradeViewProps) {
  const { getTradeIndicators, getTradeScreenshots } = useSupabase();
  const { selectedJournal } = useJournal();
  const [indicators, setIndicators] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<Screenshot | null>(null);
  
  useEffect(() => {
    fetchTradeDetails();
  }, [trade.id]);
  
  const fetchTradeDetails = async () => {
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
    } catch (error) {
      console.error('Error fetching trade details:', error);
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
    setPreviewImage(screenshot);
    setShowImagePreview(true);
  };

  return (
    <Paper p="md" shadow="xs" radius="md">
      <Stack spacing="md">
        {/* Header */}
        <Group position="apart">
          <Group>
            <Button 
              leftIcon={<IconArrowLeft size={16} />} 
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
              {trade.direction.toUpperCase()}
            </Badge>
            <Badge 
              color={trade.status === 'open' ? 'blue' : 'green'} 
              size="lg"
            >
              {trade.status.toUpperCase()}
            </Badge>
          </Group>
          
          <Button 
            leftIcon={<IconEdit size={16} />} 
            onClick={() => onEdit(trade)}
          >
            Edit Trade
          </Button>
        </Group>
        
        {/* Trade Summary */}
        <Card withBorder shadow="xs">
          <Stack spacing={0}>
            <Box p="md" style={{ borderBottom: '1px solid #eee' }}>
              <Title order={4}>Trade Summary</Title>
            </Box>
            
            <Box p="md">
              <Grid>
                <Grid.Col span={6}>
                  <Stack spacing="xs">
                    <Text fw={500}>Entry Date</Text>
                    <Text>{formatDate(trade.entry_date)}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack spacing="xs">
                    <Text fw={500}>Exit Date</Text>
                    <Text>{formatDate(trade.exit_date)}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack spacing="xs">
                    <Text fw={500}>Entry Price</Text>
                    <Text>{formatCurrency(trade.entry_price)}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack spacing="xs">
                    <Text fw={500}>Exit Price</Text>
                    <Text>{formatCurrency(trade.exit_price)}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack spacing="xs">
                    <Text fw={500}>Quantity</Text>
                    <Text>{trade.quantity}</Text>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack spacing="xs">
                    <Text fw={500}>Strategy</Text>
                    <Text>{trade.strategy || '-'}</Text>
                  </Stack>
                </Grid.Col>
                
                {trade.status === 'closed' && (
                  <>
                    <Grid.Col span={6}>
                      <Stack spacing="xs">
                        <Text fw={500}>P/L</Text>
                        <Text fw={700} c={trade.profit_loss && trade.profit_loss >= 0 ? 'green' : 'red'}>
                          {formatCurrency(trade.profit_loss)}
                        </Text>
                      </Stack>
                    </Grid.Col>
                    
                    <Grid.Col span={6}>
                      <Stack spacing="xs">
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
        
        {/* Indicators */}
        <Card withBorder shadow="xs">
          <Stack spacing={0}>
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
            <Stack spacing={0}>
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
            <Stack spacing={0}>
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
    <Stack spacing={0}>
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
              <Box sx={{ cursor: 'pointer' }} onClick={() => openImagePreview(screenshot)}>
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
                <Text size="xs" fw={500} mt={6} lineClamp={1}>
                  {screenshot.fileName}
                </Text>
              </Box>
            </Card>
          ))}
        </SimpleGrid>
      </Box>
    </Stack>
  </Card>
)}
      </Stack>
      
      {/* Image Preview */}
      {previewImage && (
        <Box
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: showImagePreview ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setShowImagePreview(false)}
        >
          <Image 
            src={previewImage.url} 
            alt="Trade screenshot preview" 
            fit="contain"
            style={{ maxHeight: '90vh', maxWidth: '90vw' }}
          />
        </Box>
      )}
    </Paper>
  );
}