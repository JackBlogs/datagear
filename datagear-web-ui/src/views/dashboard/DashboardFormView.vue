<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDashboard, saveDashboard, type DashboardEntity } from '@/api/dashboard'
import { analysisProjectPagingQueryData, type AnalysisProject } from '@/api/analysisProject'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 看板表单（新增/编辑/查看共用），按原 dashboard_form.ftl 复刻：
// 名称、API 版本、所属项目、描述；查看模式额外展示创建用户/创建时间。
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

const form = ref<DashboardEntity>({
  id: '',
  name: '',
  apiVersion: '2.0',
  analysisProject: {},
  description: '',
})

/** 对应 DashboardApiVersion.V2 / V1 */
const apiVersionOptions = [
  { name: '2.0', value: '2.0' },
  { name: '1.0', value: '1.0' },
]

/** 新增/复制时“保存并设计”为主按钮，编辑时“保存”为主按钮（对应 isSaveAndDesignFirst） */
const isSaveAndDesignFirst = computed(() => !isEdit.value)

const createUserText = computed(() => {
  const u = form.value.createUser
  return u?.realName || u?.name || ''
})

const createTimeText = computed(() => {
  const t = form.value.createTime
  if (t === undefined || t === null || t === '') return ''
  if (typeof t === 'number') return new Date(t).toLocaleString()
  return String(t)
})

// 所属项目选择对话框
const projectPickerVisible = ref(false)
const projectKeyword = ref('')
const projects = ref<AnalysisProject[]>([])
const projectLoading = ref(false)

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    form.value = await getDashboard(id)
    if (!form.value.analysisProject) form.value.analysisProject = {}
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save(andDesign = false) {
  if (!form.value.name) {
    fail(t('pleaseFillName'))
    return
  }
  saving.value = true
  try {
    const saved = await saveDashboard(form.value)
    success(t('saveSuccess'))
    if (andDesign) router.push(`/dashboard/${saved.id}/design`)
    else router.push('/dashboard')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

/** 表单主提交动作：新增/复制 → 保存并设计，编辑 → 仅保存 */
async function onSubmit() {
  await save(isSaveAndDesignFirst.value)
}

function onDeleteAnalysisProject() {
  form.value.analysisProject = {}
}

function openProjectPicker() {
  projectKeyword.value = ''
  projects.value = []
  projectPickerVisible.value = true
  loadProjects()
}

async function loadProjects() {
  projectLoading.value = true
  try {
    const data = await analysisProjectPagingQueryData({
      page: 0,
      pageSize: 20,
      keyword: projectKeyword.value || undefined,
    })
    projects.value = data.items
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    projectLoading.value = false
  }
}

function onSelectProject(event: { data: AnalysisProject }) {
  const p = event.data
  form.value.analysisProject = { id: p.id, name: p.name }
  projectPickerVisible.value = false
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full page-form-dashboard p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }" @submit.prevent="onSubmit">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.dashboard') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/dashboard')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="dg-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="dg-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              name="name"
              required
              maxlength="100"
              :readonly="isReadonly"
              autofocus
            />
          </div>
        </div>
        <div class="field grid">
          <label for="dg-apiVersion" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="看板 API 版本">
            {{ t('apiVersion') }}
          </label>
          <div class="field-input col-12 md:col-9">
            <Dropdown
              id="dg-apiVersion"
              v-model="form.apiVersion"
              :options="apiVersionOptions"
              option-label="name"
              option-value="value"
              class="input w-full"
              :disabled="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="dg-ownerProject" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('ownerProject') }}</label>
          <div class="field-input col-12 md:col-9">
            <div class="p-inputgroup">
              <div class="p-input-icon-right flex-grow-1">
                <i
                  v-if="!isReadonly && form.analysisProject?.id"
                  class="pi pi-times cursor-pointer opacity-60"
                  @click="onDeleteAnalysisProject"
                ></i>
                <InputText
                  id="dg-ownerProject"
                  :value="form.analysisProject?.name || ''"
                  type="text"
                  class="input w-full h-full border-noround-right"
                  readonly
                  name="analysisProject.name"
                  maxlength="200"
                />
              </div>
              <Button
                v-if="!isReadonly"
                type="button"
                :label="t('select')"
                class="p-button-secondary"
                @click="openProjectPicker"
              />
            </div>
          </div>
        </div>
        <div class="field grid">
          <label for="dg-description" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="dg-description"
              v-model="form.description"
              rows="4"
              class="input w-full"
              name="description"
              maxlength="500"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div v-if="isReadonly" class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createUser') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText :value="createUserText" class="input w-full" readonly />
          </div>
        </div>
        <div v-if="isReadonly" class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createTime') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText :value="createTimeText" class="input w-full" readonly />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <template v-if="!isReadonly">
          <Button type="submit" :label="isSaveAndDesignFirst ? t('saveAndDesign') : t('save')" :loading="saving" />
          <Button
            type="button"
            :label="isSaveAndDesignFirst ? t('onlySave') : t('saveAndDesign')"
            :disabled="saving"
            @click="save(!isSaveAndDesignFirst)"
          />
        </template>
      </div>
    </form>

    <Dialog
      v-model:visible="projectPickerVisible"
      :header="t('select') + t('ownerProject')"
      modal
      :style="{ width: '44rem' }"
    >
      <div class="flex flex-column gap-2">
        <form class="flex gap-1" @submit.prevent="loadProjects">
          <InputText v-model="projectKeyword" :placeholder="t('searchByName')" class="flex-1" />
          <Button type="submit" icon="pi pi-search" :label="t('query')" size="small" />
        </form>
        <DataTable
          :value="projects"
          :loading="projectLoading"
          data-key="id"
          striped-rows
          @row-click="onSelectProject"
        >
          <Column field="name" :header="t('name')" />
          <Column field="description" :header="t('description')" />
        </DataTable>
      </div>
    </Dialog>
  </div>
</template>
