<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { doRegister, checkCodeUrl, type RegisterForm } from '@/api/auth'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 注册页（POST /register/doRegister），按原 register.ftl 复刻字段与布局。
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const form = ref<RegisterForm>({
  name: '',
  password: '',
  confirmPassword: '',
  realName: '',
  checkCode: '',
})
const submitting = ref(false)
const checkCodeSrc = ref(checkCodeUrl('REGISTER'))

function refreshCheckCode() {
  checkCodeSrc.value = checkCodeUrl('REGISTER')
}

function validate(): string | null {
  if (!form.value.name) return t('pleaseFillUsername')
  if (!form.value.password) return t('pleaseFillPassword')
  if (form.value.password !== form.value.confirmPassword) return t('passwordInconsistent')
  if (!form.value.checkCode) return t('pleaseFillCheckCode')
  return null
}

async function submit() {
  const err = validate()
  if (err) {
    fail(err)
    return
  }
  submitting.value = true
  try {
    await doRegister(form.value)
    success(t('registerSuccess'))
    router.push('/login')
  } catch (e) {
    fail((e as Error).message || t('registerFail'))
    refreshCheckCode()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-wrap">
      <!-- ===== 左侧品牌区 ===== -->
      <div class="brand-pane">
        <div class="brand-top">
          <div class="brand-mark">DG</div>
          <div class="b-name">DataGear <em>能源BI</em></div>
          <span class="b-ver">V4.1</span>
        </div>

        <div class="brand-mid">
          <h1>语义层驱动的<br/>一站式能源数据智能平台</h1>
          <div class="slogan">从数据源到指标、看板、报表与 AI 问数 —— <b>开源 · 可私有化 · 信创全栈适配</b></div>
          <div class="ind-chips">
            <span class="ind oil"><i></i>石油</span>
            <span class="ind gas"><i></i>天然气</span>
            <span class="ind chem"><i></i>化工</span>
            <span class="ind coal"><i></i>煤矿</span>
          </div>
          <div class="brand-feats">
            <span class="feat"><i class="pi pi-shield"></i>开源免费 · LGPL 协议</span>
            <span class="feat"><i class="pi pi-database"></i>私有化部署 · 数据不出域</span>
            <span class="feat"><i class="pi pi-check-circle"></i>信创全适配 · 国产化生态</span>
          </div>
        </div>

        <div class="brand-kpis">
          <div class="k"><div class="k-v"><i>86</i></div><div class="k-l">语义指标</div></div>
          <div class="k"><div class="k-v">148</div><div class="k-l">数据集</div></div>
          <div class="k"><div class="k-v">64</div><div class="k-l">行业看板</div></div>
          <div class="k"><div class="k-v">4<i>+</i></div><div class="k-l">信创数据库</div></div>
        </div>
      </div>

      <!-- ===== 右侧注册区 ===== -->
      <div class="form-pane">
        <div class="auth-card">
          <h2>{{ t('module.register') }}</h2>
          <div class="card-sub">注册 DataGear 能源BI 账号，加入能源数据网络</div>

          <form @submit.prevent="submit">
            <div class="form-item">
              <label for="register-name" class="form-label">{{ t('username') }}</label>
              <InputText
                id="register-name"
                v-model="form.name"
                type="text"
                class="w-full tech-input"
                name="name"
                :placeholder="t('pleaseFillUsername')"
                required
                maxlength="50"
                autofocus
              />
            </div>
            <div class="form-item">
              <label for="register-password" class="form-label">{{ t('password') }}</label>
              <Password
                id="register-password"
                v-model="form.password"
                class="w-full tech-password"
                input-class="w-full"
                :placeholder="t('pleaseFillPassword')"
                toggle-mask
                :feedback="false"
                required
                :pt="{ input: { name: 'password', maxlength: '50', autocomplete: 'new-password' } }"
              />
            </div>
            <div class="form-item">
              <label for="register-confirmPassword" class="form-label">{{ t('confirmPassword') }}</label>
              <Password
                id="register-confirmPassword"
                v-model="form.confirmPassword"
                class="w-full tech-password"
                input-class="w-full"
                :placeholder="t('confirmPassword')"
                toggle-mask
                :feedback="false"
                required
                :pt="{ input: { name: 'confirmPassword', maxlength: '50', autocomplete: 'new-password' } }"
              />
            </div>
            <div class="form-item">
              <label for="register-realName" class="form-label">{{ t('realName') }}</label>
              <InputText
                id="register-realName"
                v-model="form.realName"
                type="text"
                class="w-full tech-input"
                name="realName"
                :placeholder="t('realName')"
                maxlength="50"
              />
            </div>
            <div class="form-item">
              <label for="register-checkCode" class="form-label">{{ t('checkCode') }}</label>
              <div class="captcha-row">
                <InputText
                  id="register-checkCode"
                  v-model="form.checkCode"
                  type="text"
                  class="tech-input captcha-input"
                  name="checkCode"
                  :placeholder="t('checkCode')"
                  required
                  maxlength="10"
                />
                <img
                  :src="checkCodeSrc"
                  alt="校验码"
                  title="点击刷新"
                  class="captcha-img"
                  @click="refreshCheckCode"
                />
              </div>
            </div>

            <Button type="submit" :label="t('register')" class="login-btn" :loading="submitting" />

            <div class="login-links">
              <router-link to="/login" class="link">{{ t('hasAccountGoLogin') }}</router-link>
              <a href="https://datagear.tech" target="_blank" rel="noopener" class="link">访问官网文档</a>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ===== 底部通栏 ===== -->
    <footer class="auth-foot">
      <span>开源协议 <span class="tag tag-brand">LGPL-3.0</span></span>
      <span class="xc">信创适配：
        <span class="tag">达梦 DM8</span><span class="tag">金仓 KingbaseES</span><span class="tag">麒麟 OS</span><span class="tag">统信 UOS</span>
      </span>
      <span>© 2026 DataGear Open Source Community</span>
    </footer>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark · 设计令牌 ============ */
.auth-page {
  --bg-glass: rgba(255,255,255,.035);
  --line-1: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --tx-1: #F2F5FA;
  --tx-2: #B9C2D4;
  --tx-3: #7C88A0;
  --tx-4: #525D75;
  --brand: #FF8A3D;
  --brand-grad: linear-gradient(135deg,#FFB25E 0%,#FF8A3D 45%,#F4633A 100%);
  --brand-soft: rgba(255,138,61,.14);
  --brand-line: rgba(255,138,61,.35);
  --ok: #34D399;
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;

  position: relative;
  min-height: 100vh;
  color: var(--tx-1);
  font-family: "PingFang SC","HarmonyOS Sans SC","Microsoft YaHei","Segoe UI",sans-serif;
  background: #0A0E17;
  overflow: hidden;
}
.auth-page::before {
  content: ""; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(900px 480px at 85% -10%, rgba(255,138,61,.10), transparent 60%),
    radial-gradient(800px 500px at -10% 110%, rgba(34,211,238,.07), transparent 60%),
    radial-gradient(600px 400px at 55% 120%, rgba(167,139,250,.05), transparent 65%);
}

.auth-wrap { display: flex; height: 100vh; position: relative; z-index: 1; }

/* ============ 左侧品牌区 ============ */
.brand-pane {
  width: 55%; height: 100%; position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 52px 60px 84px;
  background:
    radial-gradient(760px 420px at 18% 12%, rgba(255,138,61,.16), transparent 62%),
    radial-gradient(680px 460px at 88% 84%, rgba(34,211,238,.10), transparent 62%),
    radial-gradient(520px 360px at 60% 55%, rgba(167,139,250,.07), transparent 65%),
    linear-gradient(160deg, #0B1220 0%, #070A12 70%);
  border-right: 1px solid var(--line-1);
}
.brand-pane::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(70% 60% at 45% 42%, #000 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(70% 60% at 45% 42%, #000 30%, transparent 100%);
}
.brand-top { display: flex; align-items: center; gap: 12px; position: relative; }
.brand-mark {
  width: 40px; height: 40px; border-radius: 11px; background: var(--brand-grad);
  display: flex; align-items: center; justify-content: center;
  color: #1A0E05; font-weight: 800; font-size: 17px; font-family: var(--font-num);
  box-shadow: 0 0 24px rgba(255,138,61,.25);
}
.b-name { font-size: 17px; font-weight: 700; letter-spacing: .5px; }
.b-name em { font-style: normal; color: var(--brand); }
.b-ver {
  font-size: 10.5px; color: var(--tx-3); letter-spacing: 1.5px;
  border: 1px solid var(--line-2); border-radius: 10px; padding: 2px 9px;
  font-family: var(--font-num);
}
.brand-mid { position: relative; max-width: 560px; }
.brand-mid h1 {
  font-size: 46px; font-weight: 800; line-height: 1.22; letter-spacing: 1px;
  background: linear-gradient(120deg, #FFF3E6 0%, #FFB25E 38%, #FF8A3D 62%, #F4633A 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin: 0 0 16px;
}
.slogan { font-size: 16.5px; color: var(--tx-2); letter-spacing: .5px; }
.slogan b { color: var(--tx-1); font-weight: 600; }

.ind-chips { display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap; }
.ind {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12.5px; padding: 5px 13px; border-radius: 14px;
  border: 1px solid transparent;
}
.ind i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.ind.oil  { color: #FF8A3D; background: rgba(255,138,61,.13);  border-color: rgba(255,138,61,.3); }
.ind.gas  { color: #22D3EE; background: rgba(34,211,238,.12);  border-color: rgba(34,211,238,.3); }
.ind.chem { color: #A78BFA; background: rgba(167,139,250,.13); border-color: rgba(167,139,250,.3); }
.ind.coal { color: #E8B33C; background: rgba(232,179,60,.13);  border-color: rgba(232,179,60,.3); }

.brand-feats { display: flex; gap: 26px; margin-top: 34px; flex-wrap: wrap; }
.feat { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--tx-2); }
.feat .pi { font-size: 15px; color: var(--ok); }

.brand-kpis {
  position: relative; display: flex; gap: 38px; padding: 18px 22px;
  background: rgba(255,255,255,.03); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(8px); width: fit-content;
}
.k-v { font-family: var(--font-num); font-size: 22px; font-weight: 700; color: var(--tx-1); }
.k-v i { font-style: normal; color: var(--brand); }
.k-l { font-size: 11.5px; color: var(--tx-3); margin-top: 1px; }

/* ============ 右侧表单区 ============ */
.form-pane {
  flex: 1; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 40px 24px 60px;
  background: radial-gradient(560px 320px at 80% -6%, rgba(255,138,61,.07), transparent 60%);
  overflow-y: auto;
}
.auth-card {
  width: 400px; max-width: 100%;
  background: var(--bg-glass);
  border: 1px solid var(--line-2); border-radius: 20px;
  padding: 30px 34px 24px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 30px rgba(0,0,0,.45);
}
.auth-card h2 { font-size: 21px; font-weight: 700; margin: 0; }
.card-sub { font-size: 12.5px; color: var(--tx-3); margin: 4px 0 20px; }

.form-item { margin-bottom: 12px; }
.form-label { font-size: 12.5px; color: var(--tx-2); margin-bottom: 6px; display: block; }

.captcha-row { display: flex; gap: 10px; }
.captcha-input { flex: 1; }
.captcha-img {
  width: 128px; height: 42px; flex: none; object-fit: cover;
  border-radius: 10px; cursor: pointer;
  border: 1px solid var(--line-2);
  transition: border-color .18s, box-shadow .18s;
}
.captcha-img:hover { border-color: var(--brand-line); box-shadow: 0 0 12px rgba(255,138,61,.25); }

.link { color: var(--brand); text-decoration: none; font-size: 12.5px; }
.link:hover { color: #FFB25E; }

.login-btn {
  width: 100%; justify-content: center;
  margin-top: 6px;
  padding: 12px; font-size: 15px;
  background: var(--brand-grad) !important;
  border: none !important; border-radius: 10px !important;
  color: #241105 !important; font-weight: 600 !important;
  box-shadow: 0 4px 16px rgba(244,99,58,.3);
  transition: filter .18s, box-shadow .18s, transform .18s;
}
.login-btn:hover { filter: brightness(1.1); box-shadow: 0 6px 22px rgba(244,99,58,.42); }
.login-btn:active { transform: scale(.98); }

.login-links {
  display: flex; justify-content: space-between;
  margin-top: 16px; font-size: 12.5px;
}

/* ============ 底部通栏 ============ */
.auth-foot {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;
  padding: 12px 20px; font-size: 11.5px; color: var(--tx-4);
  border-top: 1px solid var(--line-1);
  background: rgba(7,10,18,.6); backdrop-filter: blur(10px);
}
.xc { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; padding: 1.5px 8px; border-radius: 6px;
  background: rgba(255,255,255,.06); color: var(--tx-2);
  border: 1px solid var(--line-1); white-space: nowrap;
}
.tag-brand { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); margin-left: 4px; }

/* ============ PrimeVue 深色覆写 ============ */
:deep(.tech-input.p-inputtext),
:deep(.tech-password .p-inputtext) {
  width: 100%;
  background: var(--bg-glass);
  border: 1px solid var(--line-2);
  border-radius: 10px;
  color: var(--tx-1);
  font-size: 13.5px;
  padding: 11px 14px;
  transition: border-color .18s, box-shadow .18s;
}
:deep(.tech-input.p-inputtext::placeholder),
:deep(.tech-password .p-inputtext::placeholder) { color: var(--tx-4); }
:deep(.tech-input.p-inputtext:enabled:focus),
:deep(.tech-password .p-inputtext:enabled:focus) {
  border-color: var(--brand-line);
  box-shadow: 0 0 0 3px rgba(255,138,61,.12);
}
:deep(.tech-password) { position: relative; display: block; }
:deep(.tech-password .p-inputtext) { padding-right: 2.4rem; }
:deep(.tech-password .p-password-toggle-icon),
:deep(.tech-password > .pi) { color: var(--tx-4); }
:deep(.tech-password > .pi:hover) { color: var(--brand); }

/* ============ 响应式 ============ */
@media (max-width: 960px) {
  .brand-pane { display: none; }
  .form-pane { background: none; }
}
@media (max-width: 560px) {
  .auth-card { padding: 24px 22px 20px; }
  .xc { justify-content: center; }
}
</style>
