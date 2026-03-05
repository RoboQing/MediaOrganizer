import React from "react";
import { Button, List, Space, Typography } from "antd";

type Props = {
  selectedFiles: string[];
  onRemove: (p: string) => void;
  onClear: () => void;
};

export default function SelectedList({ selectedFiles, onRemove, onClear }: Props) {
  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary">共 {selectedFiles.length} 个</Typography.Text>
        <Button danger size="small" onClick={onClear} disabled={selectedFiles.length === 0}>
          清空
        </Button>
      </Space>

      <List
        size="small"
        bordered
        dataSource={[...selectedFiles].sort((a, b) => a.localeCompare(b))}
        style={{ maxHeight: 240, overflow: "auto" }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button size="small" onClick={() => onRemove(item)} key="rm">
                移除
              </Button>,
            ]}
          >
            <Typography.Text className="mono">{item}</Typography.Text>
          </List.Item>
        )}
      />
    </div>
  );
}