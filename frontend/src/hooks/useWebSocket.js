// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

const DEFAULT_WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/alerts`;
const WS_URL = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;
const isHostedFrontend = window.location.hostname.endsWith('vercel.app');
const shouldDisableDefaultWsOnHosted = !import.meta.env.VITE_WS_URL && isHostedFrontend;

export default function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const disableNoticeShown = useRef(false);
  const { setWsConnected, addLiveAlerts, incrementAlertCount } = useStore();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'new_alerts' && msg.data?.length) {
            addLiveAlerts(msg.data);
            incrementAlertCount(msg.data.length);
          }
        } catch (e) {
          console.warn('[WS] Parse error', e);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting in 5s...');
        setWsConnected(false);
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.warn('[WS] Error', err);
        ws.close();
      };
    } catch (e) {
      console.warn('[WS] Connection failed, retrying...', e);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [setWsConnected, addLiveAlerts, incrementAlertCount]);

  useEffect(() => {
    if (shouldDisableDefaultWsOnHosted) {
      setWsConnected(false);
      if (!disableNoticeShown.current) {
        disableNoticeShown.current = true;
      }
      return undefined;
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, setWsConnected]);

  return wsRef;
}
