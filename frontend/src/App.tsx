import React, { useEffect, useMemo, useState } from "react";
import { Layout, Typography, message, Space, Divider } from "antd";
import type { ApiConfig, LinkPlan } from "./types";
import { getConfig } from "./api";

import FileBrowser from "./components/FileBrowser";
import SelectedList from "./components/SelectedList";
import Planner from "./components/Planner";

const { Header, Content } = Layout;

export default function App() {
  const [cfg, setCfg] = useState<ApiConfig | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [plans, setPlans] = useState<LinkPlan[]>([]);

  useEffect(() => {
    getConfig()
      .then(setCfg)
      .catch((e) => message.error(`读取后端配置失败: ${e.message}`));
  }, []);

  const browseRoot = useMemo(() => cfg?.browse_roots?.[0] ?? "/data", [cfg]);

  return (
    <Layout className="app">
      <Header style={{ background: "#fff", padding: "0 12px" }}>
        <Space align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            Media Organizer (Web)
          </Typography.Title>
          <Typography.Text type="secondary">
            浏览根目录: {browseRoot} ｜ TMDB: {cfg?.tmdb_enabled ? "ON" : "OFF"}
          </Typography.Text>
        </Space>
      </Header>

      <Content style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, height: "calc(100vh - 120px)" }}>
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, overflow: "hidden" }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>文件浏览</Typography.Title>
            <FileBrowser
              root={browseRoot}
              onAddSelected={(paths) => {
                setSelectedFiles((prev) => {
                  const s = new Set(prev);
                  for (const p of paths) s.add(p);
                  return Array.from(s);
                });
              }}
            />
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, overflow: "auto" }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>已选文件</Typography.Title>
            <SelectedList
              selectedFiles={selectedFiles}
              onRemove={(p) => setSelectedFiles((prev) => prev.filter((x) => x !== p))}
              onClear={() => setSelectedFiles([])}
            />

            <Divider />

            {cfg && (
              <Planner
                cfg={cfg}
                selectedFiles={selectedFiles}
                onPlans={setPlans}
                plans={plans}
                onAfterApply={() => {
                  // 你也可以选择保留 selectedFiles
                  // setSelectedFiles([]);
                }}
              />
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
}