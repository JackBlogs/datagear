#!/usr/bin/env bash
# 阶段六：收敛下线脚本（删除 web 层 FreeMarker 视图体系）
#
# ⚠️ 执行前提：SPA 已完全替换视图层，且设计器/sqlpad/数据交换已脱离 iframe 双轨。
# 当前（骨架 + 复杂模块 iframe 包装）尚未满足，故默认 dry-run。
#
# 用法：
#   ./scripts/converge-phase6.sh           # 干跑：打印将执行的删除
#   ./scripts/converge-phase6.sh --execute # 实际执行（git mv 到 deprecated/，可回滚）

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=true
if [[ "${1:-}" == "--execute" ]]; then
  DRY_RUN=false
fi

log() { echo "[phase6] $*"; }
do_step() {
  if $DRY_RUN; then
    echo "  [dry-run] $*"
  else
    echo "  [execute] $*"
    eval "$*"
  fi
}

log "阶段六收敛下线 $($DRY_RUN && echo '(干跑)')"

# 1. 依赖（pom）
log "1. 移除 spring-boot-starter-freemarker（datagear-webapp/pom.xml）"
do_step "sed -i '' '/spring-boot-starter-freemarker/d' datagear-webapp/pom.xml"

# 2. 视图四件套
log "2. 视图四件套 → deprecated/（datagear-web）"
do_step "mkdir -p datagear-web/deprecated/freemarker"
do_step "git mv datagear-web/src/main/java/org/datagear/web/freemarker/CustomFreeMarkerView.java datagear-web/deprecated/freemarker/ 2>/dev/null || true"
do_step "git mv datagear-web/src/main/java/org/datagear/web/freemarker/WriteJsonTemplateDirectiveModel.java datagear-web/deprecated/freemarker/ 2>/dev/null || true"

# 3. 模板
log "3. 136 个 .ftl → deprecated/templates"
do_step "git mv datagear-web/src/main/resources/org/datagear/web/templates datagear-web/deprecated/templates 2>/dev/null || true"

# 4. 前端 vendored lib + po 框架
log "4. vendored lib + po 框架 → deprecated/static"
do_step "git mv datagear-web/src/main/resources/org/datagear/web/static/lib datagear-web/deprecated/static-lib 2>/dev/null || true"
do_step "git mv datagear-web/src/main/resources/org/datagear/web/static/script/pages/include/page.js datagear-web/deprecated/page.js 2>/dev/null || true"
do_step "git mv datagear-web/src/main/resources/org/datagear/web/static/script/util.js datagear-web/deprecated/util.js 2>/dev/null || true"

log "完成。保留（冻结面）：datagear-analysis freemarker + datasettpl、static/analysisapi、analysislib、builtInChartPlugins、/dv、/cv、/vres、/checkCode、Compat 控制器。"
log "收敛后按《阶段六-收敛下线清单.md》执行 M5 冒烟（iframe 嵌入/密码分享/匿名/jsessionid/双形态打包）。"
