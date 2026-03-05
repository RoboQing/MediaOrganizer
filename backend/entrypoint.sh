#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting with UID=$PUID GID=$PGID"
env | grep -E '^(PUID|PGID|TMDB_API_KEY)=' || true

# 如果是 root，就不要折腾 useradd/gosu 了
if [ "$PUID" = "0" ] && [ "$PGID" = "0" ]; then
  echo "Running as root (no gosu/user remap)."
  # 可选：尝试修复挂载目录权限（Windows 共享盘可能无效，但不影响）
  mkdir -p /out >/dev/null 2>&1 || true
  exec "$@"
fi

# 非 root 路径：创建 group/user
if ! getent group appgroup >/dev/null 2>&1; then
  groupadd -g "$PGID" appgroup
fi

if ! id -u appuser >/dev/null 2>&1; then
  useradd -u "$PUID" -g "$PGID" -m appuser
fi

# 你需要写哪个目录，就 chown 哪个目录
chown -R "$PUID:$PGID" /app || true

exec gosu "$PUID:$PGID" "$@"