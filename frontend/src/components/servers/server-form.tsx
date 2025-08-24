'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { addServer } from '@/lib/api';

const serverFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535, 'Port must be between 1 and 65535'),
});

type ServerFormValues = z.infer<typeof serverFormSchema>;

interface ServerFormProps {
  onSuccess?: () => void;
  children: ReactNode;
}

export const ServerForm: FC<ServerFormProps> = ({
  onSuccess,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema) as any, // Type assertion to fix resolver type
    defaultValues: {
      name: '',
      host: '',
      port: 8080,
    },
  });

  const onSubmit: SubmitHandler<ServerFormValues> = async (data) => {
    try {
      setIsLoading(true);
      await addServer({
        name: data.name,
        host: data.host,
        port: data.port,
      });
      
      toast.success('Server added successfully');
      
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add server:', error);
      toast.error('Failed to add server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Server</DialogTitle>
            <DialogDescription>
              Add a new MCP server to monitor. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  placeholder="My Server"
                  className="col-span-3"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="host" className="text-right">
                Host
              </Label>
              <div className="col-span-3">
                <Input
                  id="host"
                  placeholder="example.com"
                  className="col-span-3"
                  {...form.register('host')}
                />
                {form.formState.errors.host && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.host.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="port" className="text-right">
                Port
              </Label>
              <div className="col-span-3">
                <Input
                  id="port"
                  type="number"
                  placeholder="8080"
                  className="col-span-3"
                  {...form.register('port', { valueAsNumber: true })}
                />
                {form.formState.errors.port && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.port.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Server
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
