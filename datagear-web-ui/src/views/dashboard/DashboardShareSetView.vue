<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDashboardShareSet, saveDashboardShareSet, type DashboardShareSet } from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 看板分享设置：启用密码 / 匿名可访问密码 / 密码。
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
  <div class="page page-form h-full p-1">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('dashboardShareSet') }}</h3>
      <Button :label="t('back')" text size="small" @click="router.push('/dashboard')" />
    </div>
    <div v-if="loading" class="text-color-secondary">加载中…</div>
    <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('enablePassword') }}</label>
        <div class="field-input col-12 md:col-9">
          <Checkbox v-model="form.enablePassword" :binary="true" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('anonymousAccess') }}</label>
        <div class="field-input col-12 md:col-9">
          <Checkbox v-model="form.anonymousPassword" :binary="true" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('password') }}</label>
        <div class="field-input col-12 md:col-9">
          <Password v-model="form.password" class="input w-full" :placeholder="t('sharePassword')" toggle-mask />
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
