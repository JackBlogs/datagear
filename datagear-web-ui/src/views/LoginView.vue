<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { doLogin, checkCodeUrl, type LoginForm } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 登录页（POST /login/doLogin），按原 login.ftl 复刻字段与布局。
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const form = ref<LoginForm>({ name: '', password: '', checkCode: '', rememberMe: false })
const loading = ref(false)
const checkCodeSrc = ref(checkCodeUrl())

function refreshCheckCode() {
  checkCodeSrc.value = checkCodeUrl()
}

async function onSubmit() {
  if (!form.value.name || !form.value.password) {
    fail(t('pleaseFillUsernamePassword'))
    return
  }
  loading.value = true
  try {
    await doLogin(form.value)
    await auth.fetchMe()
    success(t('loginSuccess'))
    const redirect = (route.query.redirectUrl as string) || '/'
    router.push(redirect)
  } catch (e) {
    fail((e as Error).message || t('loginFail'))
    refreshCheckCode()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page page page-form h-full surface-ground">
    <div class="flex flex-column h-full">
      <header class="page-main-header flex align-items-center px-3">
        <span class="font-bold text-lg">DataGear</span>
      </header>
      <div class="flex-grow-1 p-0">
        <div class="grid grid-nogutter justify-content-center">
          <Card class="col-10 md:col-5 p-card mt-6">
            <template #title>{{ t('login') }}</template>
            <template #content>
              <form class="flex flex-column" @submit.prevent="onSubmit">
                <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
                  <div class="field grid">
                    <label for="login-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <InputText
                        id="login-name"
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
                    <label for="login-password" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('password') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <Password
                        id="login-password"
                        v-model="form.password"
                        class="input w-full"
                        input-class="w-full"
                        toggle-mask
                        :feedback="false"
                        required
                        :pt="{ input: { name: 'password', maxlength: '50' } }"
                      />
                    </div>
                  </div>
                  <div class="field grid">
                    <label for="login-checkCode" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('checkCode') }}</label>
                    <div class="field-input col-12 md:col-9">
                      <div class="flex align-items-center gap-1">
                        <InputText
                          id="login-checkCode"
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
                          title="点击刷新"
                          class="checkCodeImg"
                          @click="refreshCheckCode"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
                  <Button type="submit" :label="t('login')" :loading="loading" />
                </div>
                <div class="page-form-foot flex-grow-0 pt-3 text-right text-color-secondary">
                  <Checkbox v-model="form.rememberMe" :binary="true" input-id="remember-login" name="rememberLogin" />
                  <label for="remember-login" class="ml-1">{{ t('remremberLogin') }}</label>
                  <router-link to="/resetPassword" class="link text-color-secondary ml-3">{{ t('forgetPassword') }}</router-link>
                </div>
                <div class="page-form-foot flex-grow-0 pt-3 text-right text-color-secondary">
                  <router-link to="/register" class="link text-color-secondary ml-3">{{ t('module.register') }}</router-link>
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
.checkCodeImg {
  height: 2.6rem;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  border: 1px solid var(--surface-border);
}
.link {
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
</style>
