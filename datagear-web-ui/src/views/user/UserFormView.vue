<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, saveUser, type User, type UserRole } from '@/api/user'
import { rolePagingQueryData, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 用户表单（范式 C 独立表单页）：新增/编辑共用，id 存在则为编辑。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = (route.params.id as string) ?? ''
const isEdit = computed(() => !!id)
const loading = ref(false)
const saving = ref(false)
const allRoles = ref<Role[]>([])

const form = ref<User>({ id: '', name: '', realName: '', email: '', password: '', admin: false, anonymous: false, roles: [] })

const selectedRoleIds = computed({
  get: () => (form.value.roles ?? []).map((r) => r.id),
  set: (ids: string[]) => {
    form.value.roles = ids.map((rid) => ({ id: rid }) as UserRole)
  },
})

async function load() {
  loading.value = true
  try {
    const roles = await rolePagingQueryData({ page: 1, pageSize: 500 })
    allRoles.value = roles.items
    if (isEdit.value) form.value = await getUser(id)
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name) {
    fail('请填写用户名')
    return
  }
  if (!isEdit.value && !form.value.password) {
    fail('请填写密码')
    return
  }
  saving.value = true
  try {
    await saveUser(form.value)
    success('保存成功')
    router.push('/user')
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">{{ isEdit ? '编辑用户' : '新建用户' }}</h3>
      <Button label="返回" text @click="router.push('/user')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">用户名</label>
        <input v-model="form.name" class="input flex-1" placeholder="登录名" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">姓名</label>
        <input v-model="form.realName" class="input flex-1" placeholder="姓名" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">邮箱</label>
        <input v-model="form.email" class="input flex-1" placeholder="邮箱" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">密码</label>
        <input v-model="form.password" type="password" class="input flex-1" :placeholder="isEdit ? '留空则不修改' : '登录密码'" />
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">角色</label>
        <select v-model="selectedRoleIds" multiple class="input flex-1" size="5">
          <option v-for="r in allRoles" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 56px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
