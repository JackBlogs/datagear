<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changeUserPassword } from '@/api/user'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 管理员修改用户密码。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()

const id = route.params.id as string
const password = ref('')
const saving = ref(false)

async function save() {
  if (!password.value) {
    fail('请填写新密码')
    return
  }
  saving.value = true
  try {
    await changeUserPassword(id, password.value)
    success('密码已修改')
    router.push('/user')
  } catch (e) {
    fail((e as Error).message || '修改失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">修改用户密码</h3>
      <Button label="返回" text @click="router.push('/user')" />
    </div>
    <div class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">新密码</label>
        <input v-model="password" type="password" class="input flex-1" placeholder="新密码" />
      </div>
      <div class="flex gap-2">
        <Button label="保存" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 72px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
