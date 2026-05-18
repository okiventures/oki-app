import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { JobCard } from '../../src/components/cards/JobCard';
import { MOCK_AVAILABLE_JOBS } from '../../src/mocks';

export default function HandymanRequests() {
  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Incoming Requests" />
      <FlatList
        data={MOCK_AVAILABLE_JOBS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-[13px] text-gray-500 mb-3 px-1">
            These jobs have been matched to you based on your active status and skills.
          </Text>
        }
        renderItem={({ item }) => (
          <JobCard 
            job={item} 
            onAccept={() => console.log('Accepted', item.id)} 
            onDecline={() => console.log('Declined', item.id)}
            expanded={true} 
          />
        )}
      />
    </View>
  );
}
