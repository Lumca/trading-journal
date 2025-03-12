// src/components/TradeDrawerButton.tsx
import { ActionIcon, Button, Tooltip } from '@mantine/core';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Trade } from '../lib/supabase';
import { TradeDrawerForm } from './TradeDrawerForm';

interface TradeDrawerButtonProps {
  mode: 'add' | 'edit';
  trade?: Trade;
  onSuccess: () => void;
  journalId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  compact?: boolean;
  iconOnly?: boolean;
  // Add this new prop
  customOpenHandler?: () => void;
}

export function TradeDrawerButton({ 
  mode, 
  trade, 
  onSuccess, 
  journalId,
  size = 'md',
  compact = false,
  iconOnly = false,
  customOpenHandler
}: TradeDrawerButtonProps) {
  const [drawerOpened, setDrawerOpened] = useState(false);

  const handleOpen = () => {
    // If customOpenHandler is provided, use it
    if (customOpenHandler) {
      customOpenHandler();
      // Set a short timeout to open the drawer after the popover closes
      setTimeout(() => {
        setDrawerOpened(true);
      }, 50);
    } else {
      // Default behavior
      setDrawerOpened(true);
    }
  };
  
  const handleClose = () => setDrawerOpened(false);
  const handleSuccess = () => {
    onSuccess();
    setDrawerOpened(false);
  };

  if (mode === 'edit') {
    if (iconOnly) {
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
    
    return (
      <>
        <Button
          leftSection={<IconEdit size={16} />}
          onClick={handleOpen}
          size={size}
        >
          Edit Trade
        </Button>
        
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
  
  // Add mode
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
        leftSection={<IconPlus size={16} />}
        onClick={handleOpen}
        size={size}
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