import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Premium haptic feedback service for Orbit app
 * Provides consistent haptic patterns across the app
 */

class HapticsService {
  private isEnabled: boolean = true;

  /**
   * Enable or disable haptics globally
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptics should be triggered
   */
  private shouldTrigger(): boolean {
    // Only trigger on iOS for best experience (Android haptics can be inconsistent)
    return this.isEnabled && Platform.OS === 'ios';
  }

  /**
   * STRONG HAPTICS - For major achievements/actions
   * Use for: Event creation, major accomplishments
   */
  async success() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * MEDIUM-STRONG HAPTICS - For important interactions
   * Use for: Joining events, following users, saving drafts
   */
  async impact() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * LIGHT HAPTICS - For navigation and browsing
   * Use for: Opening details, tab switches, card interactions
   */
  async light() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * SOFT HAPTICS - For subtle interactions
   * Use for: Button presses, selections, toggles
   */
  async selection() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * HEAVY HAPTICS - For critical actions
   * Use for: Deletions, errors, warnings
   */
  async heavy() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * ERROR HAPTICS - For errors and failed actions
   */
  async error() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * WARNING HAPTICS - For warnings and cautions
   */
  async warning() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * CELEBRATION PATTERN - For confetti moments
   * Creates a rhythmic pattern that matches confetti animation
   */
  async celebration() {
    if (!this.shouldTrigger()) return;
    try {
      // Strong initial burst
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Quick succession of lighter impacts
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 300);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * DEEPLINK ARRIVAL - For when user arrives via deep link
   * Subtle but noticeable to confirm action
   */
  async arrival() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }

  /**
   * SWIPE HAPTICS - For card swipes and gestures
   */
  async swipe() {
    if (!this.shouldTrigger()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics error:', error);
    }
  }
}

// Export singleton instance
export const haptics = new HapticsService();

