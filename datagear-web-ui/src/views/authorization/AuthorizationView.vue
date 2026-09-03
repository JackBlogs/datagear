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
import { getDtbsSource } from '@/api/dtbsSource'
import { userPagingQueryData } from '@/api/user'
import { rolePagingQueryData } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 资源授权管理：授权列表 + 新增/编辑/删除（功能不变）。
// 第三轮：按原型「能源暗域」风格重排版式（page-head + card + .seg/.select/.tbl），
// PrimeVue 组件换为原生控件以保证视觉统一。
import '@/styles/datasource-page.css'

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
const resourceTitle = ref('')
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

const principalTypeOptions = computed(() => [
  { name: t('authz.principalUser'), value: PRINCIPAL_TYPE_USER },
  { name: t('authz.principalRole'), value: PRINCIPAL_TYPE_ROLE },
  { name: t('authz.principalAll'), value: PRINCIPAL_TYPE_ALL },
  { name: t('authz.principalAnonymous'), value: PRINCIPAL_TYPE_ANONYMOUS },
])

const enabledOptions = computed(() => [
  { name: t('yes'), value: true },
  { name: t('no'), value: false },
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
    // 数据源授权时显示数据源名称（其它资源类型静默忽略）
    if (resourceType === 'DATA_SOURCE') {
      try {
        resourceTitle.value = (await getDtbsSource(resource)).title ?? ''
      } catch {
        resourceTitle.value = ''
      }
    }
    resetForm()
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
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
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('authz.title') }}<span v-if="resourceTitle" class="tx-3" style="font-size:15px;font-weight:400"> · {{ resourceTitle }}</span></div>
        <div class="page-desc">{{ t('authz.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.back()">{{ t('back') }}</button>
      </div>
    </div>

    <!-- 添加授权 -->
    <div class="card mb-2">
      <div class="card-title"><span class="bar"></span>{{ t('authz.addSec') }}</div>
      <div class="form-item">
        <label class="form-label">{{ t('principalType') }}</label>
        <div class="seg">
          <span
            v-for="o in principalTypeOptions"
            :key="o.value"
            class="seg-item"
            :class="{ active: form.principalType === o.value }"
            @click="form.principalType = o.value; form.principal = ''"
          >{{ o.name }}</span>
        </div>
      </div>
      <div v-if="form.principalType === PRINCIPAL_TYPE_USER" class="form-item">
        <label class="form-label">{{ t('user') }}</label>
        <select v-model="form.principal" class="select">
          <option value="" disabled>（{{ t('select') }}）</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.realName || u.name }}</option>
        </select>
      </div>
      <div v-else-if="form.principalType === PRINCIPAL_TYPE_ROLE" class="form-item">
        <label class="form-label">{{ t('role') }}</label>
        <select v-model="form.principal" class="select">
          <option value="" disabled>（{{ t('select') }}）</option>
          <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-label">{{ t('permission') }}</label>
        <div class="seg">
          <span
            v-for="p in meta?.permissions ?? []"
            :key="p.permission"
            class="seg-item"
            :class="{ active: form.permission === p.permission }"
            @click="form.permission = p.permission"
          >{{ p.label }}</span>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">{{ t('enable') }}</label>
        <div class="seg">
          <span
            v-for="o in enabledOptions"
            :key="String(o.value)"
            class="seg-item"
            :class="{ active: form.enabled === o.value }"
            @click="form.enabled = o.value"
          >{{ o.name }}</span>
        </div>
      </div>
      <div class="flex" style="justify-content:flex-end;gap:10px">
        <button v-if="editingId" class="btn" type="button" @click="resetForm">{{ t('cancel') }}</button>
        <button class="btn primary" type="button" :disabled="saving" @click="save">
          {{ saving ? t('loading') : editingId ? t('saveEdit') : t('addAuthorization') }}
        </button>
      </div>
    </div>

    <!-- 授权记录 -->
    <div class="card">
      <div class="card-title">
        <span class="bar"></span>{{ t('authz.listSec') }}
        <span class="more">{{ items.length }}</span>
      </div>
      <div v-if="loading" class="tx-3">{{ t('loading') }}…</div>
      <div v-else-if="!items.length" class="empty" style="padding:28px 12px">{{ t('authz.empty') }}</div>
      <div v-else class="table-wrap" style="border-radius:var(--r-m)">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('principal') }}</th>
              <th>{{ t('permission') }}</th>
              <th>{{ t('enable') }}</th>
              <th style="width:120px">{{ t('operation') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in items" :key="a.id">
              <td class="cell-main">{{ principalDisplay(a) }}</td>
              <td><span class="tag info">{{ permissionLabel(a.permission) }}</span></td>
              <td>
                <span class="tag" :class="a.enabled ? 'ok' : ''">{{ a.enabled ? t('yes') : t('no') }}</span>
              </td>
              <td>
                <span class="link" @click="editRow(a)">{{ t('edit') }}</span> ·
                <span class="link danger" @click="removeRow(a)">{{ t('delete') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
