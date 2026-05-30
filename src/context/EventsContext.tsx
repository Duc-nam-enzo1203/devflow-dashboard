import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

interface DBEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  type: string;
  description: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EventsContextType {
  events: DBEvent[];
  isLoading: boolean;
  refreshEvents: () => Promise<void>;
  addEvent: (event: Omit<DBEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<DBEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch events:', error);
      return;
    }
    setEvents(data || []);
  };

  useEffect(() => {
    fetchEvents().finally(() => setIsLoading(false));
  }, []);

  const refreshEvents = async () => {
    setIsLoading(true);
    await fetchEvents();
    setIsLoading(false);
  };

  const addEvent = async (event: Omit<DBEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    setEvents(prev => [...prev, data]);
  };

  const updateEvent = async (id: string, updates: Partial<DBEvent>) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setEvents(prev => prev.map(e => (e.id === id ? data : e)));
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <EventsContext.Provider
      value={{ events, isLoading, refreshEvents, addEvent, updateEvent, deleteEvent }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
