<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getDriverEntity,
  saveDriverEntity,
  uploadDriverFile,
  deleteDriverFile,
  listDriverFiles,
  driverFileDownloadUrl,
  type DriverEntity,
  type DriverFileInfo,
} from '@/api/driverEntity'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'
import '@/styles/datasource-page.css'

// 数据库驱动表单（新增/编辑/查看共用，1:1 对齐 prototypev2 数据源模块风格）。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
const mode = (route.query.mode as string) || 'edit'
const isEdit = computed(() => !!id)
const isReadonly = computed(() => mode === 'view')
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)

const form = ref<DriverEntity>({
  id: '',
  driverClassName: '',
  displayName: '',
  displayDesc: '',
})

const libraryFiles = ref<DriverFileInfo[]>([])
const fileInput = ref<HTMLInputElement>()

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getDriverEntity(id)
    libraryFiles.value = await listDriverFiles(id)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function triggerUpload() {
  if (isReadonly.value || uploading.value) return
  fileInput.value?.click()
}

async function onJarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const r = await uploadDriverFile(form.value.id, file)
    libraryFiles.value = r.fileInfos ?? []
    // 若未填写驱动类名，则自动填充检测到的第一个
    if (!form.value.driverClassName && r.driverClassNames?.[0]) {
      form.value.driverClassName = r.driverClassNames[0]
    }
    success(t('uploadSuccess'))
  } catch (err) {
    fail((err as Error).message || t('uploadFail'))
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function onRemoveFile(f: DriverFileInfo) {
  if (!window.confirm(t('confirmDeleteDriverFile', [f.name]))) return
  try {
    libraryFiles.value = await deleteDriverFile(form.value.id, f.name)
    success(t('deleteSuccess'))
  } catch (err) {
    fail((err as Error).message || t('deleteFail'))
  }
}

async function save() {
  if (!form.value.displayName) {
    fail(t('pleaseFillName'))
    return
  }
  if (!form.value.driverClassName) {
    fail(t('pleaseFillDriverClassName'))
    return
  }
  saving.value = true
  try {
    const fileNames = libraryFiles.value.map((f) => f.name)
    const saved = await saveDriverEntity(form.value, fileNames)
    success(t('saveSuccess'))
    if (!isEdit.value) {
      // 新增：服务端生成 id 后回到编辑页，便于继续上传/管理驱动库文件
      router.replace(`/driverEntity/${saved.id}/edit`)
    } else {
      router.push('/driverEntity')
    }
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('driver') }}
          <span v-if="isReadonly" class="tag">只读</span>
        </div>
        <div class="page-desc">JDBC 驱动库 —— 上传驱动 jar、登记驱动类名，供数据源连接使用（FR-DRIVER）</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/driverEntity')">{{ t('back') }}</button>
        <button v-if="!isReadonly" class="btn primary" type="button" :disabled="saving" @click="save">
          {{ saving ? t('loading') : t('save') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <template v-else>
      <!-- 基本信息 -->
      <div class="card form-card">
        <div class="card-title"><i class="bar"></i>基本信息</div>
        <div class="form-item">
          <label class="form-label" for="driverEntity-displayName">{{ t('name') }} <b class="req">*</b></label>
          <input
            id="driverEntity-displayName"
            v-model="form.displayName"
            class="input"
            type="text"
            required
            maxlength="200"
            :readonly="isReadonly"
            placeholder="如：MySQL 8 驱动 / 阿里云 RDS MySQL"
          />
        </div>
        <div class="form-item">
          <label class="form-label" for="driverEntity-driverClassName" title="JDBC 驱动类名">
            {{ t('driverClassName') }} <b class="req">*</b>
          </label>
          <input
            id="driverEntity-driverClassName"
            v-model="form.driverClassName"
            class="input mono"
            type="text"
            required
            maxlength="500"
            :readonly="isReadonly"
            placeholder="如：com.mysql.cj.jdbc.Driver"
          />
          <div class="field-hint">上传驱动库后将自动检测驱动类名</div>
        </div>
        <div class="form-item">
          <label class="form-label" for="driverEntity-displayDesc">{{ t('description') }}</label>
          <textarea
            id="driverEntity-displayDesc"
            v-model="form.displayDesc"
            class="input"
            rows="4"
            maxlength="500"
            :readonly="isReadonly"
            placeholder="驱动版本、适用数据库与 JRE 版本说明…"
          ></textarea>
        </div>
      </div>

      <!-- 驱动库文件 -->
      <div class="card form-card">
        <div class="card-title">
          <i class="bar"></i>{{ t('driverLibrary') }}
          <span class="tag info">{{ libraryFiles.length }}</span>
          <button v-if="!isReadonly" class="btn sm" style="margin-left: auto" type="button" :disabled="uploading" @click="triggerUpload">
            {{ uploading ? t('loading') : t('upload') }}
          </button>
        </div>
        <div class="lib-files">
          <div v-for="f in libraryFiles" :key="f.name" class="lib-file">
            <span class="lf-icon">jar</span>
            <a :href="driverFileDownloadUrl(form.id, f.name)" target="_blank" class="lf-name">{{ f.name }}</a>
            <span class="lf-size">{{ f.size }}</span>
            <span v-if="!isReadonly" class="link danger" @click="onRemoveFile(f)">{{ t('delete') }}</span>
          </div>
          <div v-if="!libraryFiles.length" class="empty">
            暂无驱动库文件 —— 点击右上角「{{ t('upload') }}」上传 .jar（如 mysql-connector-j-8.x.jar）
          </div>
        </div>
        <div class="field-hint" style="margin-top: 8px" v-if="!isReadonly">
          上传后将自动检测驱动类名；文件在保存后生效
        </div>
      </div>

      <!-- 阿里云 RDS 等云数据库提示 -->
      <div class="cloud-hint">
        <b>阿里云 RDS / 云数据库</b>：无需单独驱动，直接使用对应数据库类型的 JDBC 驱动（如 MySQL 选 com.mysql.cj.jdbc.Driver），
        并在「数据源」中按 <span class="mono">jdbc:mysql://&lt;实例域名&gt;:&lt;端口&gt;/&lt;库名&gt;</span> 配置连接；请先在云控制台将本机 IP 加入白名单。
      </div>

      <div class="form-foot">
        <button class="btn" type="button" @click="router.push('/driverEntity')">{{ t('back') }}</button>
        <button v-if="!isReadonly" class="btn primary" type="button" :disabled="saving" @click="save">
          {{ saving ? t('loading') : t('save') }}
        </button>
      </div>
    </template>

    <input ref="fileInput" type="file" accept=".jar" style="display: none" :disabled="uploading" @change="onJarChange" />
  </div>
</template>

<style scoped>
.form-card { padding: 14px 16px; margin-bottom: 14px; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.req { color: var(--danger); font-weight: 700; }
.mono { font-family: var(--font-mono); }
.field-hint { font-size: 11px; color: var(--tx-4); margin-top: 5px; }
.lib-files { display: flex; flex-direction: column; gap: 6px; }
.lib-file {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px;
  border: 1px solid var(--line-1); border-radius: 10px; background: var(--bg-glass);
}
.lf-icon {
  width: 30px; height: 24px; border-radius: 6px; flex: none;
  background: rgba(255, 138, 61, 0.14); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700;
}
.lf-name { color: var(--tx-1); font-size: 12.5px; }
.lf-name:hover { color: var(--brand); }
.lf-size { font-size: 11px; color: var(--tx-4); margin-left: auto; font-family: var(--font-num); }
.cloud-hint {
  padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(96, 165, 250, 0.3);
  background: rgba(96, 165, 250, 0.08); font-size: 12.5px; color: var(--tx-2); line-height: 1.8;
  margin-bottom: 14px;
}
.cloud-hint b { color: #60a5fa; }
.cloud-hint .mono { font-family: var(--font-mono); color: #9ecbff; font-size: 11.5px; }
.form-foot { display: flex; gap: 10px; justify-content: flex-end; }
</style>
