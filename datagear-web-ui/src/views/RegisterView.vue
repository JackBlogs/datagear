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
  <div class="register-page page page-form h-full surface-ground">
    <div class="flex flex-column h-full">
      <header class="page-main-header flex align-items-center px-3">
        <span class="font-bold text-lg">DataGear</span>
      </header>
      <div class="flex-grow-1 p-0">
        <div class="grid grid-nogutter justify-content-center">
          <Card class="col-10 md:col-5 p-card mt-6">
            <template #title>{{ t('module.register') }}</template>
            <template #content>
              <form class="flex flex-column" @submit.prevent="submit">
                <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
                  <div class="field grid">
                    <label for="register-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <InputText
                        id="register-name"
                        v-model="form.name"
                        type="text"
                        class="input w-full"
                        name="name"
                        required
                        maxlength="50"
                        autofocus
                      />
                    </div>
                  </div>
                  <div class="field grid">
                    <label for="register-password" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('password') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <Password
                        id="register-password"
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
                  <div class="field grid">
                    <label for="register-confirmPassword" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('confirmPassword') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <Password
                        id="register-confirmPassword"
                        v-model="form.confirmPassword"
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
                    <label for="register-realName" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('realName') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <InputText
                        id="register-realName"
                        v-model="form.realName"
                        type="text"
                        class="input w-full"
                        name="realName"
                        maxlength="50"
                      />
                    </div>
                  </div>
                  <div class="field grid">
                    <label for="register-checkCode" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('checkCode') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <div class="flex align-items-center gap-1">
                        <InputText
                          id="register-checkCode"
                          v-model="form.checkCode"
                          type="text"
                          class="input w-6"
                          name="checkCode"
                          required
                          maxlength="10"
                        />
                        <img
                          :src="checkCodeSrc"
                          alt="校验码"
                          class="checkCodeImg cursor-pointer"
                          @click="refreshCheckCode"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
                  <Button type="submit" :label="t('register')" :loading="submitting" />
                </div>
                <div class="page-form-foot flex-grow-0 pt-3 text-right text-color-secondary">
                  <router-link to="/login" class="link text-color-secondary">{{ t('hasAccountGoLogin') }}</router-link>
                </div>
              </form>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
}
.page-main-header {
  height: 3.5rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}
.checkCodeImg {
  height: 2.5rem;
}
.link {
  font-size: 0.875rem;
}
.link:hover {
  text-decoration: underline;
}
</style>
