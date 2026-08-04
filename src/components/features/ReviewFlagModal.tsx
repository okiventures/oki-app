import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { RatingDisplay } from '../ui/RatingDisplay';
import { Review } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface ReviewFlagModalProps {
  visible: boolean;
  review: Review | null;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const QUICK_REASONS = ['Spam or fake', 'Inappropriate content', 'Wrong rating', 'Harassment'];

export function ReviewFlagModal({
  visible,
  review,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: ReviewFlagModalProps) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');

  const reset = () => {
    setReason('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (reason.trim().length === 0 || submitting) return;
    onSubmit(reason.trim());
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Flag review">
      {review && (
        <View className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-gray-900">{review.reviewerName}</Text>
            <RatingDisplay rating={review.rating} showCount={false} size="sm" />
          </View>
          {review.comment ? (
            <Text className="text-[12px] leading-5 text-gray-600">{review.comment}</Text>
          ) : null}
        </View>
      )}

      <Text className="mb-2 text-[13px] font-semibold" style={{ color: colors.ui.textMuted }}>
        Why are you flagging this review?
      </Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {QUICK_REASONS.map((r) => (
          <View
            key={r}
            className={`rounded-full border px-3 py-1.5 ${
              reason === r ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white'
            }`}>
            <Text
              onPress={() => setReason(r)}
              className={`text-[12px] font-medium ${
                reason === r ? 'text-primary-700' : 'text-gray-600'
              }`}>
              {r}
            </Text>
          </View>
        ))}
      </View>

      <Input
        label="Reason (optional if you picked one above)"
        placeholder="Describe the issue"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
        containerClassName="mb-4"
      />

      {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

      <View className="gap-2.5">
        <Button
          label="Submit flag"
          variant="danger"
          fullWidth
          loading={submitting}
          disabled={reason.trim().length === 0}
          onPress={handleSubmit}
        />
        <Button label="Cancel" variant="tertiary" fullWidth onPress={handleClose} />
      </View>
    </Modal>
  );
}
