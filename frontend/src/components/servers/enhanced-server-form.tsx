'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Sparkles } from 'lucide-react';
import { mcpApi, MCPServer, MCPServerPreset } from '@/lib/mcp-api';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Enhanced validation schema with URL validation
const serverFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL (e.g., http://localhost:3001)')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL must use HTTP or HTTPS protocol' }
    ),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: z
    .enum(['custom', 'filesystem', 'database', 'api', 'github', 'postgres', 'aws', 'http'], {
      required_error: 'Please select a server type',
    })
    .default('custom'),
});

type ServerFormValues = z.infer<typeof serverFormSchema>;

interface EnhancedServerFormProps {
  server?: MCPServer;
  onSuccess?: () => void;
  onCancel?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedServerForm({
  server,
  onSuccess,
  onCancel,
  open,
  onOpenChange,
}: EnhancedServerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [presets, setPresets] = useState<MCPServerPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<MCPServerPreset | null>(null);
  const [showPresets, setShowPresets] = useState(!server); // Show presets only for new servers

  const isEditMode = !!server;

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: server?.name || '',
      url: server?.url || '',
      description: server?.description || '',
      type: (server?.type as any) || 'custom',
    },
  });

  // Load presets on mount
  useEffect(() => {
    if (open && !isEditMode) {
      loadPresets();
    }
  }, [open, isEditMode]);

  // Reset form when dialog opens/closes or server changes
  useEffect(() => {
    if (open) {
      if (server) {
        form.reset({
          name: server.name,
          url: server.url,
          description: server.description || '',
          type: (server.type as any) || 'custom',
        });
      } else {
        form.reset({
          name: '',
          url: '',
          description: '',
          type: 'custom',
        });
        setSelectedPreset(null);
      }
    }
  }, [open, server, form]);

  const loadPresets = async () => {
    try {
      const presetsData = await mcpApi.listPresets();
      setPresets(presetsData);
    } catch (error) {
      console.error('Failed to load presets:', error);
      // Don't show error toast - presets are optional
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
      form.setValue('name', preset.name);
      form.setValue('url', preset.default_url);
      form.setValue('description', preset.description);
      form.setValue('type', preset.id as any);
    } else {
      setSelectedPreset(null);
    }
  };

  const onSubmit: SubmitHandler<ServerFormValues> = async (data) => {
    try {
      setIsLoading(true);

      if (isEditMode && server) {
        await mcpApi.updateServer(server.id, {
          name: data.name,
          url: data.url,
          description: data.description,
          type: data.type,
        });
        toast.success('Server updated successfully');
      } else {
        await mcpApi.createServer({
          name: data.name,
          url: data.url,
          description: data.description,
          type: data.type,
        });
        toast.success('Server added successfully');
      }

      onOpenChange(false);
      form.reset();
      setSelectedPreset(null);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save server:', error);
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to save server. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setSelectedPreset(null);
    onOpenChange(false);
    onCancel?.();
  };

  const serverTypes = [
    { value: 'custom', label: 'Custom' },
    { value: 'filesystem', label: 'Filesystem' },
    { value: 'database', label: 'Database' },
    { value: 'api', label: 'API' },
    { value: 'github', label: 'GitHub' },
    { value: 'postgres', label: 'PostgreSQL' },
    { value: 'aws', label: 'AWS' },
    { value: 'http', label: 'HTTP' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Pencil className="h-5 w-5" />
                Edit Server
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New Server
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the server configuration below.'
              : 'Add a new MCP server to monitor. You can use a preset or configure manually.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Preset Selection (only for new servers) */}
          {!isEditMode && presets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Quick Start with Presets (Optional)
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a preset to auto-fill common server configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedPreset?.id || ''}
                  onValueChange={handlePresetSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a preset (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None - Manual Configuration</SelectItem>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          <span>{preset.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {preset.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPreset && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">{selectedPreset.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {selectedPreset.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPreset.required_tools?.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Server Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Server Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="My MCP Server"
              {...form.register('name')}
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="url">
              Server URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="http://localhost:3001"
              {...form.register('url')}
              disabled={isLoading}
            />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be a valid HTTP or HTTPS URL (e.g., http://localhost:3001)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Optional description for this server"
              {...form.register('description')}
              disabled={isLoading}
              rows={3}
              className="resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Server Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Server Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value) => form.setValue('type', value as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select server type" />
              </SelectTrigger>
              <SelectContent>
                {serverTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Update Server
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Server
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}





