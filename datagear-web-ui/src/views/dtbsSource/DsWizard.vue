<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { saveDtbsSource, testDtbsSourceConnection, type DtbsSource } from '@/api/dtbsSource'
import { getUrlBuilders, type DbTypeUrlTemplate } from '@/api/dtbsSourceUrlBuilder'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 新建数据源向导（对应原型 datasource.html 的 .modal.wizard）：
// 4 步 steps：选择类型 → 填写连接 → 连接测试 → 完成。
// 数据库类走 JDBC 创建流程；文件/接口/流类按 DataGear 实际能力给接入指引，不强行建 JDBC 数据源。
const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

interface DsTypeDef {
  key: string
  name: string
  sub: string
  color: string
  kind: 'db' | 'other'
  /** 匹配 /api/dtbsSourceUrlBuilder/builders 的 dbType 候选（小写） */
  builderKeys: string[]
  guide?: 'file' | 'http' | 'stream'
}

// 类型网格与原型 DB_TYPES / OTHER_TYPES 对齐（logo 缩写 + 配色）
const DB_TYPES: DsTypeDef[] = [
  { key: 'mysql', name: 'MySQL', sub: '开源关系库', color: '#FF8A3D', kind: 'db', builderKeys: ['mysql'] },
  { key: 'oracle', name: 'Oracle', sub: '商用关系库', color: '#F87171', kind: 'db', builderKeys: ['oracle'] },
  { key: 'sqlserver', name: 'SQLServer', sub: '微软关系库', color: '#60A5FA', kind: 'db', builderKeys: ['sqlserver'] },
  { key: 'dm', name: '达梦 DM8', sub: '信创关系库', color: '#22D3EE', kind: 'db', builderKeys: ['dm'] },
  { key: 'kingbase', name: '金仓 Kingbase', sub: '信创关系库', color: '#34D399', kind: 'db', builderKeys: ['kingbase'] },
  { key: 'gaussdb', name: 'GaussDB', sub: '华为信创库', color: '#A78BFA', kind: 'db', builderKeys: ['gaussdb'] },
  { key: 'hive', name: 'Hive', sub: '大数据仓库', color: '#E8B33C', kind: 'db', builderKeys: ['hive'] },
  { key: 'clickhouse', name: 'ClickHouse', sub: '实时分析库', color: '#F472B6', kind: 'db', builderKeys: ['clickhouse'] },
]
const OTHER_TYPES: DsTypeDef[] = [
  { key: 'csv', name: 'CSV', sub: '单文件', color: '#E8B33C', kind: 'other', builderKeys: [], guide: 'file' },
  { key: 'excel', name: 'Excel', sub: '工作簿', color: '#34D399', kind: 'other', builderKeys: [], guide: 'file' },
  { key: 'http', name: 'HTTP', sub: 'REST 接口', color: '#60A5FA', kind: 'other', builderKeys: [], guide: 'http' },
  { key: 'kafka', name: 'Kafka', sub: '实时消息流', color: '#22D3EE', kind: 'other', builderKeys: [], guide: 'stream' },
]

const step = ref(1)
const selType = ref<DsTypeDef>(DB_TYPES[0])
const builders = ref<DbTypeUrlTemplate[]>([])

const form = ref({ title: '', url: '', user: '', password: '', schemaName: '' })
const testing = ref(false)
const testResult = ref<'none' | 'ok' | 'fail'>('none')
const testMessage = ref('')
const saving = ref(false)

const isDb = computed(() => selType.value.kind === 'db')

