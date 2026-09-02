<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  initResetPassword,
  getResetPasswordStep,
  fillUserInfo,
  checkUserInfo,
  setNewPassword,
  type ResetPasswordStep,
} from '@/api/resetPassword'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 重置密码（3 步）：用户名 → 校验文件 → 新密码。
const router = useRouter()
const { success, fail } = useOperationMessage()

const step = ref<ResetPasswordStep | null>(null)
const username = ref('')
const checkFileName = ref('')
const checkFileTip = ref('')
const password = ref('')
const busy = ref(false)

onMounted(async () => {
  try {
    step.value = await initResetPassword()
  } catch (e) {
    fail((e as Error).message || '初始化失败')
  }
})

async function submitUsername() {
  if (!username.value) {
    fail('请填写用户名')
    return
  }
  busy.value = true
  try {
    await fillUserInfo(username.value)
    const s = await getResetPasswordStep()
    checkFileName.value = s.checkFileName ?? ''
    checkFileTip.value = s.checkFileTip ?? ''
    step.value = { ...s, step: 2 }
  } catch (e) {
    fail((e as Error).message || '提交失败')
  } finally {
    busy.value = false
  }
}

async function submitCheck() {
  busy.value = true
  try {
    await checkUserInfo()
    step.value = { total: 4, step: 3 }
  } catch (e) {
    fail((e as Error).message || '校验失败')
  } finally {
    busy.value = false
  }
}

async function submitPassword() {
  if (!password.value) {
    fail('请填写新密码')
    return
  }
  busy.value = true
  try {
    await setNewPassword(password.value)
    success('密码重置成功，请登录')
    router.push('/login')
  } catch (e) {
    fail((e as Error).message || '重置失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="reset">
    <div class="card">
      <h1>重置密码</h1>
      <div v-if="step?.step === 1 || !step" class="form flex flex-column gap-3">
        <input v-model="username" class="input" placeholder="用户名" />
        <Button label="下一步" :loading="busy" @click="submitUsername" />
      </div>
      <div v-else-if="step?.step === 2" class="form flex flex-column gap-3">
        <div class="tip">{{ checkFileTip || '请在服务器校验目录创建校验文件' }}</div>
        <div class="filename">校验文件名：{{ checkFileName }}</div>
        <Button label="文件已创建" :loading="busy" @click="submitCheck" />
      </div>
      <div v-else-if="step?.step === 3" class="form flex flex-column gap-3">
        <input v-model="password" type="password" class="input" placeholder="新密码" />
        <Button label="重置密码" :loading="busy" @click="submitPassword" />
      </div>
      <router-link to="/login" class="link">返回登录</router-link>
    </div>
  </div>
</template>

<style scoped>
.reset {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
}
.card {
  width: 380px;
  background: #fff;
  border-radius: 10px;
  padding: 28px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
h1 {
  text-align: center;
  margin-bottom: 20px;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 10px;
}
.tip {
  color: #666;
  font-size: 13px;
}
.filename {
  font-family: monospace;
  background: #f7f7f7;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
}
.link {
  text-align: center;
  color: #6366f1;
  font-size: 13px;
  margin-top: 16px;
  display: block;
}
</style>
