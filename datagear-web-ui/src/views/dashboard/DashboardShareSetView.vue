<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDashboardShareSet, saveDashboardShareSet, type DashboardShareSet } from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

// 看板分享设置（能源暗域）：启用密码 / 匿名可访问密码 / 密码。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const id = route.params.id as string
const loading = ref(false)
const saving = ref(false)
const form = ref<DashboardShareSet>({ id, enablePassword: false, anonymousPassword: false, password: '' })

async function load() {
  loading.value = true
  try {
    form.value = await getDashboardShareSet(id)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await saveDashboardShareSet(form.value)
    success(t('saveSuccess'))
    router.push('/dashboard')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <form @submit.prevent="save">
      <!-- 页头 -->
      <div class="page-head">
        <div>
          <div class="page-title">{{ t('dashboardShareSet') }} <span class="tag brand">分享</span></div>
          <div class="page-desc">设置看板分享密码与匿名访问，保障外发安全</div>
        </div>
        <div class="page-actions">
          <button class="btn" type="button" @click="router.push('/dashboard')">{{ t('back') }}</button>
          <button class="btn primary" type="submit" :disabled="saving">
            {{ saving ? '保存中…' : t('save') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="empty">{{ t('loading') }}</div>

      <div v-else class="card form-card">
        <div class="card-title"><i class="bar"></i>分享设置</div>
        <div class="form-item">
          <label class="form-label">{{ t('enablePassword') }}</label>
          <div class="seg-row">
            <span class="seg-item" :class="{ active: form.enablePassword }" @click="form.enablePassword = true">启用</span>
            <span class="seg-item" :class="{ active: !form.enablePassword }" @click="form.enablePassword = false">关闭</span>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">{{ t('anonymousAccess') }}</label>
          <div class="seg-row">
            <span class="seg-item" :class="{ active: form.anonymousPassword }" @click="form.anonymousPassword = true">允许</span>
            <span class="seg-item" :class="{ active: !form.anonymousPassword }" @click="form.anonymousPassword = false">禁止</span>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">{{ t('password') }}</label>
          <input v-model="form.password" type="password" class="input" :placeholder="t('sharePassword')" autocomplete="new-password" />
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-card { padding: 16px 18px; max-width: 560px; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.seg-item { padding: 5px 18px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
</style>
