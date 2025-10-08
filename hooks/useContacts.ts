import { useState } from "react";
import * as Contacts from "expo-contacts";
import { supabase } from "~/src/lib/supabase";
import { User } from "./useUserData";

export default function useContacts() {
  const [loading, setLoading] = useState(true);
  const fetchAllContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        console.log(JSON.stringify(data, null, 2));
        return data;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  };
  const fetchAllSuggestions = async (): Promise<User[]> => {
    setLoading(true);
    try {
      const contacts = await fetchAllContacts();
      if (contacts.length === 0) return [];
      const phoneNumbers = contacts
        .map((contact) => contact.phoneNumbers || [])
        .flat()
        .map((phone) => phone.digits);
      const uniquePhoneNumbers = Array.from(new Set(phoneNumbers));

      // Fetch users from Supabase whose phone_number matches any unique contact number
      // Assumes users table has a 'phone_number' column
      if (uniquePhoneNumbers.length === 0) return [];

      const { data: matchedUsers, error } = await supabase
        .from("users")
        .select("*")
        .in("phone", uniquePhoneNumbers);

      if (error) {
        console.error("Error fetching users by phone number:", error);
        return [] as User[];
      }
      console.log("Matched users from contacts:", matchedUsers);
      return matchedUsers || ([] as User[]);
    } catch (e) {
      console.error("Error in fetchAllSuggestions:", e);
      return [] as User[];
    } finally {
      setLoading(false);
    }
  };
  return { fetchAllContacts, fetchAllSuggestions, loading };
}
