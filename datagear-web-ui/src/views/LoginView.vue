<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { doLogin, checkCodeUrl, type LoginForm } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useOperationMessage } from '@/composables/useOperationMessage'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { success, fail } = useOperationMessage()

const form = ref<LoginForm>({ name: '', password: '', checkCode: '', rememberMe: false })
const loading = ref(false)
const checkCodeSrc = ref(checkCodeUrl())

function refreshCheckCode() {
  checkCodeSrc.value = checkCodeUrl()
}

async function onSubmit() {
  loading.value = true
  try {
    await doLogin(form.value)
    // 登录成功后拉取当前用户 + 模块权限（/api/auth/me）
    await auth.fetchMe()
    success('登录成功')
    const redirect = (route.query.redirectUrl as string) || '/'
    router.push(redirect)
  } catch (e) {
    fail((e as Error).message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page flex align-items-center justify-content-center h-full">
    <Card class="login-card">
      <template #title>DataGear</template>
      <template #content>
        <form class="flex flex-column gap-3" @submit.prevent="onSubmit">
          <InputText v-model="form.name" placeholder="用户名" autofocus />
          <Password v-model="form.password" placeholder="密码" :feedback="false" />
          <div class="flex align-items-center gap-2">
            <InputText v-model="form.checkCode" placeholder="校验码" class="flex-1" />
            <img :src="checkCodeSrc" alt="校验码" class="check-code" @click="refreshCheckCode" />
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="form.rememberMe" :binary="true" input-id="remember-me" />
            <label for="remember-me">记住我</label>
          </div>
          <Button type="submit" label="登录" :loading="loading" />
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.login-card {
  width: 360px;
}
.check-code {
  height: 40px;
  cursor: pointer;
}
</style>
