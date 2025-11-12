'use client';

import React, { createContext, useContext, useRef, ReactNode } from 'react';
import type { BehavioralEvent } from '@/lib/websocket';

interface EventContextType {
  getEventBatch: () => BehavioralEvent[];
  getLastEvents: (count: number) => BehavioralEvent[];
  addEvent: (event: BehavioralEvent) => void;
  clearSentEvents: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

// Keep a rolling buffer of recent events (last 100 events for prediction)
const MAX_EVENT_BUFFER = 100;

export function EventProvider({ children }: { children: ReactNode }) {
  const eventBatchRef = useRef<BehavioralEvent[]>([]);

  const getEventBatch = (): BehavioralEvent[] => {
    return [...eventBatchRef.current];
  };

  const getLastEvents = (count: number): BehavioralEvent[] => {
    return eventBatchRef.current.slice(-count);
  };

  const addEvent = (event: BehavioralEvent) => {
    eventBatchRef.current.push(event);
    // Keep only the last MAX_EVENT_BUFFER events
    if (eventBatchRef.current.length > MAX_EVENT_BUFFER) {
      eventBatchRef.current = eventBatchRef.current.slice(-MAX_EVENT_BUFFER);
    }
  };

  const clearSentEvents = () => {
    // Don't clear all events - we want to keep recent ones for prediction
    // Instead, we'll just keep the buffer size managed by addEvent
  };

  return (
    <EventContext.Provider value={{ getEventBatch, getLastEvents, addEvent, clearSentEvents }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}

