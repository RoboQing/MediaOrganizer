import React from "react";
import { Drawer, List, Typography } from "antd";
import type { LinkPlan } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  plans: LinkPlan[];
};

export default function PreviewDrawer({ open, onClose, plans }: Props) {
  return (
    <Drawer title={`预览计划（${plans.length}）`} open={open} onClose={onClose} width={720}>
      <List
        size="small"
        bordered
        dataSource={plans}
        renderItem={(p) => (
          <List.Item>
            <div style={{ width: "100%" }}>
              <Typography.Text className="mono">{p.src}</Typography.Text>
              <div style={{ margin: "6px 0" }}>→</div>
              <Typography.Text className="mono">{p.dst}</Typography.Text>
            </div>
          </List.Item>
        )}
      />
    </Drawer>
  );
}