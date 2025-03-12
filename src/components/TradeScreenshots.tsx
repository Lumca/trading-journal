// src/components/TradeScreenshots.tsx
import {
  ActionIcon,
  Box,
  Button,
  Card,
  FileButton,
  Group,
  Image as MantineImage,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text
} from '@mantine/core';
import { IconMaximize, IconTrash, IconUpload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

interface TradeScreenshotsProps {
  tradeId: number;
  screenshots: Screenshot[];
  onScreenshotsChange: (screenshots: Screenshot[]) => void;
}

export interface Screenshot {
  id?: string;
  url: string;
  file?: File;
  tradeId: number;
  fileName: string;
}

interface ResizeOptions {
  maxWidth: number;
  quality: number;
}

export function TradeScreenshots({ tradeId, screenshots, onScreenshotsChange }: TradeScreenshotsProps) {
  const { uploadTradeScreenshot, deleteTradeScreenshot } = useSupabase();
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<Screenshot | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isBrowser, setIsBrowser] = useState(false);
  
  // Detect browser environment on mount
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined' && 
                 typeof window.document !== 'undefined' &&
                 typeof window.Image !== 'undefined');
  }, []);
  
  // Resize options
  const [resizeOptions, setResizeOptions] = useState<ResizeOptions>({
    maxWidth: 1200,
    quality: 0.8
  });
  
  const presetOptions = [
    { value: 'high', label: 'High Quality (1600px, 90%)' },
    { value: 'medium', label: 'Medium Quality (1200px, 80%)' },
    { value: 'low', label: 'Low Quality (800px, 70%)' },
    { value: 'thumbnail', label: 'Thumbnail (400px, 60%)' },
    { value: 'custom', label: 'Custom Settings' },
  ];

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    setFilesToUpload(files);
    setShowResizeModal(true);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'high':
        setResizeOptions({ maxWidth: 1600, quality: 0.9 });
        break;
      case 'medium':
        setResizeOptions({ maxWidth: 1200, quality: 0.8 });
        break;
      case 'low':
        setResizeOptions({ maxWidth: 800, quality: 0.7 });
        break;
      case 'thumbnail':
        setResizeOptions({ maxWidth: 400, quality: 0.6 });
        break;
      default:
        // 'custom' or any other value - do nothing
        break;
    }
  };

  // Function to resize an image using Canvas API
  const resizeImage = (file: File, options: ResizeOptions): Promise<File> => {
    // Check if we're in a browser environment
    if (!isBrowser) {
      console.warn('Attempting to resize image in non-browser environment');
      return Promise.resolve(file); // Return original file if not in browser
    }
    
    return new Promise((resolve, reject) => {
      // Create an image object
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth = img.width;
        let newHeight = img.height;
        
        if (newWidth > options.maxWidth) {
          const ratio = options.maxWidth / newWidth;
          newWidth = options.maxWidth;
          newHeight = Math.round(newHeight * ratio);
        }
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          // Create a new file with the same name but resized content
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          // Revoke the object URL to free memory
          URL.revokeObjectURL(img.src);
          
          resolve(resizedFile);
        }, 'image/jpeg', options.quality);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Clean up
        reject(new Error('Failed to load image'));
      };
    });
  };

  const handleUpload = async () => {
    if (filesToUpload.length === 0) {
      setShowResizeModal(false);
      return;
    }

    setUploading(true);
    setShowResizeModal(false);
    
    try {
      const newScreenshots: Screenshot[] = [];
      
      for (const file of filesToUpload) {
        let fileToUpload = file;
        
        // Only resize if in browser environment
        if (isBrowser) {
          try {
            fileToUpload = await resizeImage(file, resizeOptions);
          } catch (error) {
            console.error('Error resizing image:', error);
            // Fall back to original file
            fileToUpload = file;
          }
        }
        
        // Create temp URL for preview if in browser
        const objectUrl = isBrowser ? URL.createObjectURL(fileToUpload) : '';
        
        // Create a new screenshot entry
        const newScreenshot: Screenshot = {
          url: objectUrl,
          file: fileToUpload,
          tradeId: tradeId || 0, // Use 0 as a placeholder for new trades
          fileName: file.name,
        };
        
        newScreenshots.push(newScreenshot);
      }
      
      // Update the screenshots
      onScreenshotsChange([...screenshots, ...newScreenshots]);
      
      // If we have a valid tradeId (editing an existing trade), upload the files to storage
      if (tradeId > 0) {
        for (const screenshot of newScreenshots) {
          if (screenshot.file) {
            const result = await uploadTradeScreenshot(tradeId, screenshot.file);
            if (result) {
              // Replace the temp URL with the storage URL
              const index = screenshots.length + newScreenshots.indexOf(screenshot);
              const updatedScreenshots = [...screenshots, ...newScreenshots];
              updatedScreenshots[index] = {
                ...screenshot,
                id: result.id,
                url: result.url,
              };
              onScreenshotsChange(updatedScreenshots);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling screenshots:', error);
    } finally {
      setUploading(false);
      setFilesToUpload([]);
    }
  };

  const handleRemove = async (index: number) => {
    const screenshot = screenshots[index];
    
    // Make a copy of screenshots without the deleted one
    const updatedScreenshots = screenshots.filter((_, i) => i !== index);
    onScreenshotsChange(updatedScreenshots);
    
    // If it has an ID, delete it from storage
    if (screenshot.id) {
      try {
        await deleteTradeScreenshot(screenshot.id);
      } catch (error) {
        console.error('Error deleting screenshot:', error);
      }
    } else if (isBrowser && screenshot.url.startsWith('blob:')) {
      // Revoke blob URL if it's a temporary object URL
      URL.revokeObjectURL(screenshot.url);
    }
  };

  const openPreview = (screenshot: Screenshot) => {
    setPreviewImage(screenshot);
    setShowPreview(true);
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="apart">
          <Text size="sm" fw={500}>Trade Screenshots</Text>
          <FileButton 
            onChange={handleFilesSelected} 
            accept="image/png,image/jpeg,image/gif"
            multiple
          >
            {(props) => (
              <Button 
                {...props} 
                leftSection={<IconUpload size={16} />} 
                size="sm"
                loading={uploading}
              >
                Upload Images
              </Button>
            )}
          </FileButton>
        </Group>
        
        {screenshots.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="xl">
            No screenshots added yet. Click 'Upload Images' to add screenshots.
          </Text>
        ) : (
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
            {screenshots.map((screenshot, index) => (
              <Card key={index} p="xs" withBorder>
                <Card.Section>
                  <Box style={{ position: 'relative', overflow: 'hidden' }}>
                    <MantineImage 
                      src={screenshot.url} 
                      alt={`Trade screenshot ${index + 1}`}
                      fit="contain"
                      mx="auto"
                      withPlaceholder
                    />
                    <Group 
                      justify="right" 
                      gap={4}
                      style={{ 
                        position: 'absolute', 
                        top: 5, 
                        right: 5, 
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: 4,
                        padding: '2px'
                      }}
                    >
                      <ActionIcon
                        size="sm"
                        color="blue"
                        variant="transparent"
                        onClick={() => openPreview(screenshot)}
                      >
                        <IconMaximize size={18} color="white" />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="transparent"
                        onClick={() => handleRemove(index)}
                      >
                        <IconTrash size={18} color="white" />
                      </ActionIcon>
                    </Group>
                  </Box>
                </Card.Section>
                <Box mt="xs">
                  <Text size="xs" fw={500}>{screenshot.fileName}</Text>
                </Box>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
      
      {/* Image Preview Modal */}
      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewImage?.fileName || "Screenshot Preview"}
        size="xl"
        centered
      >
        {previewImage && (
          <MantineImage 
            src={previewImage.url} 
            alt="Trade screenshot preview" 
            fit="contain"
          />
        )}
      </Modal>
      
      {/* Resize Options Modal */}
      <Modal
        opened={showResizeModal}
        onClose={() => setShowResizeModal(false)}
        title="Resize Options"
        size="md"
        centered
      >
        <Stack pb={5}>
          <Select
            label="Quality Preset"
            placeholder="Select a preset"
            data={presetOptions}
            defaultValue="medium"
            onChange={(value) => value && applyPreset(value)}
          />
          
          <NumberInput
            label="Maximum Width (pixels)"
            value={resizeOptions.maxWidth}
            onChange={(value) => setResizeOptions({...resizeOptions, maxWidth: Number(value) || 1200})}
            min={100}
            max={3000}
            step={100}
          />
          
          <Text size="sm" fw={500}>Image Quality</Text>
          <Slider
            value={resizeOptions.quality * 100}
            onChange={(value) => setResizeOptions({...resizeOptions, quality: value / 100})}
            min={10}
            max={100}
            step={5}
            label={(value) => `${value}%`}
            marks={[
              { value: 10, label: '10%' },
              { value: 50, label: '50%' },
              { value: 100, label: '100%' }
            ]}
          />
          
          <Text size="xs" c="dimmed">
            Higher quality and resolution will result in larger file sizes. 
            Medium quality (80%) with 1200px width is recommended for most screenshots.
          </Text>
          
          <Group position="right" mt="md">
            <Button variant="outline" onClick={() => setShowResizeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              {`Apply & Upload (${filesToUpload.length} ${filesToUpload.length === 1 ? 'file' : 'files'})`}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}