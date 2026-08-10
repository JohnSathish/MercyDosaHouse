'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Card, CardContent, Badge } from '@mdh/ui';
import { Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { MediaUploader } from '@/components/cms/media-uploader';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type { OfferDto } from '@mdh/types';

const emptyOffer: Partial<OfferDto> = {
  title: '',
  description: '',
  buttonLabel: 'Order Now',
  buttonUrl: '/menu',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

export default function OffersCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [editing, setEditing] = useState<Partial<OfferDto> | null>(null);

  const { data: offers = [] } = useQuery({
    queryKey: ['cms-offers'],
    queryFn: () => api.get<OfferDto[]>('/offers'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<OfferDto>) =>
      data.id ? api.patch(`/offers/${data.id}`, data) : api.post('/offers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-offers'] });
      setEditing(null);
      toast('Offer saved.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-offers'] });
      toast('Offer deleted.');
    },
  });

  const form: Partial<OfferDto> = editing ?? emptyOffer;

  return (
    <div>
      <CmsPageHeader
        title="Offers & Promotions"
        description="Manage homepage offer cards, banners and flash sales."
        action={{ label: '+ New Offer', onClick: () => setEditing({ ...emptyOffer }) }}
      />

      {editing !== null && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold">{form.id ? 'Edit Offer' : 'New Offer'}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title ?? ''}
                  onChange={(e) => setEditing({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Button Label</Label>
                <Input
                  value={form.buttonLabel ?? ''}
                  onChange={(e) => setEditing({ ...form, buttonLabel: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description ?? ''}
                  onChange={(e) => setEditing({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Button URL</Label>
                <Input
                  value={form.buttonUrl ?? ''}
                  onChange={(e) => setEditing({ ...form, buttonUrl: e.target.value })}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.imageUrl ?? ''}
                    onChange={(e) => setEditing({ ...form, imageUrl: e.target.value })}
                  />
                  <MediaUploader onUploaded={(url) => setEditing({ ...form, imageUrl: url })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-[#14532D]"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((offer) => (
          <Card key={offer.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-[#14532D]">{offer.title}</h3>
                <Badge variant={offer.isActive ? 'default' : 'outline'}>
                  {offer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">{offer.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(offer)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => deleteMutation.mutate(offer.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
