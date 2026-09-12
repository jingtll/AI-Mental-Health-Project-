<script setup lang="ts">
/**
 * 登录
 *
 * 相对改造前的修复：
 *  - 「返回首页」原先是个没有点击事件的 div（点了没反应）→ 移除，改由
 *    AuthLayout 在左上角提供真实的返回链接（所有认证页共用）。
 *  - 提交没有任何 loading 状态，点击后到响应返回前界面毫无反馈 → 补 loading。
 *  - 登录失败/接口异常没有兜底提示，只在控制台 console.error → 补 ElMessage。
 *  - login 成功后手写两份 localStorage → 统一走 utils/session 的 setSession。
 *  - 补 autocomplete、回车提交、密码框 aria 提示等可访问性细节。
 */
import { reactive, ref } from "vue"
import type { FormInstance, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { login } from "@/api/admin"
import { useRouter } from "vue-router"
import { setSession } from "@/utils/session"

const router = useRouter()

const formData = reactive({
  username: "",
  password: "",
})

const rules = reactive<FormRules>({
  username: [{ required: true, message: "请输入用户名或邮箱", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
})

const ruleFormRef = ref<FormInstance>()
const loading = ref(false)

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl || loading.value) return
  const valid = await formEl.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data = await login(formData)
    if (!data?.token || !data.userInfo) {
      ElMessage.error("登录失败：未获取到登录凭证")
      return
    }
    setSession(data.token, data.userInfo)
    ElMessage.success(`欢迎回来，${data.userInfo.nickName || data.userInfo.username}`)
    router.push(data.userInfo.userType === 2 ? "/back/dashboard" : "/")
  } catch (error) {
    ElMessage.error(
      typeof error === "string" ? error : "登录失败，请检查账号密码后重试",
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-card">
    <header class="auth-card__head">
      <h1 class="auth-card__title">欢迎回来</h1>
      <p class="auth-card__subtitle">登录后即可继续你的对话与记录</p>
    </header>

    <el-form
      ref="ruleFormRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      size="large"
      @submit.prevent
    >
      <el-form-item label="用户名或邮箱" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名或邮箱"
          autocomplete="username"
          clearable
        >
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="formData.password"
          placeholder="请输入密码"
          type="password"
          show-password
          autocomplete="current-password"
          @keyup.enter="submitForm(ruleFormRef)"
        >
          <template #prefix>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-button
        class="auth-card__submit"
        type="primary"
        size="large"
        :loading="loading"
        @click="submitForm(ruleFormRef)"
      >
        登录
      </el-button>
    </el-form>

    <p class="auth-card__foot">
      还没有账户？
      <router-link to="/auth/register" class="auth-card__link">立即注册</router-link>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.auth-card {
  width: 100%;

  &__head {
    margin-bottom: var(--xy-space-8);
    text-align: center;
  }

  &__title {
    font-size: var(--xy-text-2xl);
    font-weight: 700;
    color: var(--xy-ink-900);
  }

  &__subtitle {
    margin-top: var(--xy-space-2);
    font-size: var(--xy-text-base);
    color: var(--xy-ink-500);
  }

  &__submit {
    width: 100%;
    margin-top: var(--xy-space-6);
  }

  &__foot {
    margin-top: var(--xy-space-6);
    text-align: center;
    font-size: var(--xy-text-base);
    color: var(--xy-ink-500);
  }

  &__link {
    font-weight: 600;
    color: var(--xy-primary-600);

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
