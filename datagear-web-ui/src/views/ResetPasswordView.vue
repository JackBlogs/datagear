<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  initResetPassword,
  getResetPasswordStep,
  fillUserInfo,
  checkUserInfo,
  setNewPassword,
  type ResetPasswordStep,
} from '@/api/resetPassword'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 重置密码（4 步）：用户名 → 校验文件 → 新密码 → 完成。
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const step = ref<ResetPasswordStep | null>(null)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const finishCount = ref(4)

const stepItems = computed(() => [
  { label: t('fillInfo') },
  { label: t('checkFile') },
  { label: t('setNewPassword') },
  { label: t('finish') },
])

const currentStepIndex = computed(() => (step.value ? step.value.step - 1 : 0))

onMounted(async () => {
  try {
    step.value = await initResetPassword()
  } catch (e) {
    fail((e as Error).message || t('initFail'))
  }
})

async function submitUsername() {
  if (!username.value) {
    fail(t('pleaseFillUsername'))
    return
  }
  busy.value = true
  try {
    await fillUserInfo(username.value)
    const s = await getResetPasswordStep()
    step.value = s
    finishCount.value = s.total ?? 4
  } catch (e) {
    fail((e as Error).message || t('submitFail'))
  } finally {
    busy.value = false
  }
}

async function submitCheck() {
  busy.value = true
  try {
    await checkUserInfo()
    const s = await getResetPasswordStep()
    step.value = s
  } catch (e) {
    fail((e as Error).message || t('checkFail'))
  } finally {
    busy.value = false
  }
}

async function submitPassword() {
  if (!password.value) {
    fail(t('pleaseFillNewPassword'))
    return
  }
  if (password.value !== confirmPassword.value) {
    fail(t('passwordInconsistent'))
    return
  }
  busy.value = true
  try {
    await setNewPassword(password.value)
    const s = await getResetPasswordStep()
    step.value = s
    success(t('passwordResetSuccess'))
    setTimeout(() => router.push('/login'), 3000)
  } catch (e) {
    fail((e as Error).message || t('resetFail'))
  } finally {
    busy.value = false
  }
}

function restart() {
  router.go(0)
}
</script>

<template>
  <div class="reset-page page page-form h-full surface-ground">
    <div class="flex flex-column h-full">
      <header class="page-main-header flex align-items-center px-3">
        <span class="font-bold text-lg">DataGear</span>
      </header>
      <div class="flex-grow-1 p-0">
        <div class="grid grid-nogutter justify-content-center">
          <Card class="col-10 md:col-8 p-card mt-6">
            <template #title>{{ t('resetPassword') }}</template>
            <template #content>
              <form class="flex flex-column">
                <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
                  <div class="mb-5">
                    <Steps :model="stepItems" :active-step="currentStepIndex" :readonly="true" />
                  </div>
                  <div class="grid grid-nogutter justify-content-center pt-3">
                    <div class="col-12 md:col-9">
                      <!-- 步骤 1：填写用户名 -->
                      <div v-if="!step || step.step === 1">
                        <div class="field grid">
                          <label for="reset-username" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
                          <div class="field-input col-12 md:col-9">
                            <InputText
                              id="reset-username"
                              v-model="username"
                              type="text"
                              class="input w-full"
                              name="username"
                              required
                              maxlength="50"
                              autofocus
                            />
                          </div>
                        </div>
                      </div>

                      <!-- 步骤 2：校验文件 -->
                      <div v-else-if="step.step === 2">
                        <div class="field grid">
                          <label for="reset-username-readonly" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
                          <div class="field-input col-12 md:col-9">
                            <InputText
                              id="reset-username-readonly"
                              :value="step.username"
                              type="text"
                              class="input w-full"
                              readonly
                            />
                          </div>
                        </div>
                        <div class="field grid">
                          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('checkFile') }}</label>
                          <div class="field-input col-12 md:col-9">
                            <div class="line-height-3" v-html="step.checkFileTip" />
                            <div class="desc text-color-secondary mt-3">
                              <small>{{ t('checkFileTip') }}</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 步骤 3：设置新密码 -->
                      <div v-else-if="step.step === 3">
                        <div class="field grid">
                          <label for="reset-username-readonly-3" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('username') }}</label>
                          <div class="field-input col-12 md:col-9">
                            <InputText
                              id="reset-username-readonly-3"
                              :value="step.username"
                              type="text"
                              class="input w-full"
                              readonly
                            />
                          </div>
                        </div>
                        <div class="field grid">
                          <label for="reset-password" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('newPassword') }}</label>
                          <div class="field-input col-12 md:col-9">
                            <Password
                              id="reset-password"
                              v-model="password"
                              class="input w-full"
                              input-class="w-full"
                              toggle-mask
                              :feedback="false"
                              required
                              autofocus
                              :pt="{ input: { name: 'password', maxlength: '50', autocomplete: 'new-password' } }"
                            />
                          </div>
                        </div>
                        <div class="field grid">
                          <label for="reset-confirmPassword" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('confirmPassword') }}</label>
                          <div class="field-input col-12 md:col-9">
                            <Password
                              id="reset-confirmPassword"
                              v-model="confirmPassword"
                              class="input w-full"
                              input-class="w-full"
                              toggle-mask
                              :feedback="false"
                              required
                              :pt="{ input: { name: 'confirmPassword', maxlength: '50', autocomplete: 'new-password' } }"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- 步骤 4：完成 -->
                      <div v-else-if="step.step === 4" class="field grid justify-content-center">
                        <div class="pb-5">
                          <i class="pi pi-check-circle text-xl mr-2"></i>
                          <span>{{ t('passwordResetSuccessTip') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
                  <Button
                    v-if="step && step.step !== 4"
                    type="button"
                    :label="t('restart')"
                    class="p-button-secondary mx-2"
                    :disabled="!step || step.step === 1"
                    @click="restart"
                  />
                  <Button
                    v-if="!step || step.step === 1"
                    type="button"
                    :label="t('nextStep')"
                    class="mx-2"
                    :loading="busy"
                    @click="submitUsername"
                  />
                  <Button
                    v-else-if="step.step === 2"
                    type="button"
                    :label="t('fileCreated')"
                    class="mx-2"
                    :loading="busy"
                    @click="submitCheck"
                  />
                  <Button
                    v-else-if="step.step === 3"
                    type="button"
                    :label="t('resetPassword')"
                    class="mx-2"
                    :loading="busy"
                    @click="submitPassword"
                  />
                </div>
                <div class="page-form-foot flex-grow-0 pt-3 text-right text-color-secondary">
                  <router-link to="/login" class="link text-color-secondary">{{ t('backToLogin') }}</router-link>
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
.reset-page {
  min-height: 100vh;
}
.page-main-header {
  height: 3.5rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}
.link {
  font-size: 0.875rem;
}
.link:hover {
  text-decoration: underline;
}
</style>
