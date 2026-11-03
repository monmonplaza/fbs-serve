import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/app.css';
import { App } from './app/App';
import { api } from './api';
import { bootFromHash } from './store/ui';

const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: false } } });

// Opened from a table QR code: join that table's session before the first render.
const { table, token } = bootFromHash();
(table && token ? api.guest.join(table, token) : Promise.resolve()).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode><QueryClientProvider client={client}><App /></QueryClientProvider></StrictMode>,
  );
});
