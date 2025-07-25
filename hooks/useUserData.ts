import { useEffect, useState } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  otherUser:User | null;
  userlocation: UserLoation | null;
  userHomeTownlocation:UserLoation | null;
  otherUserHomeTownlocation:UserLoation | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateUserLocations: (updates: Partial<UserLoation>) => Promise<void>;
  updateHomeTownLocations: (updates: Partial<UserLoation>) => Promise<void>;
  userTopicsList:string |null;
  otherUserTopicsList:string |null;
  fetchOherUserTopics: (userId: string) => Promise<void>;
  fetchOtherUserHomeTownLocation: (userId: string) => Promise<void>;
  fetchOtherUser: (userId: string) => Promise<void>;
}

export function useUser(): UseUserReturn {
  const { session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [userTopicsList, setUserTopicsList] = useState<any | null>(null);
  const [otherUserTopicsList, setOtherUserTopicsList] = useState<any | null>(null);
  const [allOcupationList, setAllOcupationList] = useState<any | null>(null);
  const [userlocation, setUserLocation] = useState<UserLoation | null>(null);
  const [userHomeTownlocation, setUserHomeTownLocation] = useState<UserLoation | null>(null);
  const [otherUserHomeTownlocation, setOtherUserHomeTownlocation] = useState<UserLoation | null>(null);

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
      storeData('userData',data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const storeData = async (key:string,data:any) => {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);
      console.log('User data saved');
    } catch (e) {
      console.error('Error saving location', e);
    }
  };

  const getUserData = async (key:string) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Error reading data', e);
      return null;
    }
  };

  const fetchUserLocation = async () => {
    try {
      if (!session?.user?.id) {
        setUserLocation(null);
        return;
      }
      // console.log("fetchUserLocation>>",session?.user?.id);
      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      // console.log("fetch_location>>",data);
      setUserLocation(data);
      storeData('userLocation',data);
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
      // console.log("fetchUserHomeTownLocation>>",data);
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
      // console.log("fetchAllOcupations>>",data);
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
  
      // console.log("User topics:", data);
      const topics = data?.map(item => item.topic) || [];
      if(topics.length>0){
      setUserTopicsList(topics);
      }
      // Example: setUserTopics(data); if you're storing it in state
    } catch (error) {
      console.error("Error fetching user topics:", error);
    }
  };

 // Fetch OtherUser data
 const fetchOtherUser = async (userId:string) => {
  try {
    if (!userId) {
      setOtherUser(null);
      return;
    }

    const { data, error: supabaseError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (supabaseError) throw supabaseError;
    setOtherUser(data);
  } catch (e) {
    setError(e instanceof Error ? e : new Error("An error occurred"));
  } finally {
    setLoading(false);
  }
};

  const fetchOherUserTopics = async (userId:any) => {
    if (!userId) return;
    // console.log("userId>",userId);
    try {
      const { data, error } = await supabase
        .from("user_topics")
        .select("*") // or specify columns like 'topic'
        .eq("user_id", userId);
  
      if (error) throw error;
  
      // console.log("userId topics:", data);
      const topics = data?.map(item => item.topic) || [];
      if(topics.length>0){
        setOtherUserTopicsList(topics);
        return topics;
      }
      else{
        return [];
      }
      // Example: setUserTopics(data); if you're storing it in state
    } catch (error) {
      console.error("Error fetching user topics:", error);
    }
  };

  const fetchOtherUserHomeTownLocation = async (userId:any) => {
    try {
      if (!userId) {
        setOtherUserHomeTownlocation(null);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("user_hometown_locations")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (supabaseError) throw supabaseError;
      // console.log("fetchOtherUserHomeTownLocation>>",data);
      setOtherUserHomeTownlocation(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    } finally {
      setLoading(false);
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
      // console.error("updateUserLocations:>>>");
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
    // console.log("session.user.id>>>",session.user.id);
    // console.log("existingUser:>>>",existingUser);
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
    // console.log("data>>",data);
    // console.log("error>>",error);
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
  await fetchUser();
  await fetchUserLocation();
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
    // console.log("data>>",data);
    // console.log("error>>",error);
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
    otherUser,
    userlocation,
    userHomeTownlocation,
    otherUserHomeTownlocation,
    allOcupationList,
    loading,
    error,
    refreshUser,
    updateUser,
    updateUserLocations,
    updateHomeTownLocations,
    userTopicsList,
    otherUserTopicsList,
    fetchOherUserTopics,
    fetchOtherUserHomeTownLocation,
    fetchOtherUser,
    getUserData,
  };
}
