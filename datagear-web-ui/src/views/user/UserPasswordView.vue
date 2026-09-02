<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changeUserPassword } from '@/api/user'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 管理员修改用户密码。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = route.params.id as string
const password = ref('')
const saving = ref(false)

async function save() {
  if (!password.value) {
    fail(t('pleaseFillNewPassword'))
    return
  }
  saving.value = true
  try {
    await changeUserPassword(id, password.value)
    success(t('passwordModified'))
    router.push('/user')
  } catch (e) {
    fail((e as Error).message || t('operationFail'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page page-form h-full p-1">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('changeUserPassword') }}</h3>
      <Button :label="t('back')" text size="small" @click="router.push('/user')" />
    </div>
    <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('newPassword') }}</label>
        <div class="field-input col-12 md:col-9">
          <Password v-model="password" class="input w-full" :placeholder="t('newPassword')" toggle-mask autofocus />
        </div>
      </div>
    </div>
    <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
      <Button :label="t('save')" :loading="saving" @click="save" />
    </div>
  </div>
</template>

<style scoped>
.field-label {
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
