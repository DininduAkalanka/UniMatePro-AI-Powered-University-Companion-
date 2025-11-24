/**
 * ChatBubble Component - Modern AI Chat Interface
 * Inspired by ChatGPT, Claude, Gemini designs
 * Optimized for university students with clear, readable responses
 */

import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/config';

export interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
  avatar?: string;
  onLongPress?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  timestamp,
  isTyping = false,
  avatar,
  onLongPress,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMessageContent = () => {
    if (isTyping) {
      return <TypingIndicator />;
    }

    // Enhanced markdown rendering with better formatting
    const renderFormattedText = () => {
      // Split by code blocks first
      const codeBlockRegex = /```([\s\S]*?)```/g;
      const parts = message.split(codeBlockRegex);
      
      return parts.map((part, index) => {
        // Code block (every odd index after split)
        if (index % 2 === 1) {
          return (
            <View key={index} style={styles.codeBlock}>
              <Text style={styles.codeBlockText}>{part.trim()}</Text>
            </View>
          );
        }

        // Regular text with inline markdown
        const inlineParts = part.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|(?:^|\n)(?:•|-|\d+\.)\s+.*$)/gm);
        
        return (
          <Text key={index} style={[styles.messageText, isUser && styles.messageTextUser]}>
            {inlineParts.map((inlinePart, i) => {
              // Bold
              if (inlinePart.startsWith('**') && inlinePart.endsWith('**')) {
                return (
                  <Text key={i} style={styles.boldText}>
                    {inlinePart.slice(2, -2)}
                  </Text>
                );
              }
              // Italic
              else if (inlinePart.startsWith('*') && inlinePart.endsWith('*')) {
                return (
                  <Text key={i} style={styles.italicText}>
                    {inlinePart.slice(1, -1)}
                  </Text>
                );
              }
              // Inline code
              else if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
                return (
                  <Text key={i} style={styles.inlineCode}>
                    {inlinePart.slice(1, -1)}
                  </Text>
                );
              }
              // List items
              else if (/^(?:•|-|\d+\.)\s+/.test(inlinePart.trim())) {
                return (
                  <Text key={i} style={styles.listItem}>
                    {'\n'}{inlinePart.trim()}
                  </Text>
                );
              }
              return inlinePart;
            })}
          </Text>
        );
      });
    };

    return renderFormattedText();
  };

  if (isUser) {
    // User message - Clean, modern bubble
    return (
      <Animated.View
        style={[
          styles.container,
          styles.userContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.userBubble}>
          <Text style={styles.userMessageText}>{message}</Text>
        </View>
        <Text style={styles.userTimestamp}>{formatTime(timestamp)}</Text>
      </Animated.View>
    );
  }

  // AI message - Card-style with actions (ChatGPT/Claude style)
  return (
    <Animated.View
      style={[
        styles.container,
        styles.aiContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.aiCard}>
        {/* AI Avatar */}
        <View style={styles.aiHeader}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color="#8B5CF6" />
          </View>
          <Text style={styles.aiLabel}>UniMate AI</Text>
          <Text style={styles.aiTimestamp}>{formatTime(timestamp)}</Text>
        </View>

        {/* Message Content */}
        <View style={styles.aiContent}>
          {renderMessageContent()}
        </View>

        {/* Action Bar */}
        {!isTyping && (
          <View style={styles.actionBar}>
            <Pressable 
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              onPress={handleCopy}
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={16} 
                color={copied ? "#10B981" : "#6B7280"} 
              />
              <Text style={[styles.actionText, copied && styles.actionTextSuccess]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="refresh-outline" size={16} color="#6B7280" />
              <Text style={styles.actionText}>Regenerate</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
};
// Typing indicator component
const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = Animated.parallel([
      animate(dot1, 0),
      animate(dot2, 150),
      animate(dot3, 300),
    ]);

    animations.start();

    return () => animations.stop();
  }, []);

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  // Layout containers
  container: {
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'stretch',
    maxWidth: '85%',
  },

  // User message styles (Clean bubble - WhatsApp/iMessage inspired)
  userBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  userTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginRight: 4,
  },

  // AI message styles (Card design - ChatGPT/Claude inspired)
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  aiTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  aiContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  // Message text formatting
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
    letterSpacing: 0.1,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  listItem: {
    marginLeft: 8,
    lineHeight: 24,
  },

  // Code styling (GitHub/VSCode inspired)
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    backgroundColor: '#F3F4F6',
    color: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  codeBlock: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  codeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: '#E5E7EB',
  },

  // Action bar (ChatGPT inspired)
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  actionButtonPressed: {
    backgroundColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionTextSuccess: {
    color: '#10B981',
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
});
