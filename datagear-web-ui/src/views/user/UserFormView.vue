<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, saveUser, type User, type UserRole } from '@/api/user'
import { rolePagingQueryData, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 用户表单（新增/编辑/查看共用），按原 user_form.ftl 复刻。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
const mode = (route.query.mode as string) || 'edit'
const isEdit = computed(() => !!id)
const isReadonly = computed(() => mode === 'view')
// 仅新增时显示密码与确认密码
const enablePassword = computed(() => !isEdit.value)
// 已存在用户（编辑/查看）时用户名只读
const disableEditName = computed(() => isEdit.value)

const loading = ref(false)
const saving = ref(false)
const allRoles = ref<Role[]>([])
const confirmPassword = ref('')

const form = ref<User>({
  id: '',
  name: '',
  realName: '',
  password: '',
  admin: false,
  anonymous: false,
  roles: [],
})

const roles = computed(() => form.value.roles ?? [])

async function load() {
  loading.value = true
  try {
    const roleData = await rolePagingQueryData({ page: 1, pageSize: 500 })
    allRoles.value = roleData.items
    if (isEdit.value) {
      form.value = await getUser(id)
      if (!form.value.roles) form.value.roles = []
    }
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function onRemoveRole(roleId: string) {
  form.value.roles = roles.value.filter((r) => r.id !== roleId)
}

function onSelectRole() {
  const selected = new Set(roles.value.map((r) => r.id))
  const available = allRoles.value.filter((r) => !selected.has(r.id))
  const list = available.map((r) => `${r.id}: ${r.name}`).join('\n')
  const input = window.prompt(
    `可选角色（输入角色 ID 添加，多个用逗号分隔）：\n${list || '无可用角色'}`,
  )
  if (input === null || input.trim() === '') return
  const ids = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  ids.forEach((rid) => {
    const role = allRoles.value.find((r) => r.id === rid)
    if (!role) {
      fail(`未找到角色：${rid}`)
      return
    }
    if (!selected.has(rid)) {
      form.value.roles!.push({ id: role.id, name: role.name } as UserRole)
      selected.add(rid)
    }
  })
}

async function save() {
  if (!form.value.name) {
    fail(t('pleaseFillUsername'))
    return
  }
  if (enablePassword.value) {
    if (!form.value.password) {
      fail(t('pleaseFillPassword'))
      return
    }
    if (form.value.password !== confirmPassword.value) {
      fail(t('passwordInconsistent'))
      return
    }
  }
  saving.value = true
  try {
    await saveUser(form.value)
    success(t('saveSuccess'))
    router.push('/user')
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
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.user') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/user')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="user-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="user-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              name="name"
              required
              maxlength="50"
              :autofocus="!disableEditName"
              :readonly="disableEditName || isReadonly"
            />
          </div>
        </div>
        <div v-if="enablePassword" class="field grid">
          <label for="user-password" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('password') }}</label>
          <div class="field-input col-12 md:col-9">
            <Password
              id="user-password"
              v-model="form.password"
              class="input w-full"
              input-class="w-full"
              toggle-mask
              :feedback="false"
              required
              :pt="{ input: { name: 'password', maxlength: '50', autocomplete: 'new-password' } }"
            />
          </div>
        </div>
        <div v-if="enablePassword" class="field grid">
          <label for="user-confirmPassword" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('confirmPassword') }}</label>
          <div class="field-input col-12 md:col-9">
            <Password
              id="user-confirmPassword"
              v-model="confirmPassword"
              class="input w-full"
              input-class="w-full"
              toggle-mask
              :feedback="false"
              required
              :pt="{ input: { name: 'confirmPassword', maxlength: '50', autocomplete: 'new-password' } }"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="user-realName" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('realName') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="user-realName"
              v-model="form.realName"
              type="text"
              class="input w-full"
              name="realName"
              maxlength="50"
              :autofocus="disableEditName && !enablePassword"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="user-roles" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('module.role') }}</label>
          <div class="field-input col-12 md:col-9">
            <div id="user-roles" class="input p-component p-inputtext w-full overflow-auto" style="height: 6rem">
              <Chip
                v-for="role in roles"
                :key="role.id"
                :label="role.name || role.id"
                class="mb-2 mr-1"
                :removable="!isReadonly"
                @remove="onRemoveRole(role.id)"
              />
              <span v-if="!roles.length" class="text-color-secondary">{{ t('none') }}</span>
            </div>
            <div>
              <Button
                v-if="!isReadonly"
                type="button"
                :label="t('select')"
                class="p-button-secondary mt-1"
                size="small"
                @click="onSelectRole"
              />
            </div>
          </div>
        </div>
        <div v-if="isReadonly" class="field grid">
          <label for="user-createTime" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createTime') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="user-createTime"
              :value="form.createTime"
              type="text"
              class="input w-full"
              name="createTime"
              readonly
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
