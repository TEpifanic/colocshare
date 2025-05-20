"use client";

import React from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

interface CustomLinkProps extends React.ComponentPropsWithoutRef<typeof NextLink> {
  children: React.ReactNode;
  prefetch?: boolean;
}

export default function Link({ children, prefetch = true, ...props }: CustomLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === props.href;
  
  return (
    <NextLink 
      {...props} 
      prefetch={prefetch}
    >
      {children}
    </NextLink>
  );
} 