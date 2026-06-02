import { ScrollView, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { BookingCard } from "../../src/components/cards/BookingCard";
import { useBookings } from "../../src/context/BookingsContext";
import { BookingStatus } from "../../src/types";

export default function HandymanPastJobs() {
    const { colors } = useTheme();
    const router = useRouter();
    const { bookings } = useBookings();
    const HANDYMAN_ID = 'h1';

    const myBookings = bookings.filter((booking) => booking.handymanId === HANDYMAN_ID);

    const historyBookings = myBookings.filter(
        (booking) => booking.status === BookingStatus.Completed ||
            booking.status === BookingStatus.Paid ||
            booking.status === BookingStatus.Cancelled,
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
                            <BookingCard key={booking.id} booking={booking} userType="handyman" onPress={() => {}} />
                            ))}
                        </View>
                    ) : null}  
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}