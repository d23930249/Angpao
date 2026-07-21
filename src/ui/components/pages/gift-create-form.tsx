'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Gift, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/components/ui/form';
import { Input } from '@/ui/components/ui/input';
import { Textarea } from '@/ui/components/ui/textarea';

const schema = z.object({
  recipientName: z.string().min(1, 'Recipient name required').max(80),
  amountUsdc: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, 'Must be a valid USDC amount')
    .refine((v) => Number.parseFloat(v) > 0, 'Amount must be positive'),
  message: z.string().max(280),
});

type FormValues = z.infer<typeof schema>;

interface GiftCreatedData {
  gift: {
    id: string;
    recipientName: string;
    amountUsdc: string;
    status: string;
  };
  secret: string;
}

interface GiftCreateFormProps {
  onCreated: (data: GiftCreatedData) => void;
}

export function GiftCreateForm({ onCreated }: GiftCreateFormProps) {
  const t = useTranslations('Gifts');
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipientName: '',
      amountUsdc: '',
      message: 'Chúc mừng năm mới! 🧧 Happy New Year!',
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to create gift');
      toast.success(t('created'));
      onCreated(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creating gift');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-red-100 dark:border-red-900/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Gift className="h-5 w-5" />
          {t('newTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('newSubtitle')}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipientLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('recipientPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amountUsdc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amountLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="20.00"
                        className="pr-16"
                        {...field}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        USDC
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('messageLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('messagePlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white hover:bg-red-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  {t('create')}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
