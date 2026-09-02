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

// 数据库驱动表单（新增/编辑/查看共用），按原 driverEntity_form.ftl 复刻。
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
  <div class="page page-form h-full p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }" @submit.prevent="save">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('driver') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/driverEntity')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="driverEntity-displayName" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="driverEntity-displayName"
              v-model="form.displayName"
              type="text"
              class="input w-full"
              required
              maxlength="200"
              autofocus
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label
            for="driverEntity-driverLibrary"
            class="field-label col-12 mb-2 md:col-3 md:mb-0"
            title="上传、下载、删除驱动库文件"
          >
            {{ t('driverLibrary') }}
          </label>
          <div class="field-input col-12 md:col-9">
            <div
              id="driverEntity-driverLibrary"
              class="input p-component p-inputtext w-full overflow-auto"
              style="height: 8rem"
            >
              <Chip
                v-for="f in libraryFiles"
                :key="f.name"
                class="mb-2 mr-1"
                :removable="!isReadonly"
                @remove="onRemoveFile(f)"
              >
                <a :href="driverFileDownloadUrl(form.id, f.name)" target="_blank" class="link text-color">
                  {{ f.name }} ({{ f.size }})
                </a>
              </Chip>
              <span v-if="!libraryFiles.length" class="text-color-secondary">暂无驱动库文件</span>
            </div>
            <div v-if="!isReadonly" class="fileupload-wrapper flex align-items-center mt-1">
              <input
                ref="fileInput"
                type="file"
                accept=".jar"
                class="hidden"
                :disabled="uploading"
                @change="onJarChange"
              />
              <Button
                type="button"
                :label="t('upload')"
                size="small"
                class="p-button-secondary mr-2"
                :loading="uploading"
                @click="triggerUpload"
              />
            </div>
            <div v-if="!isReadonly" class="desc text-color-secondary">
              <small>上传后将自动检测驱动类名；文件在保存后生效</small>
            </div>
          </div>
        </div>
        <div class="field grid">
          <label
            for="driverEntity-driverClassName"
            class="field-label col-12 mb-2 md:col-3 md:mb-0"
            title="JDBC 驱动类名"
          >
            {{ t('driverClassName') }}
          </label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="driverEntity-driverClassName"
              v-model="form.driverClassName"
              type="text"
              class="input w-full"
              required
              maxlength="500"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="driverEntity-displayDesc" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="driverEntity-displayDesc"
              v-model="form.displayDesc"
              rows="6"
              class="input w-full"
              maxlength="500"
              :readonly="isReadonly"
            />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button v-if="!isReadonly" type="submit" :label="t('save')" :loading="saving" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.hidden {
  display: none;
}
</style>
