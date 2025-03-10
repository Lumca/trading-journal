// src/components/TradeDrawerButton.tsx
import { useState } from 'react';
import { Button, Tooltip, ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { TradeDrawerForm } from './TradeDrawerForm';
import { Trade } from '../lib/supabase';

interface TradeDrawerButtonProps {
  mode: 'add' | 'edit';
  trade?: Trade;
  onSuccess: () => void;
  journalId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  compact?: boolean;
  iconOnly?: boolean;
}

export function TradeDrawerButton({ 
  mode, 
  trade, 
  onSuccess, 
  journalId,
  size = 'md',
  compact = false,
  iconOnly = false
}: TradeDrawerButtonProps) {
  const [drawerOpened, setDrawerOpened] = useState(false);

  const handleOpen = () => setDrawerOpened(true);
  const handleClose = () => setDrawerOpened(false);
  const handleSuccess = () => {
    onSuccess();
    setDrawerOpened(false);
  };

  if (mode === 'add') {
    if (iconOnly) {
      return (
        <>
          <Tooltip label="Add Trade">
            <ActionIcon 
              color="blue" 
              variant="filled" 
              onClick={handleOpen}
              size={size}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
          
          <TradeDrawerForm
            opened={drawerOpened}
            onClose={handleClose}
            onSuccess={handleSuccess}
            journalId={journalId}
          />
        </>
      );
    }
    
    return (
      <>
        <Button
          leftIcon={<IconPlus size={16} />}
          onClick={handleOpen}
          size={size}
          compact={compact}
        >
          {compact ? '' : 'Add Trade'}
        </Button>
        
        <TradeDrawerForm
          opened={drawerOpened}
          onClose={handleClose}
          onSuccess={handleSuccess}
          journalId={journalId}
        />
      </>
    );
  } 
  
  // Edit mode
  return (
    <>
      <Tooltip label="Edit Trade">
        <ActionIcon
          color="blue"
          variant="subtle"
          onClick={handleOpen}
          size={size}
        >
          <IconEdit size={16} />
        </ActionIcon>
      </Tooltip>
      
      <TradeDrawerForm
        opened={drawerOpened}
        onClose={handleClose}
        onSuccess={handleSuccess}
        editTradeId={trade?.id}
        journalId={journalId}
      />
    </>
  );
}