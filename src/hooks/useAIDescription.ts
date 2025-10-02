import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type {
  AIDescriptionRequest,
  AIDescriptionResponse,
  AIDescriptionState,
  AIRefineRequest,
} from '~/src/types/aiDescriptionTypes';
import { useUser } from '~/src/lib/UserProvider';
import { supabase } from '~/src/lib/supabase';

const API_BASE_URL = 'https://orbit-web-backend.onrender.com';

export const useAIDescription = () => {
  const { user } = useUser();
  const [state, setState] = useState<AIDescriptionState>({
    isGenerating: false,
    isRefining: false,
    generatedDescription: '',
    isTyping: false,
    currentText: '',
    error: null,
    suggestions: [],
  });

  // Typewriter effect function
  const typeText = useCallback((text: string, onComplete?: () => void) => {
    setState((prev) => ({ ...prev, isTyping: true, currentText: '' }));

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setState((prev) => ({
          ...prev,
          currentText: text.substring(0, index + 1),
        }));
        index++;
      } else {
        clearInterval(interval);
        setState((prev) => ({ ...prev, isTyping: false }));
        if (onComplete) onComplete();
      }
    }, 20); // Adjust speed here (lower = faster)
  }, []);

  const generateDescription = useCallback(
    async (request: AIDescriptionRequest) => {
      setState((prev) => ({
        ...prev,
        isGenerating: true,
        error: null,
        generatedDescription: '',
        currentText: '',
        suggestions: [],
      }));

      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error('❌ [AI Description] No session token available');
          throw new Error('Authentication required');
        }

        console.log(
          '🔍 [AI Description] Generating description with token:',
          session.access_token.substring(0, 20) + '...',
        );
        console.log('🔍 [AI Description] API URL:', API_BASE_URL);
        console.log('🔍 [AI Description] Request payload:', request);

        const response = await fetch(
          `${API_BASE_URL}/api/event-descriptions/generate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(request),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate description');
        }

        const data: AIDescriptionResponse = await response.json();

        if (data.success) {
          setState((prev) => ({
            ...prev,
            generatedDescription: data.description,
            suggestions: data.suggestions,
          }));

          // Start typewriter effect
          typeText(data.description, () => {
            setState((prev) => ({ ...prev, isGenerating: false }));
            Alert.alert('Success', 'AI description generated successfully!');
          });
        } else {
          throw new Error('Failed to generate description');
        }
      } catch (error) {
        console.error('Error generating AI description:', error);
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        }));
        Alert.alert('Error', 'Failed to generate AI description');
      }
    },
    [typeText, user?.id],
  );

  const refineDescription = useCallback(
    async (request: AIRefineRequest) => {
      setState((prev) => ({
        ...prev,
        isRefining: true,
        error: null,
        currentText: '',
      }));

      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error(
            '❌ [AI Description] No session token available for refinement',
          );
          throw new Error('Authentication required');
        }

        console.log(
          '🔍 [AI Description] Refining description with token:',
          session.access_token.substring(0, 20) + '...',
        );

        const response = await fetch(
          `${API_BASE_URL}/api/event-descriptions/refine`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(request),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to refine description');
        }

        const data: AIDescriptionResponse = await response.json();

        if (data.success) {
          setState((prev) => ({
            ...prev,
            generatedDescription: data.description,
            suggestions: data.suggestions,
          }));

          // Start typewriter effect
          typeText(data.description, () => {
            setState((prev) => ({ ...prev, isRefining: false }));
            Alert.alert('Success', 'AI description refined successfully!');
          });
        } else {
          throw new Error('Failed to refine description');
        }
      } catch (error) {
        console.error('Error refining AI description:', error);
        setState((prev) => ({
          ...prev,
          isRefining: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        }));
        Alert.alert('Error', 'Failed to refine AI description');
      }
    },
    [typeText, user?.id],
  );

  const clearDescription = useCallback(() => {
    setState({
      isGenerating: false,
      isRefining: false,
      generatedDescription: '',
      isTyping: false,
      currentText: '',
      error: null,
      suggestions: [],
    });
  }, []);

  const stopTyping = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTyping: false,
      currentText: prev.generatedDescription,
    }));
  }, []);

  return {
    ...state,
    generateDescription,
    refineDescription,
    clearDescription,
    stopTyping,
  };
};
