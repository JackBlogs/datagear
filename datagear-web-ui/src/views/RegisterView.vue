<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { doRegister } from '@/api/auth'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 注册页（POST /register/doRegister，registerDisabled 时后端返回 FAIL）。
const router = useRouter()
const { success, fail } = useOperationMessage()

const name = ref('')
const password = ref('')
const checkCode = ref('')
const submitting = ref(false)

async function submit() {
  if (!name.value || !password.value) {
    fail('请填写用户名与密码')
    return
  }
  submitting.value = true
  try {
    await doRegister({ name: name.value, password: password.value, checkCode: checkCode.value })
    success('注册成功，请登录')
    router.push('/login')
  } catch (e) {
    fail((e as Error).message || '注册失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="register">
    <div class="card">
      <h1>注册</h1>
      <div class="form flex flex-column gap-3">
        <input v-model="name" class="input" placeholder="用户名" />
        <input v-model="password" type="password" class="input" placeholder="密码" />
        <input v-model="checkCode" class="input" placeholder="校验码（可选）" />
        <Button label="注册" :loading="submitting" @click="submit" />
        <router-link to="/login" class="link">已有账号？去登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
}
.card {
  width: 360px;
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
.link {
  text-align: center;
  color: #6366f1;
  font-size: 13px;
}
</style>
