import { useEffect, useState } from 'react';
import { supabase } from '~/src/lib/supabase';
import { useAuth } from '~/src/lib/auth';

interface UseEventJoinStatusResult {
  isJoined: boolean;
  isCreator: boolean;
  joinStatus: 'joined' | 'interested' | 'not_going' | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useEventJoinStatus(
  eventId: string | undefined,
  createdBy: string | undefined
): UseEventJoinStatusResult {
  const { session } = useAuth();
  const [isJoined, setIsJoined] = useState(false);
  const [joinStatus, setJoinStatus] = useState<
    'joined' | 'interested' | 'not_going' | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const isCreator = !!(
    session?.user?.id &&
    createdBy &&
    session.user.id === createdBy
  );

  const fetchJoinStatus = async () => {
    if (!eventId || !session?.user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('event_joins')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching join status:', error);
        setIsJoined(false);
        setJoinStatus(null);
      } else if (data) {
        setJoinStatus(data.status as 'joined' | 'interested' | 'not_going');
        setIsJoined(data.status === 'joined');
      } else {
        setIsJoined(false);
        setJoinStatus(null);
      }
    } catch (error) {
      console.error('Error in fetchJoinStatus:', error);
      setIsJoined(false);
      setJoinStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJoinStatus();
  }, [eventId, session?.user?.id]);

  return {
    isJoined,
    isCreator,
    joinStatus,
    isLoading,
    refetch: fetchJoinStatus,
  };
}

