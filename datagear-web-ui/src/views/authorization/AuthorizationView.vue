<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getAuthorizationMeta,
  listAuthorizations,
  saveAuthorization,
  deleteAuthorizations,
  PRINCIPAL_TYPE_USER,
  PRINCIPAL_TYPE_ROLE,
  PRINCIPAL_TYPE_ALL,
  PRINCIPAL_TYPE_ANONYMOUS,
  PRINCIPAL_ALL,
  PRINCIPAL_ANONYMOUS,
  type Authorization,
  type AuthorizationMeta,
} from '@/api/authorization'
import { userPagingQueryData } from '@/api/user'
import { rolePagingQueryData } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 资源授权管理：授权列表 + 新增/编辑/删除。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const resourceType = route.params.resourceType as string
const resource = route.params.resource as string

const meta = ref<AuthorizationMeta | null>(null)
const items = ref<Authorization[]>([])
const users = ref<{ id: string; name: string; realName?: string }[]>([])
const roles = ref<{ id: string; name: string }[]>([])
const loading = ref(false)
const saving = ref(false)

const form = ref<Authorization>({
  id: '',
  resource,
  resourceType,
  principal: '',
  principalType: PRINCIPAL_TYPE_USER,
  permission: 0,
  enabled: true,
})

const editingId = computed(() => form.value.id)

const userOptions = computed(() =>
  users.value.map((u) => ({ id: u.id, label: u.realName || u.name })),
)

const principalTypeOptions = computed(() => [
  { name: t('user'), value: PRINCIPAL_TYPE_USER },
  { name: t('role'), value: PRINCIPAL_TYPE_ROLE },
  { name: t('allUsers'), value: PRINCIPAL_TYPE_ALL },
  { name: t('anonymousUser'), value: PRINCIPAL_TYPE_ANONYMOUS },
])

function permissionLabel(p: number): string {
  return meta.value?.permissions.find((x) => x.permission === p)?.label ?? String(p)
}

function principalDisplay(a: Authorization): string {
  if (a.principalType === PRINCIPAL_TYPE_ALL) return t('allUsers')
  if (a.principalType === PRINCIPAL_TYPE_ANONYMOUS) return t('anonymousUser')
  const n = a.principalName ?? a.principal
  return `${a.principalType === PRINCIPAL_TYPE_ROLE ? t('role') : t('user')}: ${n}`
}

async function load() {
  loading.value = true
  try {
    meta.value = await getAuthorizationMeta(resourceType, resource)
    items.value = await listAuthorizations(resourceType, resource)
    const [u, r] = await Promise.all([
      userPagingQueryData({ page: 1, pageSize: 500 }),
      rolePagingQueryData({ page: 1, pageSize: 500 }),
    ])
    users.value = u.items
    roles.value = r.items
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    id: '',
    resource,
    resourceType,
    principal: '',
    principalType: PRINCIPAL_TYPE_USER,
    permission: meta.value?.permissions[0]?.permission ?? 0,
    enabled: true,
  }
}

function editRow(a: Authorization) {
  form.value = { ...a }
}

async function save() {
  if (form.value.principalType === PRINCIPAL_TYPE_ALL) form.value.principal = PRINCIPAL_ALL
  if (form.value.principalType === PRINCIPAL_TYPE_ANONYMOUS) form.value.principal = PRINCIPAL_ANONYMOUS
  if (!form.value.principal) {
    fail(t('pleaseSelectPrincipal'))
    return
  }
  saving.value = true
  try {
    await saveAuthorization(resourceType, resource, form.value)
    success(t('saveSuccess'))
    resetForm()
    items.value = await listAuthorizations(resourceType, resource)
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

async function removeRow(a: Authorization) {
  if (!window.confirm(t('confirmDeleteAuthorizationAsk'))) return
  try {
    await deleteAuthorizations(resourceType, resource, [a.id])
    success(t('deleteSuccess'))
    items.value = await listAuthorizations(resourceType, resource)
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">{{ t('resourceAuthorization') }}</h3>
      <Button :label="t('back')" text @click="router.back()" />
    </div>

    <div class="form flex flex-column gap-2 mb-3 card">
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('principalType') }}</label>
        <div class="field-input col-12 md:col-9">
          <SelectButton v-model="form.principalType" :options="principalTypeOptions" option-label="name" option-value="value" class="input w-full" />
        </div>
      </div>
      <div v-if="form.principalType === PRINCIPAL_TYPE_USER" class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('user') }}</label>
        <div class="field-input col-12 md:col-9">
          <Dropdown
            v-model="form.principal"
            :options="userOptions"
            option-label="label"
            option-value="id"
            placeholder="（选择用户）"
            class="input w-full"
          />
        </div>
      </div>
      <div v-else-if="form.principalType === PRINCIPAL_TYPE_ROLE" class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('role') }}</label>
        <div class="field-input col-12 md:col-9">
          <Dropdown
            v-model="form.principal"
            :options="roles"
            option-label="name"
            option-value="id"
            placeholder="（选择角色）"
            class="input w-full"
          />
        </div>
      </div>
      <div v-else class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('principal') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText :value="form.principalType === PRINCIPAL_TYPE_ALL ? t('allUsers') : t('anonymousUser')" class="input w-full" readonly />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('permission') }}</label>
        <div class="field-input col-12 md:col-9">
          <SelectButton v-model="form.permission" :options="meta?.permissions ?? []" option-label="label" option-value="permission" class="input w-full" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('enable') }}</label>
        <div class="field-input col-12 md:col-9">
          <SelectButton v-model="form.enabled" :options="[{name:t('yes'), value:true},{name:t('no'), value:false}]" option-label="name" option-value="value" class="input w-full" />
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button :label="editingId ? t('saveEdit') : t('addAuthorization')" :loading="saving" @click="save" />
        <Button v-if="editingId" :label="t('cancel')" text @click="resetForm" />
      </div>
    </div>

    <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
    <DataTable v-else :value="items" data-key="id">
      <Column :header="t('principal')">
        <template #body="{ data }">{{ principalDisplay(data) }}</template>
      </Column>
      <Column :header="t('permission')">
        <template #body="{ data }">{{ permissionLabel(data.permission) }}</template>
      </Column>
      <Column field="enabled" :header="t('enable')" />
      <Column :header="t('operation')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button :label="t('edit')" size="small" text @click="editRow(data)" />
            <Button :label="t('delete')" size="small" text severity="danger" @click="removeRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 12px;
}
.field-label {
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
select.input {
  background: var(--surface-card);
}
</style>
