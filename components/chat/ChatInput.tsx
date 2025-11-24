/**
 * ChatInput Component - Modern AI Chat Input
 * Inspired by ChatGPT, Claude, Gemini input designs
 * Features: Auto-resize, smooth animations, keyboard-safe
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { COLORS } from '../../constants/config';

export interface ChatInputProps {
  onSend: (message: string) => void;
  onAttachImage?: () => void;
  onAttachDocument?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onAttachImage,
  onAttachDocument,
  placeholder = 'Ask me anything...',
  disabled = false,
  isLoading = false,
}) => {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(42);
  const inputRef = useRef<TextInput>(null);
  const sendButtonScale = useRef(new Animated.Value(0.8)).current;
  const sendButtonRotate = useRef(new Animated.Value(0)).current;

  const handleTextChange = (value: string) => {
    setText(value);
    
    // Animate send button
    Animated.parallel([
      Animated.spring(sendButtonScale, {
        toValue: value.trim().length > 0 ? 1 : 0.8,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(sendButtonRotate, {
        toValue: value.trim().length > 0 ? 1 : 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSend = () => {
    if (text.trim().length === 0 || disabled || isLoading) return;

    const message = text.trim();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setText('');
    setInputHeight(42);
    
    // Reset animations
    Animated.parallel([
      Animated.spring(sendButtonScale, {
        toValue: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonRotate, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    onSend(message);
    Keyboard.dismiss();
  };

  const handleContentSizeChange = (event: any) => {
    const height = event.nativeEvent.contentSize.height;
    // Max 5 lines (approximately 110px)
    setInputHeight(Math.min(Math.max(42, height), 110));
  };

  const rotateInterpolate = sendButtonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const canSend = text.trim().length > 0 && !disabled && !isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Main Input Container */}
        <View style={[styles.inputContainer, { minHeight: inputHeight + 8 }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { height: inputHeight }]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={handleTextChange}
            onContentSizeChange={handleContentSizeChange}
            multiline
            maxLength={2000}
            editable={!disabled && !isLoading}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            accessible={true}
            accessibilityLabel="Message input"
            accessibilityHint="Type your message to UniMate AI"
          />
          
          {/* Character count (only show when getting close to limit) */}
          {text.length > 1800 && (
            <Text style={styles.charCount}>{2000 - text.length}</Text>
          )}
        </View>

        {/* Send Button */}
        <Animated.View
          style={[
            styles.sendButtonContainer,
            {
              transform: [
                { scale: sendButtonScale },
                { rotate: rotateInterpolate },
              ],
              opacity: canSend ? 1 : 0.5,
            },
          ]}
        >
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              canSend && styles.sendButtonActive,
              pressed && styles.sendButtonPressed,
            ]}
          >
            {isLoading ? (
              <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1F2937',
    paddingVertical: 8,
    maxHeight: 110,
  },
  charCount: {
    position: 'absolute',
    right: 12,
    bottom: 4,
    fontSize: 11,
    color: '#9CA3AF',
  },
  sendButtonContainer: {
    marginBottom: 4,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
});
