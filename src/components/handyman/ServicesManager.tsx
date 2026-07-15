import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { HandymanServiceRow, ServiceCatalogItem } from '../../services/profileService';

interface ServicesManagerProps {
  services: HandymanServiceRow[];
  catalog: ServiceCatalogItem[];
  onAdd: (serviceId: string, priceOverride?: number | null) => Promise<void>;
  onUpdatePrice: (serviceId: string, priceOverride: number | null) => Promise<void>;
  onRemove: (serviceId: string) => Promise<void>;
}

export function ServicesManager({
  services,
  catalog,
  onAdd,
  onUpdatePrice,
  onRemove,
}: ServicesManagerProps) {
  const { colors } = useTheme();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [removingServiceId, setRemovingServiceId] = useState<string | null>(null);
  const [selectedCatalogName, setSelectedCatalogName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addedServiceIds = useMemo(() => new Set(services.map((s) => s.service_id)), [services]);
  const availableCatalog = useMemo(
    () => catalog.filter((c) => !addedServiceIds.has(c.id)),
    [catalog, addedServiceIds]
  );

  const editingRow = services.find((s) => s.service_id === editingServiceId) ?? null;

  const openAddModal = () => {
    setSelectedCatalogName('');
    setPriceInput('');
    setAddModalVisible(true);
  };

  const handleAdd = async () => {
    const catalogItem = availableCatalog.find((c) => c.name === selectedCatalogName);
    if (!catalogItem) return;
    setIsSaving(true);
    try {
      const parsed = parseFloat(priceInput);
      await onAdd(catalogItem.id, priceInput && !isNaN(parsed) ? parsed : null);
      setAddModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (row: HandymanServiceRow) => {
    setEditingServiceId(row.service_id);
    setPriceInput(row.price_override != null ? String(row.price_override) : '');
  };

  const handleUpdatePrice = async () => {
    if (!editingServiceId) return;
    setIsSaving(true);
    try {
      const parsed = parseFloat(priceInput);
      await onUpdatePrice(editingServiceId, priceInput && !isNaN(parsed) ? parsed : null);
      setEditingServiceId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removingServiceId) return;
    setIsSaving(true);
    try {
      await onRemove(removingServiceId);
      setRemovingServiceId(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-base text-gray-900">Services & Pricing</Text>
        <Button
          label="Add Service"
          variant="tertiary"
          onPress={openAddModal}
          leftIcon={<Ionicons name="add" size={15} color={colors.primary['600']} />}
        />
      </View>

      {services.length === 0 ? (
        <Card>
          <Text className="text-[13px] text-gray-500">
            You haven&apos;t added any services yet. Add one to start appearing in client search.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {services.map((row) => (
            <Card key={row.service_id} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <View className="flex-row items-center gap-2">
                  <Badge variant="primary" text={row.service.category} />
                  <Text className="text-[14px] font-semibold text-gray-900">
                    {row.service.name}
                  </Text>
                </View>
                <Text className="mt-1 text-[13px] text-gray-500">
                  ₱{row.price_override ?? row.service.base_rate}
                  {row.price_override != null ? ' (custom)' : ' (base rate)'}
                </Text>
              </View>
              <View className="flex-row gap-1">
                <IconButton
                  icon={<Ionicons name="pencil" size={16} color={colors.primary['600']} />}
                  onPress={() => openEditModal(row)}
                  accessibilityLabel={`Edit price for ${row.service.name}`}
                />
                <IconButton
                  icon={<Ionicons name="trash-outline" size={16} color="#EF4444" />}
                  onPress={() => setRemovingServiceId(row.service_id)}
                  accessibilityLabel={`Remove ${row.service.name}`}
                  danger
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      <Modal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        title="Add a Service">
        <View className="gap-3">
          <Dropdown
            label="Service"
            items={availableCatalog.map((c) => c.name)}
            selected={selectedCatalogName}
            onSelect={setSelectedCatalogName}
            placeholder="Select a service"
          />
          <Input
            label="Custom Price (optional)"
            placeholder="Leave blank to use base rate"
            keyboardType="numeric"
            value={priceInput}
            onChangeText={setPriceInput}
          />
          <Button
            label="Add Service"
            onPress={handleAdd}
            disabled={!selectedCatalogName}
            loading={isSaving}
            fullWidth
          />
        </View>
      </Modal>

      <Modal
        visible={editingRow !== null}
        onClose={() => setEditingServiceId(null)}
        title={editingRow ? `Edit Price — ${editingRow.service.name}` : ''}>
        <View className="gap-3">
          <Input
            label="Custom Price (optional)"
            placeholder="Leave blank to use base rate"
            keyboardType="numeric"
            value={priceInput}
            onChangeText={setPriceInput}
          />
          <Button label="Save" onPress={handleUpdatePrice} loading={isSaving} fullWidth />
        </View>
      </Modal>

      <ConfirmDialog
        visible={removingServiceId !== null}
        title="Remove Service"
        message="Clients will no longer find you for this service category. You can add it back anytime."
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemovingServiceId(null)}
        danger
        loading={isSaving}
      />
    </View>
  );
}