function logoText(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function pickType(d: DsTypeDef) {
  selType.value = d
  if (d.kind === 'db') applyBuilderTemplate(d)
}

/** 按所选类型匹配 URL 模板并生成 URL（可改），来源 GET /api/dtbsSourceUrlBuilder/builders。
 *  注意 dbType 是显示名（如 'SQL Server'、'DM-达梦'、'KingbaseES-8'），需归一化后匹配。 */
function applyBuilderTemplate(d: DsTypeDef) {
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')
  const b = builders.value.find((x) => d.builderKeys.some((k) => norm(x.dbType).startsWith(k)))
  if (!b) return
  const dv = b.defaultValue ?? {}
  form.value.url = (b.template ?? '')
    .replace('{host}', dv.host || 'localhost')
    .replace('{port}', dv.port || '')
    .replace('{name}', dv.name || '')
}

function next() {
  if (step.value === 1) {
    step.value = 2
  } else if (step.value === 2) {
    if (!form.value.title.trim() || !form.value.url.trim()) {
      fail(t('pleaseFillTitleAndUrl'))
      return
    }
    step.value = 3
    testResult.value = 'none'
    void runTest()
  } else if (step.value === 3) {
    void saveAndFinish()
  }
}

function prev() {
  if (step.value > 1) step.value -= 1
}

async function runTest() {
  testing.value = true
  testResult.value = 'none'
  testMessage.value = ''
  try {
    const entity: DtbsSource = {
      id: '',
      title: form.value.title,
      url: form.value.url,
      user: form.value.user,
      password: form.value.password,
      schemaName: form.value.schemaName,
    }
    await testDtbsSourceConnection(entity)
    testResult.value = 'ok'
    testMessage.value = t('dsPage.testOkMsg')
  } catch (e) {
    testResult.value = 'fail'
    testMessage.value = (e as Error).message || t('dsPage.testFailMsg')
  } finally {
    testing.value = false
  }
}

async function saveAndFinish() {
  saving.value = true
  try {
    const entity: DtbsSource = {
      id: '',
      title: form.value.title,
      url: form.value.url,
      user: form.value.user,
      password: form.value.password,
      schemaName: form.value.schemaName,
    }
    await saveDtbsSource(entity)
    step.value = 4
    success(t('saveSuccess'))
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

function finish() {
  emit('saved')
  close()
}

function close() {
  emit('close')
  // 重置向导状态
  setTimeout(() => {
    step.value = 1
    selType.value = DB_TYPES[0]
    form.value = { title: '', url: '', user: '', password: '', schemaName: '' }
    testResult.value = 'none'
    testMessage.value = ''
    applyBuilderTemplate(DB_TYPES[0])
  }, 200)
}

function goto(path: string) {
  close()
  router.push(path)
}

watch(
  () => props.show,
  (v) => {
    if (v) {
      step.value = 1
      selType.value = DB_TYPES[0]
      applyBuilderTemplate(DB_TYPES[0])
    }
  },
)

onMounted(async () => {
  try {
    builders.value = await getUrlBuilders()
    applyBuilderTemplate(selType.value)
  } catch {
    // 模板加载失败不阻断向导（URL 仍可手填）
  }
})

const X_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="close">
    <div class="modal wizard">
      <div class="flex-between">
        <div style="font-size:16px;font-weight:700">{{ t('dsPage.wizardTitle') }}</div>
        <button class="drawer-close" type="button" @click="close" v-html="X_ICON"></button>
      </div>

      <div class="steps">
        <div v-for="(s, i) in [t('dsPage.step1'), t('dsPage.step2'), t('dsPage.step3'), t('dsPage.step4')]" :key="i"
          class="step" :class="{ active: step === i + 1, done: step > i + 1 }">
          <span class="s-dot">{{ i + 1 }}</span>{{ s }}
          <span v-if="i < 3" class="step-line"></span>
        </div>
      </div>

      <!-- 第 1 步：选择类型 -->
      <template v-if="step === 1">
        <div class="form-label" style="margin-bottom:10px">{{ t('dsPage.dbGroup') }}</div>
        <div class="type-grid">
          <div v-for="d in DB_TYPES" :key="d.key" class="type-cell" :class="{ sel: selType.key === d.key }" @click="pickType(d)">
            <div class="t-logo" :style="{ background: d.color }">{{ logoText(d.name) }}</div>
            <div><div class="t-name">{{ d.name }}</div><div class="t-sub">{{ d.sub }}</div></div>
          </div>
        </div>
        <div class="form-label" style="margin:16px 0 10px">{{ t('dsPage.otherGroup') }}</div>
        <div class="type-grid">
          <div v-for="d in OTHER_TYPES" :key="d.key" class="type-cell" :class="{ sel: selType.key === d.key }" @click="pickType(d)">
            <div class="t-logo" :style="{ background: d.color }">{{ logoText(d.name) }}</div>
            <div><div class="t-name">{{ d.name }}</div><div class="t-sub">{{ d.sub }}</div></div>
          </div>
        </div>
      </template>

      <!-- 第 2 步：数据库类 → 连接表单；其它类 → 接入指引 -->
      <template v-if="step === 2 && isDb">
        <div class="form-item">
          <label class="form-label"><span class="req">*</span>{{ t('name') }}</label>
          <input class="input" v-model="form.title" maxlength="100" :placeholder="selType.name + ' ' + t('module.dtbsSource')" />
        </div>
        <div class="form-item">
          <label class="form-label"><span class="req">*</span>{{ t('url') }}（{{ selType.name }}）</label>
          <input class="input" v-model="form.url" maxlength="2000" placeholder="jdbc:" />
        </div>
        <div class="flex" style="gap:14px;align-items:flex-start">
          <div class="form-item grow">
            <label class="form-label">{{ t('username') }}</label>
            <input class="input" v-model="form.user" maxlength="200" autocomplete="off" />
          </div>
          <div class="form-item grow">
            <label class="form-label">{{ t('password') }}</label>
            <input class="input" v-model="form.password" type="password" maxlength="100" autocomplete="new-password" />
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">Schema</label>
          <input class="input" v-model="form.schemaName" maxlength="100" />
        </div>
      </template>
      <template v-if="step === 2 && !isDb">
        <div class="card">
          <div style="font-size:14px;font-weight:600" class="mb-1">{{ t('dsPage.guideTitle') }}</div>
          <div class="tx-2" style="font-size:13px">
            {{ selType.guide === 'file' ? t('dsPage.guideFile') : selType.guide === 'http' ? t('dsPage.guideHttp') : t('dsPage.guideStream') }}
          </div>
          <div class="flex mt-2" style="gap:10px">
            <button v-if="selType.guide === 'file'" class="btn sm" type="button" @click="goto('/fileSource')">{{ t('dsPage.gotoFileSource') }}</button>
            <button v-if="selType.guide !== 'stream'" class="btn sm" type="button" @click="goto('/dataSet')">{{ t('dsPage.gotoDataSet') }}</button>
          </div>
        </div>
      </template>

      <!-- 第 3 步：连接测试 -->
      <template v-if="step === 3">
        <div class="card flex-col" style="align-items:center;text-align:center;padding:28px 18px">
          <template v-if="testing">
            <div class="tx-2">{{ t('loading') }}…</div>
          </template>
          <template v-else-if="testResult === 'ok'">
            <span class="tag ok" style="font-size:13px;padding:4px 14px">{{ t('dsPage.testOkMsg') }}</span>
            <div class="sm tx-3 mt-1 ellipsis" style="max-width:100%">{{ form.url }}</div>
          </template>
          <template v-else-if="testResult === 'fail'">
            <span class="tag danger" style="font-size:13px;padding:4px 14px">{{ t('dsPage.testFailMsg') }}</span>
            <div class="sm mt-1" style="color:var(--danger);word-break:break-all">{{ testMessage }}</div>
          </template>
          <div class="flex mt-2" style="justify-content:center">
            <button class="btn sm" type="button" :disabled="testing" @click="runTest">{{ t('dsPage.testNow') }}</button>
          </div>
        </div>
      </template>

      <!-- 第 4 步：完成 -->
      <template v-if="step === 4">
        <div class="card flex-col" style="align-items:center;text-align:center;padding:28px 18px">
          <span class="tag ok" style="font-size:13px;padding:4px 14px">{{ t('dsPage.step4') }}</span>
          <div class="mt-1" style="font-size:15px;font-weight:600">{{ form.title }}</div>
          <div class="sm tx-3">{{ t('dsPage.doneDesc') }}</div>
        </div>
      </template>

      <div class="modal-foot">
        <button class="btn" type="button" @click="close">{{ t('cancel') }}</button>
        <button v-if="step === 2 || step === 3" class="btn" type="button" @click="prev">{{ t('dsPage.prevStep') }}</button>
        <button v-if="step === 1" class="btn primary" type="button" @click="next">{{ t('dsPage.nextStep') }}</button>
        <button v-if="step === 2 && isDb" class="btn primary" type="button" @click="next">{{ t('dsPage.nextStep') }}</button>
        <button v-if="step === 3" class="btn primary" type="button" :disabled="saving || testing" @click="next">
          {{ saving ? t('loading') : t('dsPage.saveAndFinish') }}
        </button>
        <button v-if="step === 4" class="btn primary" type="button" @click="finish">{{ t('finish') }}</button>
      </div>
    </div>
  </div>
</template>
