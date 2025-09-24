import { supabase } from "~/src/lib/supabase";

export interface Prompt {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  location_id: string | null;
  category_id: string;
}

/**
 * Fetch prompts for a specific category
 * @param categoryId - The ID of the category to fetch prompts for
 * @returns Promise<Prompt[]> - Array of prompts for the category
 */
export async function fetchPromptsByCategory(categoryId: string): Promise<Prompt[]> {
  try {
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching prompts:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch prompts by category:", error);
    return [];
  }
}

/**
 * Fetch prompts for multiple categories
 * @param categoryIds - Array of category IDs to fetch prompts for
 * @returns Promise<Prompt[]> - Array of prompts for all categories
 */
export async function fetchPromptsByCategories(categoryIds: string[]): Promise<Prompt[]> {
  try {
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .in("category_id", categoryIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching prompts for categories:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch prompts by categories:", error);
    return [];
  }
}
