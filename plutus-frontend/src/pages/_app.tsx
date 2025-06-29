import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/auth';
import '@carbon/styles/css/styles.css';
import '../styles/globals.scss';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
} 