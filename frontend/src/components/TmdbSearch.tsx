import React, { useState } from "react";
import { Button, Input, List, Space, Typography, message } from "antd";
import type { TmdbItem } from "../types";
import { tmdbSearch } from "../api";

type Props = {
  enabled: boolean;
  onPick: (it: TmdbItem) => void;
};

export default function TmdbSearch({ enabled, onPick }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<TmdbItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function go() {
    if (!enabled) return;
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    try {
      const r = await tmdbSearch(query);
      setItems(r);
      if (r.length === 0) message.info("TMDB 无结果");
    } catch (e: any) {
      message.error(`TMDB 搜索失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Space>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={enabled ? "TMDB 搜索：剧名/电影名" : "TMDB 未启用（未设置 TMDB_API_KEY）"}
          disabled={!enabled}
          style={{ width: 260 }}
          onPressEnter={go}
        />
        <Button onClick={go} disabled={!enabled} loading={loading}>
          搜索
        </Button>
      </Space>

      <List
        size="small"
        bordered
        style={{ marginTop: 8, maxHeight: 180, overflow: "auto" }}
        dataSource={items}
        renderItem={(it) => (
          <List.Item onClick={() => onPick(it)} style={{ cursor: "pointer" }}>
            <Typography.Text>
              [{it.media_type}] {it.title} ({it.year || "?"}) id={it.tmdb_id}
            </Typography.Text>
          </List.Item>
        )}
      />
    </div>
  );
}