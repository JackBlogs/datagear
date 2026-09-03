<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { testGuardExecute } from '@/api/dtbsSourceGuard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import DtbsSourceUrlBuilderDialog from '@/components/DtbsSourceUrlBuilderDialog.vue'

// 数据源防护测试页，按原 dtbsSourceGuard_test.ftl 复刻：
// 输入连接 URL（带构建器）、用户名、连接属性，提交 /dtbsSourceGuard/testExecute，
// 按已启用防护规则（优先级从高到低）判定 允许创建/禁止创建。
// 注：testExecute 针对全部启用规则判定，与单条规则无关，路由中的 :id 仅为入口上下文。
const router = useRouter()
const { t } = useI18n()
const { fail } = useOperationMessage()

const url = ref('')
const user = ref('')
const properties = ref<{ name: string; value: string }[]>([])
const testing = ref(false)
const result = ref<'none' | 'permit' | 'deny'>('none')
const urlBuilderVisible = ref(false)

function addProperty() {
  properties.value.push({ name: '', value: '' })
}

function removeProperty(idx: number) {
  properties.value.splice(idx, 1)
}

async function run() {
  if (!url.value.trim()) {
    fail(t('guardTest.pleaseUrl'))
    return
  }
  testing.value = true
  result.value = 'none'
  try {
    const permitted = await testGuardExecute({
      url: url.value.trim(),
      user: user.value,
      properties: properties.value.filter((p) => p.name.trim()),
    })
    result.value = permitted ? 'permit' : 'deny'
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    testing.value = false
  }
}

function onUrlApplied(u: string) {
  url.value = u
}
</script>

<template>
  <div class="page page-form h-full p-1">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('guardTest.title') }}</h3>
      <Button :label="t('back')" text size="small" @click="router.push('/dtbsSourceGuard')" />
    </div>
    <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
      <div class="text-color-secondary text-sm mb-3">{{ t('guardTest.desc') }}</div>
      <div class="field grid">
        <label for="gt-url" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="jdbc:...">{{ t('url') }}</label>
        <div class="field-input col-12 md:col-9">
          <div class="p-inputgroup">
            <InputText id="gt-url" v-model="url" type="text" class="input flex-1" maxlength="2000" placeholder="jdbc:" />
            <Button type="button" :label="t('builder')" class="p-button-secondary" size="small" @click="urlBuilderVisible = true" />
          </div>
        </div>
      </div>
      <div class="field grid">
        <label for="gt-user" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText id="gt-user" v-model="user" type="text" class="input w-full" maxlength="200" autocomplete="off" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('property') }}</label>
        <div class="field-input col-12 md:col-9">
          <div class="p-component p-inputtext p-2">
            <div class="flex flex-row pb-2 gap-1">
              <Button type="button" :label="t('add')" size="small" @click="addProperty" />
            </div>
            <div v-for="(p, idx) in properties" :key="idx" class="flex gap-2 align-items-center mb-1">
              <InputText v-model="p.name" class="input flex-1" :placeholder="t('propertyName')" maxlength="100" />
              <InputText v-model="p.value" class="input flex-1" :placeholder="t('propertyValue')" maxlength="500" />
              <Button icon="pi pi-times" text size="small" severity="danger" @click="removeProperty(idx)" />
            </div>
          </div>
        </div>
      </div>
      <div v-if="result !== 'none'" class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('test') }}</label>
        <div class="field-input col-12 md:col-9">
          <span v-if="result === 'permit'" class="p-tag p-tag-success" style="font-size:14px">{{ t('guardTest.permit') }}</span>
          <span v-else class="p-tag p-tag-danger" style="font-size:14px">{{ t('guardTest.deny') }}</span>
        </div>
      </div>
    </div>
    <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
      <Button type="button" :label="t('guardTest.run')" :loading="testing" @click="run" />
    </div>

    <DtbsSourceUrlBuilderDialog v-model:visible="urlBuilderVisible" :initial-url="url" @apply="onUrlApplied" />
  </div>
</template>

<style scoped>
.field-label {
  font-weight: 600;
}
</style>
