import { supabase } from '~/src/lib/supabase';
import { EventDraft } from '~/src/types/draftTypes';

export class DraftService {
  private static instance: DraftService;

  static getInstance(): DraftService {
    if (!DraftService.instance) {
      DraftService.instance = new DraftService();
    }
    return DraftService.instance;
  }

  async saveDraft(draftData: Partial<EventDraft>): Promise<EventDraft> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const draftPayload = {
        ...draftData,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // Check if draft already exists for this user and item ID
      let existingDraft = null;
      
      if (draftData.location_id) {
        const { data: itemDraft } = await supabase
          .from('event_drafts')
          .select('*')
          .eq('user_id', user.id)
          .eq('location_id', draftData.location_id)
          .single();
        existingDraft = itemDraft;
      }

      let result;
      if (existingDraft) {
        // Update existing draft
        const { data, error } = await supabase
          .from('event_drafts')
          .update(draftPayload)
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('event_drafts')
          .insert({
            ...draftPayload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result as EventDraft;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  }

  async getDrafts(): Promise<EventDraft[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('event_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as EventDraft[];
    } catch (error) {
      console.error('Error fetching drafts:', error);
      throw error;
    }
  }

  async getDraft(draftId: string): Promise<EventDraft | null> {
    try {
      const { data, error } = await supabase
        .from('event_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }

      return data as EventDraft;
    } catch (error) {
      console.error('Error fetching draft:', error);
      throw error;
    }
  }

  async updateDraft(draftId: string, draftData: Partial<EventDraft>): Promise<EventDraft> {
    try {
      const { data, error } = await supabase
        .from('event_drafts')
        .update({
          ...draftData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .select()
        .single();

      if (error) throw error;
      return data as EventDraft;
    } catch (error) {
      console.error('Error updating draft:', error);
      throw error;
    }
  }

  async deleteDraft(draftId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }
  }

  async clearDraft(draftId: string): Promise<void> {
    // Same as delete for now, but could be different logic
    await this.deleteDraft(draftId);
  }

  // Helper method to convert form data to draft format
  convertFormDataToDraft(formData: any): Partial<EventDraft> {
    return {
      name: formData.name || '',
      description: formData.description || '',
      start_datetime: formData.startDate?.toISOString() || null,
      end_datetime: formData.endDate?.toISOString() || null,
      venue_name: formData.venueName || formData.locationName || '',
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      postal_code: formData.postalCode || formData.zip || '',
      location_id: formData.locationId || '',
      category_id: formData.categoryId || '',
      is_private: formData.isPrivate || false,
      external_url: formData.externalUrl || '',
      image_urls: formData.images?.map((img: any) => img.uri) || [],
      type: 'user_created',
    };
  }

  // Helper method to convert draft to form data
  convertDraftToFormData(draft: EventDraft): any {
    return {
      name: draft.name || '',
      description: draft.description || '',
      startDate: draft.start_datetime ? new Date(draft.start_datetime) : null,
      endDate: draft.end_datetime ? new Date(draft.end_datetime) : null,
      locationId: draft.location_id || '',
      locationName: draft.location_name || '',
      latitude: draft.latitude || 0,
      longitude: draft.longitude || 0,
      address: draft.address || '',
      categoryId: draft.category_id || '',
      categoryName: draft.category_name || '',
      isPrivate: draft.is_private || false,
      externalUrl: draft.external_url || '',
      images: draft.images?.map((uri: string) => ({
        uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      })) || [],
    };
  }
}

export const draftService = DraftService.getInstance();
