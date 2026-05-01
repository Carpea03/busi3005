'use client';

import { useEffect, useRef, useState } from 'react';

export default function useLiveQuizStream({ enabled, url, load, fallbackIntervalMs = 10000 }) {
  const loadRef = useRef(load);
  const [connectionState, setConnectionState] = useState(enabled ? 'connecting' : 'idle');

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      setConnectionState('idle');
      return undefined;
    }

    let source;
    let fallbackId;
    let active = true;

    async function refresh(silent = false) {
      await loadRef.current({ silent });
    }

    void refresh(false);

    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      setConnectionState('polling');
      fallbackId = window.setInterval(() => {
        void refresh(true);
      }, fallbackIntervalMs);

      return () => {
        active = false;
        window.clearInterval(fallbackId);
      };
    }

    setConnectionState('connecting');
    source = new window.EventSource(url);

    source.addEventListener('ready', () => {
      if (!active) {
        return;
      }

      setConnectionState('live');
    });

    source.addEventListener('open', () => {
      if (!active) {
        return;
      }

      setConnectionState('live');
    });

    source.addEventListener('update', () => {
      void refresh(true);
    });

    source.addEventListener('error', () => {
      if (!active) {
        return;
      }

      setConnectionState('reconnecting');
      void refresh(true);
    });

    return () => {
      active = false;
      source.close();
    };
  }, [enabled, fallbackIntervalMs, url]);

  return connectionState;
}