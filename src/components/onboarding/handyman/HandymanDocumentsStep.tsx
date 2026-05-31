import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../context/ThemeContext';
import { DOCUMENT_OPTIONS, type DocumentId, type UploadState } from './shared';

interface DocumentsStepProps {
  uploads: Partial<Record<DocumentId, UploadState>>;
  onUpload: (documentId: DocumentId) => void;
}

export function HandymanDocumentsStep({ uploads, onUpload }: DocumentsStepProps) {
  const { colors } = useTheme();

  return (
    <View className="gap-3">
      <Card>
        <Text className="font-heading text-lg" style={{ color: colors.ui.text }}>
          KYC documents
        </Text>
        <Text className="mt-1 text-[12px]" style={{ color: colors.ui.textMuted }}>
          Upload clear images so the admin team can verify your identity and service area.
        </Text>
      </Card>

      {DOCUMENT_OPTIONS.map((document) => {
        const upload = uploads[document.id];
        const isComplete = upload?.progress === 100;
        const isImage = upload?.mimeType?.startsWith('image/') ?? false;

        return (
          <Card key={document.id} className="gap-3">
            <View className="flex-row items-start gap-3">
              <View
                className="h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: isComplete ? colors.primary['50'] : colors.ui.background }}>
                <Ionicons
                  name={document.icon}
                  size={20}
                  color={isComplete ? colors.primary['600'] : colors.ui.textMuted}
                />
              </View>

              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                      {document.title}
                    </Text>
                    <Text className="mt-1 text-[12px]" style={{ color: colors.ui.textMuted }}>
                      {document.subtitle}
                    </Text>
                  </View>
                  <Badge variant={isComplete ? 'success' : 'warning'} text={isComplete ? 'Ready' : 'Required'} />
                </View>

                <View className="mt-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3">
                  {upload ? (
                    <View className="gap-2">
                      <View className="flex-row items-center gap-3">
                        {isImage ? (
                          <Image source={{ uri: upload.uri }} className="h-14 w-14 rounded-2xl" resizeMode="cover" />
                        ) : (
                          <View
                            className="h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: colors.primary['100'] }}>
                            <Ionicons name="document-text-outline" size={22} color={colors.primary['600']} />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                            {upload.fileName}
                          </Text>
                          <Text className="mt-1 text-[11px]" style={{ color: colors.ui.textMuted }}>
                            {isComplete ? 'Preview ready for admin review.' : 'Uploading securely...'}
                          </Text>
                        </View>
                      </View>

                      <View className="gap-1">
                        <View className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <View
                            className="h-full rounded-full"
                            style={{ width: `${upload.progress}%`, backgroundColor: colors.primary['600'] }}
                          />
                        </View>
                        <Text className="text-[11px]" style={{ color: colors.ui.textMuted }}>
                          Upload progress: {upload.progress}%
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="gap-2">
                      <Text className="text-[12px]" style={{ color: colors.ui.textMuted }}>
                        Pick a JPG, PNG, or PDF from your device for this requirement.
                      </Text>
                      <Text className="text-[11px]" style={{ color: colors.ui.textLight }}>
                        Expected format: JPG, PNG, or PDF up to 5 MB.
                      </Text>
                    </View>
                  )}
                </View>

                <Pressable
                  onPress={() => onUpload(document.id)}
                  accessibilityLabel={`Upload ${document.title}`}
                  android_ripple={{ color: `${colors.primary['600']}14` }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
                  className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3">
                  <Ionicons
                    name={isComplete ? 'refresh-outline' : 'cloud-upload-outline'}
                    size={16}
                    color={colors.primary['600']}
                  />
                  <Text className="text-[12px] font-semibold" style={{ color: colors.primary['600'] }}>
                    {isComplete ? 'Replace file' : 'Choose file'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}