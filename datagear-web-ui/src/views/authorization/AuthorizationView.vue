<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

function permissionLabel(p: number): string {
  return meta.value?.permissions.find((x) => x.permission === p)?.label ?? String(p)
}

function principalDisplay(a: Authorization): string {
  if (a.principalType === PRINCIPAL_TYPE_ALL) return '所有用户'
  if (a.principalType === PRINCIPAL_TYPE_ANONYMOUS) return '匿名用户'
  const n = a.principalName ?? a.principal
  return `${a.principalType === PRINCIPAL_TYPE_ROLE ? '角色' : '用户'}: ${n}`
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
    fail('请选择授权主体')
    return
  }
  saving.value = true
  try {
    await saveAuthorization(resourceType, resource, form.value)
    success('保存成功')
    resetForm()
    items.value = await listAuthorizations(resourceType, resource)
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function removeRow(a: Authorization) {
  if (!window.confirm('确认删除该授权？')) return
  try {
    await deleteAuthorizations(resourceType, resource, [a.id])
    success('删除成功')
    items.value = await listAuthorizations(resourceType, resource)
  } catch (e) {
    fail((e as Error).message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">资源授权</h3>
      <Button label="返回" text @click="router.back()" />
    </div>

    <div class="form flex flex-column gap-2 mb-3 card">
      <div class="flex align-items-center gap-2">
        <label class="label">主体类型</label>
        <select v-model="form.principalType" class="input">
          <option :value="PRINCIPAL_TYPE_USER">用户</option>
          <option :value="PRINCIPAL_TYPE_ROLE">角色</option>
          <option :value="PRINCIPAL_TYPE_ALL">所有用户</option>
          <option :value="PRINCIPAL_TYPE_ANONYMOUS">匿名用户</option>
        </select>
      </div>
      <div v-if="form.principalType === PRINCIPAL_TYPE_USER" class="flex align-items-center gap-2">
        <label class="label">用户</label>
        <select v-model="form.principal" class="input flex-1">
          <option value="">（选择用户）</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.realName || u.name }}</option>
        </select>
      </div>
      <div v-else-if="form.principalType === PRINCIPAL_TYPE_ROLE" class="flex align-items-center gap-2">
        <label class="label">角色</label>
        <select v-model="form.principal" class="input flex-1">
          <option value="">（选择角色）</option>
          <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">权限</label>
        <select v-model.number="form.permission" class="input">
          <option v-for="p in meta?.permissions ?? []" :key="p.permission" :value="p.permission">{{ p.label }}</option>
        </select>
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">启用</label>
        <input v-model="form.enabled" type="checkbox" />
      </div>
      <div class="flex gap-2">
        <Button :label="editingId ? '保存修改' : '新增授权'" :loading="saving" @click="save" />
        <Button v-if="editingId" label="取消" text @click="resetForm" />
      </div>
    </div>

    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <DataTable v-else :value="items" data-key="id">
      <Column header="主体">
        <template #body="{ data }">{{ principalDisplay(data) }}</template>
      </Column>
      <Column header="权限">
        <template #body="{ data }">{{ permissionLabel(data.permission) }}</template>
      </Column>
      <Column field="enabled" header="启用" />
      <Column header="操作">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button label="编辑" size="small" text @click="editRow(data)" />
            <Button label="删除" size="small" text severity="danger" @click="removeRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
}
.label {
  min-width: 64px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
