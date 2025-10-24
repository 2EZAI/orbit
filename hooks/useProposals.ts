import { useCallback, useState } from "react";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";
export interface IProposal {
  id: string;
  created_at: string;
  title: string;
  start_datetime: string;
  end_datetime: string | null;
  events_attached: IEventAttach[];
  user_id: string;
}

interface IEventAttach {
  id: string;
  name: string;
  type: string;
}
interface ICreateProposal {
  title: string;
  start_datetime: string;
  events_attached: IEventAttach[];
}
export function useProposals() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<IProposal[]>([]);
  const getAllProposals = useCallback(async () => {
    // Guard when no authenticated user
    const userId = session?.user?.id;
    if (!userId) {
      setProposals([]);
      setLoading(false);
      return [] as IProposal[];
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("user_id", userId)
        .order("last_modified_at", { ascending: true });

      if (error) {
        console.log("Error fetching proposals:", error);
        setProposals([]);
      }

      setProposals((data as IProposal[]) || []);
      return (data as unknown as IProposal[]) || [];
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setProposals([]);
      return [] as IProposal[];
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);
  const addProposal = useCallback(
    async (data: ICreateProposal): Promise<IProposal | null> => {
      const userId = session?.user?.id;
      if (!userId) {
        console.warn("addProposal called without authenticated user");
        return null;
      }

      setLoading(true);
      try {
        const insertData = {
          user_id: userId,
          title: data.title,
          start_datetime: data.start_datetime,
          events_attached: data.events_attached ?? [],
          created_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
        };

        const { data: inserted, error } = await supabase
          .from("proposals")
          .insert(insertData)
          .select("*")
          .single();

        if (error) throw error;

        const proposal = inserted as IProposal;
        setProposals((prev) => [proposal, ...prev]);
        return proposal;
      } catch (err) {
        console.error("Error adding proposal:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [session?.user?.id]
  );

  const addEventToProposal = useCallback(
    async (
      proposalId: string,
      event: IEventAttach
    ): Promise<IProposal | null> => {
      const userId = session?.user?.id;
      if (!userId) {
        console.warn("addEventToProposal called without authenticated user");
        return null;
      }

      setLoading(true);
      try {
        // Fetch current events_attached for the proposal (scoped to current user)
        const { data: current, error: selectError } = await supabase
          .from("proposals")
          .select("id, events_attached")
          .eq("id", proposalId)
          .eq("user_id", userId)
          .single();

        if (selectError) throw selectError;
        const currentEvents: IEventAttach[] =
          (current?.events_attached as IEventAttach[]) || [];

        // Avoid duplicate by id
        const alreadyExists = currentEvents.some((e) => e.id === event.id);
        const updatedEvents = alreadyExists
          ? currentEvents
          : [...currentEvents, event];

        const { data: updated, error: updateError } = await supabase
          .from("proposals")
          .update({
            events_attached: updatedEvents,
            last_modified_at: new Date().toISOString(),
          })
          .eq("id", proposalId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (updateError) throw updateError;

        const updatedProposal = updated as IProposal;
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? updatedProposal : p))
        );
        return updatedProposal;
      } catch (err) {
        console.error("Error adding event to proposal:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [session?.user?.id]
  );

  return {
    proposals,
    loading,
    getAllProposals,
    addProposal,
    addEventToProposal,
  };
}
