'use client';

import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            hd?: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const { googleLogin } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setError('Google không trả về thông tin đăng nhập.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await googleLogin(response.credential);
      router.push('/');
    } catch (err: unknown) {
      const requestError = err as { response?: { data?: { message?: string } } };
      setError(requestError.response?.data?.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  }, [googleLogin, router]);

  const initializeGoogle = useCallback(() => {
    if (
      initializedRef.current
      || !window.google
      || !buttonRef.current
      || !GOOGLE_CLIENT_ID
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      hd: 'voyager-hcm.com',
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 320,
      locale: 'vi',
    });
    initializedRef.current = true;
  }, [handleCredential]);

  useEffect(() => {
    initializeGoogle();
  }, [initializeGoogle]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogle}
      />

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-5xl">⚽</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Đăng nhập World Cup 2026</h1>
          <p className="mt-1 text-gray-500">Chỉ dành cho tài khoản Google Workspace Voyager</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!GOOGLE_CLIENT_ID ? (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              Chưa cấu hình Google Client ID.
            </div>
          ) : (
            <div className={loading ? 'pointer-events-none opacity-50' : ''}>
              <div ref={buttonRef} className="flex min-h-11 justify-center" />
            </div>
          )}

          {loading && (
            <p className="mt-4 text-center text-sm font-medium text-blue-600">Đang xác minh tài khoản...</p>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
            Tài khoản mới sẽ được tạo tự động trong lần đăng nhập đầu tiên. Dữ liệu của tài khoản cũ được giữ nguyên theo email.
          </p>
        </div>
      </div>
    </div>
  );
}
