import React, { useCallback } from 'react';
import { View } from 'react-native';
import { VirtualizedList } from 'react-native-virtualized-list';
import MessageBubble from './MessageBubble';

const VirtualizedMessageList = ({ 
  messages,
  onRetry,
  onEndReached,
  refreshing,
  onRefresh
}) => {
  const getItem = (data, index) => data[index];
  const getItemCount = (data) => data.length;
  const keyExtractor = (item) => item._id;

  const getItemLayout = useCallback((data, index) => ({
    length: 100, // ประมาณความสูงเฉลี่ยของแต่ละข้อความ
    offset: 100 * index,
    index,
  }), []);

  const renderItem = useCallback(({ item, index }) => {
    const isLastInGroup = index === 0 || 
      messages[index - 1]?.user_id._id !== item.user_id._id;

    return (
      <MessageBubble
        message={item}
        onRetry={() => onRetry(item._id)}
        isLastInGroup={isLastInGroup}
      />
    );
  }, [messages, onRetry]);

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-8">
      <Text className="text-gray-500">
        ยังไม่มีข้อความ
      </Text>
    </View>
  );

  return (
    <VirtualizedList
      data={messages}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      getItem={getItem}
      getItemCount={getItemCount}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      inverted
      refreshing={refreshing}
      onRefresh={onRefresh}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10
      }}
    />
  );
};

export default React.memo(VirtualizedMessageList);