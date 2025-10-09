import { useState } from 'react';
import { supabase } from '~/src/lib/supabase';
import { useAuth } from '~/src/lib/auth';
import Toast from 'react-native-toast-message';

interface JoinEventParams {
  eventId: string;
  status: 'joined' | 'interested' | 'not_going';
  source?: 'supabase' | 'ticketmaster';
}

interface EventJoinRecord {
  event_id: string;
  user_id: string;
  status: string;
  source: string;
  joined_at?: string;
}

export function useJoinEvent() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Join, show interest, or leave an event
   */
  const updateEventStatus = async ({
    eventId,
    status,
    source = 'supabase',
  }: JoinEventParams): Promise<EventJoinRecord | null> => {
    if (!session?.user?.id) {
      Toast.show({
        type: 'error',
        text1: 'Sign In Required',
        text2: 'Please sign in to join events',
      });
      throw new Error('No user logged in');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user already has a join record for this event
      const { data: existingRecord, error: fetchError } = await supabase
        .from('event_joins')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let result: EventJoinRecord;

      // Prepare the data
      const joinData: Partial<EventJoinRecord> = {
        status,
        source,
        ...(status === 'joined' &&
          (!existingRecord || existingRecord.status !== 'joined') && {
            joined_at: new Date().toISOString(),
          }),
      };

      if (existingRecord) {
        // Update existing record
        const { data, error: updateError } = await supabase
          .from('event_joins')
          .update(joinData)
          .eq('event_id', eventId)
          .eq('user_id', session.user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        if (!data) throw new Error('Failed to update event join status');

        result = data as EventJoinRecord;
      } else {
        // Insert new record
        const { data, error: insertError } = await supabase
          .from('event_joins')
          .insert({
            event_id: eventId,
            user_id: session.user.id,
            ...joinData,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!data) throw new Error('Failed to create event join record');

        result = data as EventJoinRecord;
      }

      // Show success message
      if (status === 'joined') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Successfully joined event!',
        });
      } else if (status === 'interested') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Marked as interested',
        });
      } else if (status === 'not_going') {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Left event',
        });
      }

      return result;
    } catch (e) {
      const errorObj = e instanceof Error ? e : new Error('An error occurred');
      setError(errorObj);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorObj.message || 'Failed to update event status',
      });
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Join an event (shorthand for updateEventStatus with status='joined')
   */
  const joinEvent = async (
    eventId: string,
    source?: 'supabase' | 'ticketmaster'
  ) => {
    return updateEventStatus({ eventId, status: 'joined', source });
  };

  /**
   * Leave an event (shorthand for updateEventStatus with status='not_going')
   */
  const leaveEvent = async (
    eventId: string,
    source?: 'supabase' | 'ticketmaster'
  ) => {
    return updateEventStatus({ eventId, status: 'not_going', source });
  };

  /**
   * Mark interest in an event (shorthand for updateEventStatus with status='interested')
   */
  const markInterested = async (
    eventId: string,
    source?: 'supabase' | 'ticketmaster'
  ) => {
    return updateEventStatus({ eventId, status: 'interested', source });
  };

  /**
   * Auto-join user to event (called after creating event, no toast notification)
   */
  const autoJoinEvent = async (
    eventId: string,
    source?: 'supabase' | 'ticketmaster'
  ) => {
    if (!session?.user?.id) {
      console.warn('No user logged in for auto-join');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('event_joins')
        .insert({
          event_id: eventId,
          user_id: session.user.id,
          status: 'joined',
          source: source || 'supabase',
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to auto-join event:', insertError);
        return null;
      }

      return data as EventJoinRecord;
    } catch (e) {
      console.error('Auto-join error:', e);
      return null;
    }
  };

  return {
    updateEventStatus,
    joinEvent,
    leaveEvent,
    markInterested,
    autoJoinEvent,
    isLoading,
    error,
  };
}

