import { useEffect, useState } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";

interface User {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  event_location_preference: number;
  education:string;
  gender:string;
  occupation_id:string;
}

interface UserLoation {
  user_id: string;
  location: string;
  accuracy: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
}


interface UseUserReturn {
  user: User | null;
  userlocation: UserLoation | null;
  userHomeTownlocation:UserLoation | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateUserLocations: (updates: Partial<UserLoation>) => Promise<void>;
  updateHomeTownLocations: (updates: Partial<UserLoation>) => Promise<void>;
  userTopicsList:string |null;
}

export function useUser(): UseUserReturn {
  const { session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userTopicsList, setUserTopicsList] = useState<any | null>(null);
  const [allOcupationList, setAllOcupationList] = useState<any | null>(null);
  const [userlocation, setUserLocation] = useState<UserLoation | null>(null);
  const [userHomeTownlocation, setUserHomeTownLocation] = useState<UserLoation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user data
  const fetchUser = async () => {
    try {
      if (!session?.user?.id) {
        setUser(null);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      setUser(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLocation = async () => {
    try {
      if (!session?.user?.id) {
        setUserLocation(null);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      console.log("fetch_location>>",data);
      setUserLocation(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHomeTownLocation = async () => {
    try {
      if (!session?.user?.id) {
        setUserHomeTownLocation(null);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("user_hometown_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      console.log("fetchUserHomeTownLocation>>",data);
      setUserHomeTownLocation(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOcupations = async () => {
    try {
      if (!session?.user?.id) {
        setAllOcupationList(null);
        return;
      }
      console.log("fetchAllOcupations>>?");
      const { data, error: supabaseError } = await supabase
        .from("occupation")
        .select(`*`);
    

      if (supabaseError) throw supabaseError;
      console.log("fetchAllOcupations>>",data);
      setAllOcupationList(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTopics = async () => {
    if (!session?.user?.id) return;
  
    try {
      const { data, error } = await supabase
        .from("user_topics")
        .select("*") // or specify columns like 'topic'
        .eq("user_id", session?.user?.id);
  
      if (error) throw error;
  
      console.log("User topics:", data);
      const topics = data?.map(item => item.topic) || [];
      if(topics.length>0){
      setUserTopicsList(topics);
      }
      // Example: setUserTopics(data); if you're storing it in state
    } catch (error) {
      console.error("Error fetching user topics:", error);
    }
  };

  const fetchUserNew = async () => {
    try {
      if (!session?.user?.id) {
        setUser(null);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      return data;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
    }
  };
  

  // Refresh user data
  const refreshUser = async () => {
    setLoading(true);
    await fetchUser();
    // await fetchUserLocation();
  };

  // Update user data
  const updateUser = async (updates: Partial<User>) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const { error: supabaseError } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (supabaseError) throw supabaseError;

      // Refresh user data after update
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

  // Update userlocation data
  const updateUserLocations = async (updates: Partial<UserLoation>) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const { data: existingUser, error: fetchError } = await supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
  
    if (fetchError && fetchError.code !== 'PGRST116') {
      // 'PGRST116' = No rows found
      console.error('Error fetching user location:', fetchError)
      return { error: fetchError }
    }      

    let result
  if (existingUser) {
    console.log("existingUser>>");
    // Update existing record
    const { data, error } = await supabase
      .from('user_locations')
      .update({  ...updates,
        // updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)

    result = { data, error }
    console.log("data>>",data);
    console.log("error>>",error);
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('user_locations')
      .insert([
        {
          ...updates,
          user_id:session.user.id,
          // created_at: new Date().toISOString(),
        },
      ])

    result = { data, error }
  }

  return result

    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

  // Update Hometown location
  const updateHomeTownLocations = async (updates: Partial<UserLoation>) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const { data: existingUser, error: fetchError } = await supabase
      .from('user_hometown_locations')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
  
    if (fetchError && fetchError.code !== 'PGRST116') {
      // 'PGRST116' = No rows found
      console.error('Error fetching user location:', fetchError)
      return { error: fetchError }
    }      

    let result
  if (existingUser) {
    console.log("existingUser>>");
    // Update existing record
    const { data, error } = await supabase
      .from('user_hometown_locations')
      .update({  ...updates,
        // updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)

    result = { data, error }
    console.log("data>>",data);
    console.log("error>>",error);
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('user_hometown_locations')
      .insert([
        {
          ...updates,
          user_id:session.user.id,
          // created_at: new Date().toISOString(),
        },
      ])

    result = { data, error }
  }

  return result

    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

  // Subscribe to realtime changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel(`public:users:id=eq.${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setUser(payload.new as User);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchUser();
    fetchUserLocation();
    fetchUserHomeTownLocation();
    fetchAllOcupations();
    fetchUserTopics();
  }, [session?.user?.id]);

  return {
    user,
    userlocation,
    userHomeTownlocation,
    allOcupationList,
    loading,
    error,
    refreshUser,
    updateUser,
    updateUserLocations,
    updateHomeTownLocations,
    userTopicsList,
  };
}
