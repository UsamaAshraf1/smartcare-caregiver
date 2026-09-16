/** Labelled text field on the design's `#F4F5FA` fill — subset of the patient app's forms.tsx. */
import React from 'react';
import { View, Text, TextInput, StyleProp, ViewStyle, TextInputProps } from 'react-native';
import { Icon, IconName } from './Icon';
import { colors, t } from '../theme';

export function Field({
  label,
  icon,
  trailing,
  style,
  ...input
}: {
  label?: string;
  icon?: IconName;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
} & TextInputProps) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {!!label && <Text style={t(13.5, 700, colors.textBody)}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.fill, borderRadius: 14, paddingHorizontal: 16, height: 56 }}>
        {icon && <Icon name={icon} size={18} color={colors.textMuted} strokeWidth={1.8} />}
        <TextInput placeholderTextColor={colors.textFaint} style={[t(16, 400, colors.text), { flex: 1, height: 56 }]} {...input} />
        {trailing}
      </View>
    </View>
  );
}
