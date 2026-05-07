'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    if (user.role === 'INST_ADMIN' || user.role === 'INST_USER') {
      router.replace('/batches');
    } else {
      router.replace('/institutions');
    }
  }, [user, router]);

  return null;
}
