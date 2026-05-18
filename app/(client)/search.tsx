import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { MapPlaceholder } from '../../src/components/features/MapPlaceholder';
import { JobCard } from '../../src/components/cards/JobCard';
import { MOCK_AVAILABLE_JOBS } from '../../src/mocks';

export default function ClientSearch() {
  const [query, setQuery] = useState('');

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Discover" />
      <View className="px-4 py-3 bg-white shadow-sm z-10">
        <SearchBar value={query} onChangeText={setQuery} onFilterPress={() => {}} />
      </View>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <MapPlaceholder height={250} />
        
        <View className="mt-6 mb-2">
          {MOCK_AVAILABLE_JOBS.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onAccept={() => {}} 
              onDecline={() => {}} 
              expanded={false}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
