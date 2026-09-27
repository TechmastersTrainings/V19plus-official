'use client';

import React from 'react';
import { RouteGuard } from '../../components/layout/RouteGuard';

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteGuard>{children}</RouteGuard>;
}
