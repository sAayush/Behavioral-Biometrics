'use client';

import { useEffect, useRef } from 'react';
import { wsManager } from '@/lib/websocket';
import type { BehavioralEvent } from '@/lib/websocket';
import { useEvents } from '@/contexts/EventContext';

const BATCH_INTERVAL_MS = 2000; // 2 seconds
const MAX_BATCH_SIZE = 20;

export function GlobalEventListener() {
  const { getEventBatch, addEvent } = useEvents();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Function to send batched events
    const sendBatch = () => {
      const events = getEventBatch();
      if (events.length > 0 && wsManager.isConnected()) {
        wsManager.sendEvents(events);
        // Clear events after sending (we'll need to track this differently)
        // For now, we'll keep events in the batch for prediction
      }
    };

    // Set up interval to send batches every 2 seconds
    intervalRef.current = setInterval(sendBatch, BATCH_INTERVAL_MS);

    // Event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const event: BehavioralEvent = {
        type: 'mousemove',
        timestamp: Date.now(),
        x: e.clientX,
        y: e.clientY,
      };
      addEvent(event);

      // Send immediately if batch is full
      const events = getEventBatch();
      if (events.length >= MAX_BATCH_SIZE) {
        sendBatch();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const event: BehavioralEvent = {
        type: 'keydown',
        timestamp: Date.now(),
        key: e.key,
        target: (e.target as HTMLElement)?.tagName || 'unknown',
      };
      addEvent(event);

      // Send immediately if batch is full
      const events = getEventBatch();
      if (events.length >= MAX_BATCH_SIZE) {
        sendBatch();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const event: BehavioralEvent = {
        type: 'click',
        timestamp: Date.now(),
        x: e.clientX,
        y: e.clientY,
        target: (e.target as HTMLElement)?.tagName || 'unknown',
      };
      addEvent(event);

      // Send immediately if batch is full
      const events = getEventBatch();
      if (events.length >= MAX_BATCH_SIZE) {
        sendBatch();
      }
    };

    // Attach event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Send any remaining events before cleanup
      sendBatch();
    };
  }, [getEventBatch, addEvent]);

  // This component doesn't render anything
  return null;
}

