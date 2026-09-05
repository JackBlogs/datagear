<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changeUserPassword } from '@/api/user'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'
import '@/styles/datasource-page.css'

// 管理员修改用户密码（能源暗域）。
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
  <div class="ds-page">
    <form @submit.prevent="save">
      <!-- 页头 -->
      <div class="page-head">
        <div>
          <div class="page-title">{{ t('changeUserPassword') }} <span class="tag brand">安全</span></div>
          <div class="page-desc">为用户设置新密码，保存后用户需使用新密码登录</div>
        </div>
        <div class="page-actions">
          <button class="btn" type="button" @click="router.push('/user')">{{ t('back') }}</button>
          <button class="btn primary" type="submit" :disabled="saving">
            {{ saving ? '保存中…' : t('save') }}
          </button>
        </div>
      </div>

      <div class="card form-card">
        <div class="card-title"><i class="bar"></i>{{ t('newPassword') }}</div>
        <input v-model="password" type="password" class="input" :placeholder="t('newPassword')" autocomplete="new-password" autofocus />
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-card { padding: 16px 18px; max-width: 560px; }
.form-card .input { width: 100%; }
</style>
