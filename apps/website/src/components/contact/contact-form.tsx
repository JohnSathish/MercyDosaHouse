'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Phone,
  Mail,
  Tag,
  Pencil,
  UploadCloud,
  Send,
  RotateCcw,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button, Input, Label, Select, Textarea } from '@mdh/ui';
import { CONTACT_FORM_SUBJECTS, contactFormSchema } from '@mdh/types';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';

const formSchema = contactFormSchema;
type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  name: '',
  phone: '',
  email: '',
  subject: 'General Inquiry',
  message: '',
};

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#14532D]/45">
      {children}
    </span>
  );
}

function fieldClass(hasError: boolean) {
  return hasError
    ? 'border-red-400 focus-visible:ring-red-200 pl-10 bg-[#FFF8E8]/60'
    : 'border-[#14532D]/12 focus-visible:ring-[#14532D]/20 pl-10 bg-[#FFF8E8]/60';
}

export function ContactForm() {
  const toast = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onPickImage = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImageName(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast.show('Please upload a JPG or PNG image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.show('Image must be 5MB or smaller.');
      return;
    }
    setImageFile(file);
    setImageName(file.name);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('phone', values.phone);
      formData.append('email', values.email);
      formData.append('subject', values.subject);
      formData.append('message', values.message);
      if (imageFile) formData.append('image', imageFile);

      const result = await api.upload<{ sent: boolean; error?: string }>('/contact', formData);

      if (!result.sent) {
        toast.show(result.error ?? 'Could not send message. Please try WhatsApp or call us.');
        return;
      }

      toast.show('Message sent! We will reply shortly.');
      reset(defaultValues);
      setImageFile(null);
      setImageName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-[0_8px_40px_rgba(20,83,45,0.12)] border border-[#14532D]/10 ring-1 ring-[#14532D]/5">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14532D]/10">
            <Send className="h-5 w-5 text-[#14532D]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#14532D]">Send Us a Message</h2>
            <p className="text-sm text-[#1F2937]/60 mt-0.5">
              We usually reply within a few minutes
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100 shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          We&apos;re Online
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact-name" className="text-[#14532D] font-medium">
              Your Name
            </Label>
            <div className="relative mt-1.5">
              <FieldIcon>
                <User className="h-4 w-4" />
              </FieldIcon>
              <Input
                id="contact-name"
                placeholder="John Doe"
                className={`h-11 rounded-xl ${fieldClass(!!errors.name)}`}
                {...register('name')}
              />
            </div>
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="contact-phone" className="text-[#14532D] font-medium">
              Phone Number
            </Label>
            <div className="relative mt-1.5">
              <FieldIcon>
                <Phone className="h-4 w-4" />
              </FieldIcon>
              <Input
                id="contact-phone"
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                className={`h-11 rounded-xl ${fieldClass(!!errors.phone)}`}
                {...register('phone')}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="contact-email" className="text-[#14532D] font-medium">
            Email Address
          </Label>
          <div className="relative mt-1.5">
            <FieldIcon>
              <Mail className="h-4 w-4" />
            </FieldIcon>
            <Input
              id="contact-email"
              type="email"
              placeholder="you@example.com"
              className={`h-11 rounded-xl ${fieldClass(!!errors.email)}`}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="contact-subject" className="text-[#14532D] font-medium">
            Subject
          </Label>
          <div className="relative mt-1.5">
            <FieldIcon>
              <Tag className="h-4 w-4" />
            </FieldIcon>
            <Select
              id="contact-subject"
              className={`h-11 rounded-xl ${fieldClass(!!errors.subject)}`}
              {...register('subject')}
            >
              {CONTACT_FORM_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </Select>
          </div>
          {errors.subject && (
            <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contact-message" className="text-[#14532D] font-medium">
            Your Message
          </Label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3.5 top-3.5 text-[#14532D]/45">
              <Pencil className="h-4 w-4" />
            </span>
            <Textarea
              id="contact-message"
              rows={5}
              placeholder="Type your message here..."
              className={`rounded-xl pt-3 pl-10 min-h-[120px] ${fieldClass(!!errors.message)}`}
              {...register('message')}
            />
          </div>
          {errors.message && (
            <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#14532D]/15 bg-[#FFF8E8]/40 px-4 py-6 text-sm text-[#1F2937]/65 hover:border-[#14532D]/30 hover:bg-[#FFF8E8]/70 transition-colors"
          >
            <UploadCloud className="h-6 w-6 text-[#14532D]/50" />
            <span>
              {imageName ? (
                <span className="text-[#14532D] font-medium">{imageName}</span>
              ) : (
                <>
                  Upload Image <span className="text-[#1F2937]/45">(Optional)</span>
                </>
              )}
            </span>
            <span className="text-xs text-[#1F2937]/45">JPG, PNG up to 5MB</span>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-[#14532D]/15 text-[#1F2937] hover:bg-[#FFF8E8]"
            onClick={() => {
              reset(defaultValues);
              setImageFile(null);
              setImageName(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={isSubmitting}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            type="submit"
            className="h-11 flex-1 rounded-xl bg-[#14532D] hover:bg-[#0f3d24] text-white btn-glow"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </form>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[#1F2937]/50">
        <Shield className="h-3.5 w-3.5 text-[#14532D]/60" />
        Your information is safe with us. We respect your privacy.
      </p>
    </div>
  );
}
