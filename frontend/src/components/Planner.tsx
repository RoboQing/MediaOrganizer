import React, { useMemo, useState } from "react";
import { Button, Divider, Form, Input, InputNumber, Radio, Select, Space, Typography, message } from "antd";
import type { ApiConfig, LinkPlan, TmdbItem } from "../types";
import { applyPlan, buildPlan } from "../api";
import TmdbSearch from "./TmdbSearch";
import PreviewDrawer from "./PreviewDrawer";

type Props = {
  cfg: ApiConfig;
  selectedFiles: string[];
  plans: LinkPlan[];
  onPlans: (p: LinkPlan[]) => void;
  onAfterApply: () => void;
};

export default function Planner({ cfg, selectedFiles, plans, onPlans, onAfterApply }: Props) {
  const [mode, setMode] = useState<"tv" | "movie">("tv");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const [form] = Form.useForm();

  const outputOptions = useMemo(
    () => cfg.output_roots.map((x) => ({ label: x, value: x })),
    [cfg.output_roots]
  );

  function onPickTmdb(it: TmdbItem) {
    form.setFieldsValue({
      title: it.title,
      year: it.year,
      tmdb_id: String(it.tmdb_id),
    });
    setMode(it.media_type === "tv" ? "tv" : "movie");
  }

  async function doPreview() {
    if (selectedFiles.length === 0) {
      message.warning("请先选择文件");
      return;
    }
    const v = await form.validateFields();
    const req = {
      mode,
      selected_files: selectedFiles,
      output_root: v.output_root,
      title: v.title,
      year: v.year,
      season: v.season,
      start_episode: v.start_episode,
      quality: v.quality,
    };
    try {
      const p = await buildPlan(req);
      onPlans(p);
      setPreviewOpen(true);
    } catch (e: any) {
      message.error(`预览失败: ${e.message}`);
    }
  }

  async function doApply() {
    if (plans.length === 0) {
      await doPreview();
      if (plans.length === 0) return;
    }
    setApplying(true);
    try {
      const r = await applyPlan(plans);
      if (r.errors.length) {
        message.warning(`完成 ${r.ok} 个，失败 ${r.errors.length} 个（见控制台或刷新查看）`);
        // 你也可以把 errors 展示在 UI，这里先简化
        console.error(r.errors);
      } else {
        message.success(`全部完成：${r.ok} 个`);
      }
      onAfterApply();
    } catch (e: any) {
      message.error(`执行失败: ${e.message}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>整理参数</Typography.Title>

      <TmdbSearch enabled={cfg.tmdb_enabled} onPick={onPickTmdb} />

      <Divider />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          output_root: cfg.output_roots[0],
          title: "",
          year: "",
          tmdb_id: "",
          season: cfg.default_season,
          start_episode: 1,
          quality: cfg.default_movie_quality,
        }}
      >
        <Form.Item label="输出根目录" name="output_root" rules={[{ required: true }]}>
          <Select options={outputOptions} />
        </Form.Item>

        <Form.Item label="模式">
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            options={[
              { label: "剧集 (TV)", value: "tv" },
              { label: "电影 (Movie)", value: "movie" },
            ]}
          />
        </Form.Item>

        <Form.Item label="标题（剧集名/电影名）" name="title" rules={[{ required: true, message: "必填" }]}>
          <Input placeholder="例如：绝命毒师 / Inception" />
        </Form.Item>

        <Space style={{ width: "100%" }} align="start">
          <Form.Item label="年份（可空）" name="year" style={{ flex: 1 }}>
            <Input placeholder="例如：2008" />
          </Form.Item>
          <Form.Item label="TMDB ID（回填）" name="tmdb_id" style={{ flex: 1 }}>
            <Input disabled />
          </Form.Item>
        </Space>

        {mode === "tv" ? (
          <Space style={{ width: "100%" }} align="start">
            <Form.Item label="Season" name="season" style={{ flex: 1 }}>
              <InputNumber min={0} max={99} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="起始集数" name="start_episode" style={{ flex: 1 }}>
              <InputNumber min={0} max={999} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
        ) : (
          <Form.Item label="清晰度标签（先手动）" name="quality">
            <Select
              options={["2160p", "1080p", "720p", "480p"].map((x) => ({ label: x, value: x }))}
            />
          </Form.Item>
        )}

        <Space>
          <Button type="primary" onClick={doPreview} disabled={selectedFiles.length === 0}>
            预览计划
          </Button>
          <Button onClick={doApply} loading={applying} disabled={selectedFiles.length === 0}>
            执行硬链接
          </Button>
          <Typography.Text type="secondary">
            已选 {selectedFiles.length} 个文件
          </Typography.Text>
        </Space>
      </Form>

      <PreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} plans={plans} />
    </div>
  );
}