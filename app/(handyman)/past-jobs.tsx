import { Navbar } from "@/components/navigation/Navbar";
import { ScrollView, View } from "react-native";
import { BookingCard } from "../../src/components/cards/BookingCard";
import { useBookings } from "../../src/context/BookingsContext";
import { BookingStatus } from "../../src/types";

export default function HandymanPastJobs() {
    const { bookings } = useBookings();
    const HANDYMAN_ID = 'h1';

    const myBookings = bookings.filter((booking) => booking.handymanId === HANDYMAN_ID);

    const historyBookings = myBookings.filter(
        (booking) => booking.status === BookingStatus.Completed ||
            booking.status === BookingStatus.Paid ||
            booking.status === BookingStatus.Cancelled,
    )

    return (
        <View className="flex-1 bg-gray-50">
            <Navbar title="Past Jobs" showBack={true} />
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {historyBookings.length > 0 ? (
                    <View>
                        {historyBookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} userType="handyman" onPress={() => {}} />
                        ))}
                    </View>
                ) : null}  
            </ScrollView>
        </View>
    )
}