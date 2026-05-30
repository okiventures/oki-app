import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';

import { DashboardHeader } from '../../src/components/home/DashboardHeader';
import { GreetingBlock } from '../../src/components/home/GreetingBlock';

import { ActiveBookingCard } from '../../src/components/cards/ActiveBookingCard';
import { CategoryGrid } from '../../src/components/home/CategoryGrid';
import { QuickBookCards } from '../../src/components/home/QuickBookCards';
import { PromoCard } from '../../src/components/home/PromoCard';
import { RecentActivity } from '../../src/components/home/RecentActivity';

import {
  MOCK_CLIENT,
  MOCK_ACTIVE_BOOKING,
  MOCK_DASHBOARD_CATEGORIES,
  MOCK_QUICK_BOOK_MODES,
  MOCK_PROMO,
  MOCK_RECENT_ACTIVITY_ROWS,
} from '../../src/mocks';

export default function ClientHome() {
  const { colors } = useTheme();
  const [searchText, setSearchText] = useState('');

  const filteredCategories = searchText
    ? MOCK_DASHBOARD_CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : MOCK_DASHBOARD_CATEGORIES;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.primary['600'] }}>
      <DashboardHeader
        city={MOCK_CLIENT.location}
        userName={MOCK_CLIENT.name}
        userPhotoUrl={MOCK_CLIENT.photoUrl}
        unreadCount={3}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.ui.background }}>
        <GreetingBlock
          userName={MOCK_CLIENT.name}
          searchValue={searchText}
          onSearchChange={setSearchText}
        />

        {MOCK_ACTIVE_BOOKING && (
          <ActiveBookingCard booking={MOCK_ACTIVE_BOOKING} onTrackPress={() => {}} />
        )}

        <CategoryGrid categories={filteredCategories} />

        <QuickBookCards modes={MOCK_QUICK_BOOK_MODES} />

        <PromoCard promo={MOCK_PROMO} />

        <RecentActivity rows={MOCK_RECENT_ACTIVITY_ROWS} />
      </ScrollView>
    </SafeAreaView>
  );
}
