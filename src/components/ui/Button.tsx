import { TouchableOpacity, Text, ActivityIndicator, View, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;

  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',

  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();

  // Define dynamic style objects using theme colors
  const variantStyles = {
    primary: {
      backgroundColor: colors.primary['600'],
      borderColor: colors.primary['600'],
      borderWidth: 1,
    },
    secondary: {
      backgroundColor: colors.secondary['500'],
      borderColor: colors.secondary['500'],
      borderWidth: 1,
    },
    tertiary: {
      backgroundColor: 'transparent',
      borderColor: colors.primary['600'],
      borderWidth: 1,
    },
    danger: {
      backgroundColor: '#EF4444',
      borderColor: '#EF4444',
      borderWidth: 1,
    },
  };

  const textColors = {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    tertiary: colors.primary['600'],
    danger: '#FFFFFF',
  };

  // Determine container styling
  const buttonStyle: ViewStyle = disabled
    ? {
        backgroundColor: colors.ui.border,
        borderColor: colors.ui.border,
        borderWidth: 1,
        opacity: 0.5,
      }
    : variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center justify-center rounded-full px-3 py-1.5 ${!fullWidth ? 'self-auto' : ''}`}
      style={[
        fullWidth ? { width: '100%', alignSelf: 'stretch' } : null,
        buttonStyle,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'tertiary' ? colors.primary['600'] : '#FFFFFF'}
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            className="text-[13px] font-semibold tracking-wide"
            style={[{ color: textColors[variant] }, textStyle]}>
            {label}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
