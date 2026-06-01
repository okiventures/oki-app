import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type DropdownVariant = 'default' | 'inline';

interface AnchorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DropdownProps {
  label?: string;
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
  variant?: DropdownVariant;
  placeholder?: string;
}

export function Dropdown({
  label,
  items,
  selected,
  onSelect,
  variant = 'default',
  placeholder = 'Select...',
}: DropdownProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<AnchorPosition | null>(null);
  const triggerRef = useRef<View>(null);

  const displayValue = selected || placeholder;
  const maxListHeight = screenHeight * 0.3;

  const openDropdown = () => {
    triggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setAnchor({ x: pageX, y: pageY, width, height });
      setVisible(true);
    });
  };

  const listStyle = anchor
    ? {
        position: 'absolute' as const,
        top: anchor.y + anchor.height + 4,
        left: anchor.x,
        minWidth: Math.max(anchor.width, 160),
      }
    : {};

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        {variant === 'inline' ? (
          <TouchableOpacity onPress={openDropdown} className="flex-row items-center gap-1">
            <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
              {displayValue}
            </Text>
            <Ionicons name="chevron-down" size={13} color={colors.ui.textMuted} />
          </TouchableOpacity>
        ) : (
          <View>
            {label ? (
              <Text
                className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: colors.ui.textMuted }}>
                {label}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={openDropdown}
              className="flex-row items-center justify-between rounded-xl border px-3.5 py-3"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
              <Text
                className="text-[14px] font-medium"
                style={{ color: selected ? colors.ui.text : colors.ui.textMuted }}>
                {displayValue}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.ui.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={() => setVisible(false)}>
          <View
            style={[
              listStyle,
              {
                backgroundColor: colors.ui.surface,
                borderRadius: 16,
                maxHeight: maxListHeight,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 8,
                overflow: 'hidden',
              },
            ]}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {items.map((item) => {
                const isSelected = item === selected;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => {
                      onSelect(item);
                      setVisible(false);
                    }}
                    className="flex-row items-center justify-between px-5 py-3"
                    style={{
                      backgroundColor: isSelected ? colors.primary['50'] : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.ui.border,
                    }}>
                    <Text
                      className="text-[14px] font-medium"
                      style={{ color: isSelected ? colors.primary['700'] : colors.ui.text }}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={colors.primary['600']} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
