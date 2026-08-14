import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Dynamically resolves TCP Connector base URL.
 * When accessing from a mobile browser or local LAN IP (e.g. 192.168.1.56:3000),
 * resolves to http://192.168.1.56:4000 instead of failing on mobile localhost.
 */
export function getConnectorUrl(): string {
  if (process.env.NEXT_PUBLIC_CONNECTOR_URL && process.env.NEXT_PUBLIC_CONNECTOR_URL !== 'http://localhost:4000') {
    return process.env.NEXT_PUBLIC_CONNECTOR_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host.includes('vercel.app')) {
      return 'https://courageous-unexplosively-beckett.ngrok-free.dev';
    }
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000`;
    }
  }
  return 'http://localhost:4000';
}

