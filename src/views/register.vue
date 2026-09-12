<script setup lang="ts">
/**
 * 注册
 *
 * 相对改造前的修复：
 *  - 表单有「确认密码」字段，但 rules 里只校验了必填，两次密码不一致也能注册成功
 *    → 新增一致性校验（这是原实现里最实质的校验缺口）。
 *  - 邮箱 / 手机号完全没有格式校验 → 补 format 校验。
 *  - 提交无 loading，长表单点击后毫无反馈 → 补 loading 与按钮禁用。
 *  - 原 `data.code === "BUSINESS_ERROR"` 分支是死代码：拦截器对非 "200" 的业务码
 *    直接 reject，永远不会 resolve 出带 code 的对象 → 改为 catch 里统一提示。
 *  - 用户名/昵称/手机号长度约束补上，避免后端报错才暴露。
 */
import { reactive, ref } from "vue"
import type { FormInstance, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { useRouter } from "vue-router"
import { register } from "@/api/frontend"

const router = useRouter()

interface RegisterForm {
  username: string
  email: string
  nickname: string
  phone: string
  password: string
  confirmPassword: string
  gender: number
  userType: 1 | 2
}

const formData = reactive<RegisterForm>({
  username: "",
  email: "",
  nickname: "",
  phone: "",
  password: "",
  confirmPassword: "",
  gender: 0,
  userType: 1,
})

/** 两次密码一致性校验（原实现缺失） */
const validateConfirm = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
) => {
  if (!value) {
    callback(new Error("请再次输入密码"))
    return
  }
  if (value !== formData.password) {
    callback(new Error("两次输入的密码不一致"))
    return
  }
  callback()
}

const rules = reactive<FormRules>({
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, max: 20, message: "用户名长度为 2–20 个字符", trigger: "blur" },
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "邮箱格式不正确", trigger: "blur" },
  ],
  nickname: [{ max: 20, message: "昵称不超过 20 个字符", trigger: "blur" }],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: "请输入 11 位有效的手机号",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 32, message: "密码长度为 6–32 个字符", trigger: "blur" },
  ],
  confirmPassword: [{ validator: validateConfirm, trigger: "blur" }],
})

const submitFormRef = ref<FormInstance>()
const loading = ref(false)

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl || loading.value) return
  const valid = await formEl.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 确认密码只用于前端校验，不提交给后端
    const { confirmPassword: _confirm, ...payload } = formData
    await register(payload)
    ElMessage.success("注册成功，请使用新账号登录")
    router.push("/auth/login")
  } catch (error) {
    ElMessage.error(
      typeof error === "string" ? error : "注册失败，请稍后重试",
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-card">
    <header class="auth-card__head">
      <h1 class="auth-card__title">创建账号</h1>
      <p class="auth-card__subtitle">从今天开始，认真对待自己的情绪</p>
    </header>

    <el-form
      ref="submitFormRef"
      label-position="top"
      :model="formData"
      :rules="rules"
      size="large"
      @submit.prevent
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          autocomplete="username"
          clearable
        />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="formData.email"
          placeholder="请输入邮箱"
          autocomplete="email"
          clearable
        />
      </el-form-item>

      <el-form-item label="昵称" prop="nickname">
        <el-input
          v-model="formData.nickname"
          placeholder="选填，我们希望你被这样称呼"
          clearable
        />
      </el-form-item>

      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="formData.phone"
          placeholder="选填，仅用于账号安全"
          maxlength="11"
          clearable
        />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="formData.password"
          placeholder="6–32 位字符"
          type="password"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="formData.confirmPassword"
          placeholder="请再次输入密码"
          type="password"
          show-password
          autocomplete="new-password"
          @keydown.enter="submitForm(submitFormRef)"
        />
      </el-form-item>

      <el-button
        class="auth-card__submit"
        type="primary"
        size="large"
        :loading="loading"
        @click="submitForm(submitFormRef)"
      >
        注册
      </el-button>
    </el-form>

    <p class="auth-card__foot">
      已有账户？
      <router-link to="/auth/login" class="auth-card__link">直接登录</router-link>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.auth-card {
  width: 100%;

  &__head {
    margin-bottom: var(--xy-space-6);
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
    margin-top: var(--xy-space-4);
  }

  &__foot {
    margin-top: var(--xy-space-5);
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

// 注册字段较多，压缩表单项间距，让整屏更紧凑
:deep(.el-form-item) {
  margin-bottom: var(--xy-space-4);
}
</style>
