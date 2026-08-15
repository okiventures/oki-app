import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { useBookings } from '../../src/context/BookingsContext';
import { useAuth } from '../../src/context/AuthContext';
import { isMockEnv } from '../../src/services/bookingService';
import { BookingStatus } from '../../src/types';

// Offline demo only: MOCK_BOOKINGS are keyed to this handyman. Matches the
// fallback in requests.tsx and schedule.tsx.
const DEMO_HANDYMAN_ID = 'h1';

export default function HandymanPastJobs() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bookings } = useBookings();
  const { session } = useAuth();

  // This was a bare `const HANDYMAN_ID = 'h1'` with no session fallback, so
  // against a live backend every real handyman's Past Jobs was empty.
  const handymanId = session?.user?.id ?? (isMockEnv() ? DEMO_HANDYMAN_ID : '');

  const myBookings = bookings.filter((booking) => booking.handymanId === handymanId);

  const historyBookings = myBookings.filter(
    (booking) =>
      booking.status === BookingStatus.Completed ||
      booking.status === BookingStatus.Paid ||
      booking.status === BookingStatus.Cancelled ||
      booking.status === BookingStatus.Rejected
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Past Jobs" showBack={true} onBackPress={() => router.back()} />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="mt-5 flex-1 rounded-xl"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          {historyBookings.length > 0 ? (
            <View>
              {historyBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  userType="handyman"
                  onPress={() => router.push(`/booking/${booking.id}?role=handyman`)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
