import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { HandymanWallet, PayoutRequestStage, WalletTransactionEntry } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface WalletSectionProps {
  wallet: HandymanWallet;
  onRequestPayout?: () => void;
}

const PAYOUT_STAGES: PayoutRequestStage[] = ['Requested', 'Processing', 'Paid'];

function getPayoutBadgeVariant(stage: PayoutRequestStage): 'primary' | 'warning' | 'success' {
  if (stage === 'Paid') {
    return 'success';
  }

  if (stage === 'Processing') {
    return 'warning';
  }

  return 'primary';
}

function getTransactionIcon(type: WalletTransactionEntry['type']): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  if (type === 'Credit') {
    return {
      name: 'arrow-down-outline',
      color: '#15803D',
      bg: 'bg-green-100',
    };
  }

  return {
    name: 'arrow-up-outline',
    color: '#B91C1C',
    bg: 'bg-red-100',
  };
}

export function WalletSection({ wallet, onRequestPayout }: WalletSectionProps) {
  const isPayoutEligible = wallet.availableBalance >= wallet.minimumPayoutThreshold;
  const shortfall = Math.max(wallet.minimumPayoutThreshold - wallet.availableBalance, 0);
  const activeStageIndex = PAYOUT_STAGES.findIndex((stage) => stage === wallet.payoutStage);

  return (
    <View className="mb-4 gap-4">
      <Card className="bg-gray-900 p-4">
        <Text className="text-[12px] font-medium uppercase tracking-[0.8px] text-gray-400">Wallet</Text>
        <Text className="font-heading mt-2 text-3xl text-black">{formatCurrency(wallet.availableBalance)}</Text>
        <Text className="mt-1 text-[12px] text-gray-900">Available balance</Text>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-xl bg-white/10 px-3 py-3">
            <Text className="text-[11px] uppercase tracking-[0.8px] text-gray-900">Available</Text>
            <Text className="mt-1 text-[15px] font-bold text-black">{formatCurrency(wallet.availableBalance)}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 px-3 py-3">
            <Text className="text-[11px] uppercase tracking-[0.8px] text-gray-900">Pending</Text>
            <Text className="mt-1 text-[15px] font-bold text-black">{formatCurrency(wallet.pendingBalance)}</Text>
          </View>
        </View>

        <View className="mt-4 gap-2">
          <Button
            label="Request Payout"
            onPress={onRequestPayout ?? (() => {})}
            fullWidth
            disabled={!isPayoutEligible}
          />
          {isPayoutEligible ? (
            <Text className="text-center text-[11px] text-gray-300">
              You can request payout now. Minimum threshold is {formatCurrency(wallet.minimumPayoutThreshold)}.
            </Text>
          ) : (
            <Text className="text-center text-[11px] text-amber-300">
              Add {formatCurrency(shortfall)} more to meet the minimum payout threshold.
            </Text>
          )}
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-bold text-gray-900">Transaction History</Text>
          <Text className="text-[11px] font-medium text-gray-500">Latest entries</Text>
        </View>

        <View className="mt-3 gap-3">
          {wallet.transactions.map((entry) => {
            const icon = getTransactionIcon(entry.type);
            const amountPrefix = entry.type === 'Credit' ? '+' : '-';
            const amountColor = entry.type === 'Credit' ? 'text-green-700' : 'text-red-700';

            return (
              <View key={entry.id} className="flex-row items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3">
                <View className={`h-10 w-10 items-center justify-center rounded-full ${icon.bg}`}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                </View>

                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-gray-900">{entry.description}</Text>
                  <Text className="mt-0.5 text-[11px] text-gray-500">{entry.bookingReference} · {formatDate(entry.createdAt)}</Text>
                </View>

                <Text className={`text-[13px] font-bold ${amountColor}`}>
                  {amountPrefix}{formatCurrency(entry.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-bold text-gray-900">Payout Status</Text>
          <Badge variant={getPayoutBadgeVariant(wallet.payoutStage)} text={wallet.payoutStage} />
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          {PAYOUT_STAGES.map((stage, index) => {
            const isCompleted = index < activeStageIndex;
            const isCurrent = index === activeStageIndex;
            const isFuture = index > activeStageIndex;

            return (
              <React.Fragment key={stage}>
                <View className="items-center">
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full border ${
                      isCompleted || isCurrent
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-300 bg-gray-100'
                    }`}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text className={`text-[11px] font-bold ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    className={`mt-2 text-[11px] font-semibold ${
                      isFuture ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                    {stage}
                  </Text>
                </View>

                {index < PAYOUT_STAGES.length - 1 ? (
                  <View
                    className={`mx-2 mb-6 h-[2px] flex-1 ${
                      index < activeStageIndex ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      </Card>
    </View>
  );
}
