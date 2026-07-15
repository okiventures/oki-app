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

type PriceResult = { ok: true; value: number | null } | { ok: false; message: string };

// Empty input means "use the catalog base rate" (null). Anything else must be a
// finite, non-negative number — the DB enforces price_override >= 0, so reject
// bad values here for immediate feedback instead of a round-trip failure.
function parsePrice(raw: string): PriceResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { ok: false, message: 'Enter a valid number' };
  if (parsed < 0) return { ok: false, message: 'Price cannot be negative' };
  return { ok: true, value: parsed };
}

function messageFrom(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
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
  const [priceError, setPriceError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addedServiceIds = useMemo(() => new Set(services.map((s) => s.service_id)), [services]);
  const availableCatalog = useMemo(
    () => catalog.filter((c) => !addedServiceIds.has(c.id)),
    [catalog, addedServiceIds]
  );

  const editingRow = services.find((s) => s.service_id === editingServiceId) ?? null;

  const resetForm = () => {
    setSelectedCatalogName('');
    setPriceInput('');
    setPriceError(null);
    setActionError(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    resetForm();
  };

  const handleAdd = async () => {
    const catalogItem = availableCatalog.find((c) => c.name === selectedCatalogName);
    if (!catalogItem) return;
    const price = parsePrice(priceInput);
    if (!price.ok) {
      setPriceError(price.message);
      return;
    }
    setActionError(null);
    setIsSaving(true);
    try {
      await onAdd(catalogItem.id, price.value);
      closeAddModal();
    } catch (err) {
      setActionError(messageFrom(err, 'Failed to add service. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (row: HandymanServiceRow) => {
    setEditingServiceId(row.service_id);
    setPriceInput(row.price_override != null ? String(row.price_override) : '');
    setPriceError(null);
    setActionError(null);
  };

  const closeEditModal = () => {
    setEditingServiceId(null);
    setPriceInput('');
    setPriceError(null);
    setActionError(null);
  };

  const handleUpdatePrice = async () => {
    if (!editingServiceId) return;
    const price = parsePrice(priceInput);
    if (!price.ok) {
      setPriceError(price.message);
      return;
    }
    setActionError(null);
    setIsSaving(true);
    try {
      await onUpdatePrice(editingServiceId, price.value);
      closeEditModal();
    } catch (err) {
      setActionError(messageFrom(err, 'Failed to update price. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removingServiceId) return;
    setActionError(null);
    setIsSaving(true);
    try {
      await onRemove(removingServiceId);
      setRemovingServiceId(null);
    } catch (err) {
      setActionError(messageFrom(err, 'Failed to remove service. Please try again.'));
      setRemovingServiceId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const onPriceChange = (text: string) => {
    setPriceInput(text);
    if (priceError) setPriceError(null);
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

      {/* Remove failures have no modal to land in, so surface them here. */}
      {actionError && !addModalVisible && editingRow === null ? (
        <Text className="mb-2 text-[13px] text-red-500">{actionError}</Text>
      ) : null}

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

      <Modal visible={addModalVisible} onClose={closeAddModal} title="Add a Service">
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
            onChangeText={onPriceChange}
            error={priceError ?? undefined}
          />
          {actionError ? <Text className="text-[13px] text-red-500">{actionError}</Text> : null}
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
        onClose={closeEditModal}
        title={editingRow ? `Edit Price — ${editingRow.service.name}` : ''}>
        <View className="gap-3">
          <Input
            label="Custom Price (optional)"
            placeholder="Leave blank to use base rate"
            keyboardType="numeric"
            value={priceInput}
            onChangeText={onPriceChange}
            error={priceError ?? undefined}
          />
          {actionError ? <Text className="text-[13px] text-red-500">{actionError}</Text> : null}
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
