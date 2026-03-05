import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, message, Space, Table, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";
import type { ColumnsType } from "antd/es/table";
import Selecto from "react-selecto";

import { getTree } from "../api";
import type { TreeResp } from "../types";

type Props = {
  root: string; // allowed browse root from backend config
  onAddSelected: (paths: string[]) => void;
};

type RowKind = "dir" | "file";
type Row = { key: string; name: string; fullPath: string; kind: RowKind };

function joinPath(dir: string, name: string): string {
  if (dir === "/") return "/" + name;
  return dir.endsWith("/") ? dir + name : dir + "/" + name;
}

function parentDir(p: string): string {
  if (!p || p === "/") return "/";
  const s = p.endsWith("/") ? p.slice(0, -1) : p;
  const i = s.lastIndexOf("/");
  if (i <= 0) return "/";
  return s.slice(0, i);
}

export default function FileBrowser({ root, onAddSelected }: Props) {
  // ----- left tree -----
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [dirCache, setDirCache] = useState<Record<string, TreeResp>>({});

  // ----- current dir + right table -----
  const [currentDir, setCurrentDir] = useState(root);
  const [filter, setFilter] = useState("");

  // selection for table rows (both dirs & files can be selected visually)
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  // Selecto + layout refs
  const dragAreaRef = useRef<HTMLDivElement | null>(null); // includes gutters + table
  const tableScrollRef = useRef<HTMLDivElement | null>(null); // scrollable table area

  // ----- Auto-scroll while box selecting -----
  const rafRef = useRef<number | null>(null);

  function autoScrollByPointer(clientY: number) {
    const sc = tableScrollRef.current;
    if (!sc) return;

    const rect = sc.getBoundingClientRect();
    const threshold = 40; // px near edge to start scrolling
    const maxSpeed = 22; // px per frame at most

    let delta = 0;
    if (clientY < rect.top + threshold) {
      const t = (rect.top + threshold - clientY) / threshold; // 0..1+
      delta = -Math.min(maxSpeed, Math.ceil(maxSpeed * t));
    } else if (clientY > rect.bottom - threshold) {
      const t = (clientY - (rect.bottom - threshold)) / threshold;
      delta = Math.min(maxSpeed, Math.ceil(maxSpeed * t));
    }

    if (delta !== 0) sc.scrollTop += delta;
  }

  function scheduleAutoScroll(clientY: number) {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      autoScrollByPointer(clientY);
    });
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ----- init/reset on root change -----
  useEffect(() => {
    setTreeData([{ title: root, key: root, isLeaf: false }]);
    setDirCache({});
    setCurrentDir(root);
    setSelectedKeys([]);
    setFilter("");
  }, [root]);

  async function loadDir(path: string) {
    if (dirCache[path]) return dirCache[path];
    const r = await getTree(path);
    setDirCache((prev) => ({ ...prev, [path]: r }));
    return r;
  }

  async function onLoadTreeNode(node: any) {
    const path = String(node.key);
    if (node.children && node.children.length > 0) return;

    try {
      const r = await loadDir(path);
      node.children = r.dirs.map((d) => ({
        title: d,
        key: joinPath(path, d),
        isLeaf: false,
      }));
      setTreeData((prev) => [...prev]);
    } catch (e: any) {
      message.error(`读取目录失败: ${e.message}`);
      node.children = [];
      setTreeData((prev) => [...prev]);
    }
  }

  useEffect(() => {
    loadDir(currentDir).catch((e: any) => message.error(`读取目录失败: ${e.message}`));
  }, [currentDir]);

  const currentListing = dirCache[currentDir];

  const rows: Row[] = useMemo(() => {
    const dirs = currentListing?.dirs ?? [];
    const files = currentListing?.files ?? [];
    const q = filter.trim().toLowerCase();
    const keep = (x: string) => (!q ? true : x.toLowerCase().includes(q));

    const dirRows: Row[] = dirs.filter(keep).map((name) => ({
      key: joinPath(currentDir, name),
      name,
      fullPath: joinPath(currentDir, name),
      kind: "dir",
    }));

    const fileRows: Row[] = files.filter(keep).map((name) => ({
      key: joinPath(currentDir, name),
      name,
      fullPath: joinPath(currentDir, name),
      kind: "file",
    }));

    return [...dirRows, ...fileRows];
  }, [currentDir, currentListing, filter]);

  const columns: ColumnsType<Row> = [
    {
      title: "类型",
      dataIndex: "kind",
      key: "kind",
      width: 70,
      render: (k) => (k === "dir" ? "📁" : "🎞️"),
    },
    { title: "名称", dataIndex: "name", key: "name", ellipsis: true },
    { title: "路径", dataIndex: "fullPath", key: "fullPath", ellipsis: true, width: "55%" },
  ];

  const selectedFilesOnly = useMemo(() => {
    const keySet = new Set(selectedKeys.map(String));
    return rows
      .filter((r) => keySet.has(r.key) && r.kind === "file")
      .map((r) => r.fullPath);
  }, [rows, selectedKeys]);

  const gutterWidth = 28;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12, height: "100%" }}>
      {/* Left: directory tree */}
      <div style={{ borderRight: "1px solid #f0f0f0", paddingRight: 12, overflow: "auto" }}>
        <Tree
          treeData={treeData}
          loadData={onLoadTreeNode}
          onSelect={(keys, info) => {
            if (!keys.length) return;
            const node: any = info.node;
            if (node?.isLeaf) return;
            setCurrentDir(String(keys[0]));
            setSelectedKeys([]);
          }}
        />
      </div>

      {/* Right: table + gutters */}
      <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Space style={{ marginBottom: 8, justifyContent: "space-between", width: "100%" }}>
          <Space>
            <Button
              onClick={() => {
                const p = parentDir(currentDir);
                if (!p.startsWith(root)) setCurrentDir(root);
                else setCurrentDir(p);
                setSelectedKeys([]);
              }}
              disabled={currentDir === root}
            >
              ⬅ 上级目录
            </Button>
            <Typography.Text type="secondary" className="mono">
              {currentDir}
            </Typography.Text>
          </Space>

          <Space>
            <Input
              placeholder="过滤文件/文件夹"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 240 }}
            />
            <Button
              type="primary"
              disabled={selectedKeys.length === 0}
              onClick={() => {
                if (selectedFilesOnly.length === 0) {
                  message.warning("你选中的都是文件夹；当前版本只支持加入文件。");
                  return;
                }
                onAddSelected(selectedFilesOnly);
              }}
            >
              加入已选 ({selectedKeys.length})
            </Button>
            <Button onClick={() => setSelectedKeys([])} disabled={selectedKeys.length === 0}>
              取消选择
            </Button>
          </Space>
        </Space>

        <div
          ref={dragAreaRef}
          style={{
            flex: 1,
            position: "relative",
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Box selection: Ctrl/Cmd only; Ctrl/Cmd = TOGGLE selection in box */}
          <Selecto
            container={dragAreaRef.current ?? undefined}
            dragContainer={dragAreaRef.current ?? undefined}
            selectableTargets={["tr.ant-table-row.file-row", "tr.ant-table-row.dir-row"]}
            selectByClick={false}
            selectFromInside={false}
            hitRate={0}
            dragCondition={(e) => {
              const ev = e.inputEvent as MouseEvent | undefined;
              return Boolean(ev?.ctrlKey || ev?.metaKey);
            }}
            onDragStart={(e) => {
              const t = e.inputEvent?.target as HTMLElement | null;
              if (!t) return;
              if (t.closest("input,button,a,.ant-table-selection-column")) e.stop();
            }}
            onDrag={(e) => {
              const ev = e.inputEvent as MouseEvent | undefined;
              if (!ev) return;
              scheduleAutoScroll(ev.clientY);
            }}
            onSelectEnd={(e) => {
              const hitKeys = e.selected
                .map((el) => (el as HTMLElement).getAttribute("data-row-key"))
                .filter((x): x is string => Boolean(x));

              // Ctrl/Cmd drag box = toggle (invert) selection for items inside box
              setSelectedKeys((prev) => {
                const s = new Set(prev.map(String));
                for (const k of hitKeys) {
                  if (s.has(k)) s.delete(k);
                  else s.add(k);
                }
                return Array.from(s);
              });
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${gutterWidth}px 1fr ${gutterWidth}px`,
              height: "100%",
            }}
          >
            {/* Left gutter */}
            <div
              style={{
                borderRight: "1px dashed #e5e5e5",
                background: "linear-gradient(to right, rgba(0,0,0,0.02), rgba(0,0,0,0))",
                cursor: "crosshair",
                userSelect: "none",
              }}
              title="按住 Ctrl/Cmd，从这里拖拽可反选框内行"
            />

            {/* Scrollable table area */}
            <div ref={tableScrollRef} style={{ overflow: "auto" }}>
              <Table<Row>
                size="small"
                rowKey="key"
                columns={columns}
                dataSource={rows}
                pagination={{ pageSize: 50 }}
                rowSelection={{
                  selectedRowKeys: selectedKeys,
                  onChange: (keys) => setSelectedKeys(keys),
                }}
                rowClassName={(record) => (record.kind === "file" ? "file-row" : "dir-row")}
                onRow={(record) => ({
                  "data-row-key": record.key,
                  onDoubleClick: () => {
                    if (record.kind === "dir") {
                      setCurrentDir(record.fullPath);
                      setSelectedKeys([]);
                    } else {
                      onAddSelected([record.fullPath]);
                    }
                  },
                })}
              />
            </div>

            {/* Right gutter */}
            <div
              style={{
                borderLeft: "1px dashed #e5e5e5",
                background: "linear-gradient(to left, rgba(0,0,0,0.02), rgba(0,0,0,0))",
                cursor: "crosshair",
                userSelect: "none",
              }}
              title="按住 Ctrl/Cmd，从这里拖拽可反选框内行"
            />
          </div>
        </div>

        <Typography.Text type="secondary" style={{ marginTop: 8 }}>
          提示：默认拖拽用于选择文本复制；按住 Ctrl/Cmd 拖拽进入“反选框选”；靠近表格上下边缘会自动滚动；双击📁进入目录，双击🎞️加入已选。
        </Typography.Text>
      </div>
    </div>
  );
}