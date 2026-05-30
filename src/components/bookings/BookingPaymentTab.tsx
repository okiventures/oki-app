import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BookingDetail } from '../../mocks/bookingDetails';
import { Button } from '../ui/Button';

interface BookingPaymentTabProps {
  booking: BookingDetail;
  onPayNowPress?: () => void;
  onReceiptPress?: () => void;
}

import { formatDate, SectionLabel } from './BookingShared';

const PAYMENT_ICONS: Record<string, string> = {
  GCash: 'phone-portrait-outline',
  'Credit Card': 'card-outline',
  Cash: 'cash-outline',
  Maya: 'wallet-outline',
};

function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}>
      {children}
    </View>
  );
}

function Divider() {
  return <View className="my-1 h-px bg-gray-100" />;
}

export function BookingPaymentTab({
  booking,
  onPayNowPress,
  onReceiptPress,
}: BookingPaymentTabProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary['600'];
  const primaryLight = colors.primary['100'];

  return (
    <View className="gap-5">
      <CardContainer>
        <View
          className="items-center rounded-t-2xl px-6 py-6"
          style={{
            backgroundColor:
              booking.paymentStatus === 'Paid'
                ? '#ECFDF5'
                : booking.paymentStatus === 'Refunded'
                  ? '#FFF7ED'
                  : booking.paymentStatus === 'Failed'
                    ? '#FEF2F2'
                    : `${primaryColor}08`,
          }}>
          <View
            className="mb-3 h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                booking.paymentStatus === 'Paid'
                  ? '#D1FAE5'
                  : booking.paymentStatus === 'Refunded'
                    ? '#FED7AA'
                    : booking.paymentStatus === 'Failed'
                      ? '#FEE2E2'
                      : primaryLight,
            }}>
            <Ionicons
              name={
                booking.paymentStatus === 'Paid'
                  ? 'checkmark-circle'
                  : booking.paymentStatus === 'Refunded'
                    ? 'return-up-back'
                    : booking.paymentStatus === 'Failed'
                      ? 'close-circle'
                      : 'hourglass-outline'
              }
              size={28}
              color={
                booking.paymentStatus === 'Paid'
                  ? '#059669'
                  : booking.paymentStatus === 'Refunded'
                    ? '#D97706'
                    : booking.paymentStatus === 'Failed'
                      ? '#DC2626'
                      : primaryColor
              }
            />
          </View>
          <Text className="text-[22px] font-bold" style={{ color: colors.ui.text }}>
            ₱{booking.amount.toLocaleString()}
          </Text>
          <Text className="mt-1 text-[13px] font-medium" style={{ color: colors.ui.textMuted }}>
            {booking.paymentStatus === 'Paid'
              ? 'Payment Complete'
              : booking.paymentStatus === 'Refunded'
                ? 'Amount Refunded'
                : booking.paymentStatus === 'Failed'
                  ? 'Payment Failed'
                  : 'Payment Pending'}
          </Text>
          {booking.paidAt && (
            <Text className="mt-0.5 text-[11px]" style={{ color: colors.ui.textMuted }}>
              {formatDate(booking.paidAt)}
            </Text>
          )}
        </View>

        <View className="border-t border-gray-100 px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${primaryColor}12` }}>
              <Ionicons
                name={(PAYMENT_ICONS[booking.paymentMethod] ?? 'card-outline') as any}
                size={17}
                color={primaryColor}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                {booking.paymentMethod}
              </Text>
              {booking.paymentRef && (
                <Text className="text-[11px]" style={{ color: colors.ui.textMuted }}>
                  Ref: {booking.paymentRef}
                </Text>
              )}
            </View>
            <View
              className="rounded-full px-2.5 py-0.5"
              style={{
                backgroundColor: booking.paymentStatus === 'Paid' ? '#ECFDF5' : `${primaryColor}12`,
              }}>
              <Text
                className="text-[10px] font-semibold"
                style={{
                  color: booking.paymentStatus === 'Paid' ? '#059669' : primaryColor,
                }}>
                {booking.paymentStatus}
              </Text>
            </View>
          </View>
        </View>
      </CardContainer>

      <View>
        <SectionLabel label="Order Breakdown" />
        <CardContainer>
          <View className="px-4">
            {booking.orderDetails.map((row, idx) => {
              const isTotal = idx === booking.orderDetails.length - 1;
              return (
                <React.Fragment key={row.label}>
                  <View className="flex-row items-center justify-between py-3">
                    <Text
                      className={`text-[13px] ${isTotal ? 'font-bold' : 'font-normal'}`}
                      style={{ color: isTotal ? colors.ui.text : colors.ui.textMuted }}>
                      {row.label}
                    </Text>
                    <Text
                      className={`text-[13px] ${isTotal ? 'font-bold' : 'font-semibold'}`}
                      style={{ color: isTotal ? primaryColor : colors.ui.text }}>
                      {row.value}
                    </Text>
                  </View>
                  {!isTotal && <Divider />}
                </React.Fragment>
              );
            })}
          </View>
        </CardContainer>
      </View>

      <View
        className="flex-row gap-3 rounded-2xl px-4 py-3.5"
        style={{
          backgroundColor: `${primaryColor}08`,
          borderWidth: 1,
          borderColor: `${primaryColor}18`,
        }}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={primaryColor}
          style={{ marginTop: 1 }}
        />
        <Text className="flex-1 text-[12px] leading-[18px]" style={{ color: colors.ui.textMuted }}>
          A{' '}
          <Text className="font-semibold" style={{ color: colors.ui.text }}>
            5% platform fee
          </Text>{' '}
          is applied to support OKI's secure payment processing and worker vetting program.
        </Text>
      </View>

      {booking.paymentStatus === 'Pending' && (
        <Button
          label="Pay Now"
          variant="primary"
          fullWidth
          onPress={onPayNowPress || (() => {})}
          leftIcon={<Ionicons name="lock-closed-outline" size={14} color="#FFF" />}
        />
      )}
      {booking.paymentStatus === 'Paid' && (
        <Button
          label="Download Receipt"
          variant="tertiary"
          fullWidth
          onPress={onReceiptPress || (() => {})}
          leftIcon={<Ionicons name="download-outline" size={14} color={primaryColor} />}
        />
      )}
    </View>
  );
}
