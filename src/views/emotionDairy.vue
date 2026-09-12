<script setup lang="ts">
/**
 * 情绪日记
 *
 * 相对改造前的修复：
 *  - 情绪选项卡片用 `.emotion-name { padding: 0 75px }` 撑宽度（一个 75px 的魔法
 *    内边距 hack），卡片宽度随文字长短跳动 → 改为固定尺寸的网格单元，名称居中。
 *  - `if (!diaryForm.moodScore)` 依赖 falsy 判断；0 分会被误判，且提示语与
 *    实际校验不符 → 改为显式空值判断。
 *  - 「重置」会直接丢弃用户已写的内容且没有任何提示 → 有内容时二次确认。
 *  - 提交无 loading、无失败提示，接口报错时用户不知道发生了什么 → 补 loading + catch。
 *  - 八个情绪选项/评分档位文案原先在本文件内重复定义，且与 src/utils/emotion.ts
 *    的映射重复 → 统一从 utils 导入。
 *  - 头部是绿→橙渐变、页面底色是冷灰，与全站品牌脱节；`width: 980px` 固定宽度在
 *    窄屏横向溢出 → 改用品牌令牌与响应式容器。
 *  - 情绪选择是纯 div 点击，键盘用户完全无法操作 → 补 role/aria-checked/tabindex/键盘事件；
 *    选中态同时有边框、底色与对勾，不靠颜色单一维度区分。
 *  - diaryDate 一直在表单模型里并会提交给后端，但界面上无处可改（永远是今天）→ 补日期选择。
 */
import { computed, reactive, ref } from "vue"
import { dayjs, ElMessage, ElMessageBox } from "element-plus"
import { addEmotionDiary } from "@/api/frontend"
import { EMOTION_OPTIONS, MOOD_SCORE_TEXTS } from "@/utils/emotion"

const headerIcon = new URL("@/assets/images/开心.png", import.meta.url).href

interface DiaryForm {
  diaryDate: string
  moodScore: number | null
  dominantEmotion: string
  emotionTriggers: string
  diaryContent: string
  sleepQuality: number | null
  stressLevel: number | null
}

const today = () => dayjs().format("YYYY-MM-DD")

const createEmptyForm = (): DiaryForm => ({
  diaryDate: today(),
  moodScore: null,
  dominantEmotion: "",
  emotionTriggers: "",
  diaryContent: "",
  sleepQuality: null,
  stressLevel: null,
})

const diaryForm = reactive<DiaryForm>(createEmptyForm())
const submitting = ref(false)

/** 日期不可早于 30 天前、不可晚于今天 */
const disabledDate = (date: Date) =>
  dayjs(date).isAfter(dayjs(), "day") || dayjs(date).isBefore(dayjs().subtract(30, "day"), "day")

const currentMoodText = computed(() =>
  diaryForm.moodScore ? MOOD_SCORE_TEXTS[diaryForm.moodScore - 1] : "",
)

const hasContent = computed(
  () =>
    diaryForm.moodScore !== null ||
    !!diaryForm.dominantEmotion ||
    !!diaryForm.emotionTriggers.trim() ||
    !!diaryForm.diaryContent.trim() ||
    diaryForm.sleepQuality !== null ||
    diaryForm.stressLevel !== null,
)

const selectEmotion = (emotion: string) => {
  // 再次点击同一个情绪可取消选择
  diaryForm.dominantEmotion =
    diaryForm.dominantEmotion === emotion ? "" : emotion
}

const handleReset = async () => {
  if (!hasContent.value) return
  try {
    await ElMessageBox.confirm("重置会清空当前已填写的内容，确定吗？", "重置记录", {
      confirmButtonText: "确定重置",
      cancelButtonText: "继续填写",
      type: "warning",
    })
  } catch {
    return
  }
  Object.assign(diaryForm, createEmptyForm())
  ElMessage.info("已重置")
}

const submitForm = async () => {
  if (diaryForm.moodScore === null) {
    ElMessage.error("请先为今天的整体情绪打分")
    return
  }
  if (!diaryForm.dominantEmotion) {
    ElMessage.error("请选择今天的主要情绪")
    return
  }
  submitting.value = true
  try {
    await addEmotionDiary(diaryForm)
    ElMessage.success("记录成功，愿今天被好好记住")
    Object.assign(diaryForm, createEmptyForm())
  } catch (error) {
    ElMessage.error(typeof error === "string" ? error : "提交失败，请稍后重试")
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="diary">
    <header class="diary__hero">
      <div class="diary__hero-inner">
        <el-image :src="headerIcon" class="diary__hero-icon" alt="" />
        <div>
          <h1 class="diary__hero-title">情绪日记</h1>
          <p class="diary__hero-text">
            花一分钟记录今天的情绪，让变化慢慢变得看得见。
          </p>
        </div>
      </div>
    </header>

    <div class="diary__body">
      <!-- 情绪评分 -->
      <section class="xy-card diary__card">
        <header class="diary__card-head">
          <h2 class="diary__card-title">今日情绪评分</h2>
          <p class="diary__card-hint">你今天整体的情绪状态如何？1 分最低，10 分最高</p>
        </header>

        <div class="mood">
          <el-rate
            v-model="diaryForm.moodScore"
            :texts="MOOD_SCORE_TEXTS"
            :max="10"
            size="large"
            show-text
            aria-label="今日情绪评分"
          />
          <Transition name="fade">
            <p v-if="currentMoodText" class="mood__readout">
              <el-icon><Sunny /></el-icon>
              你选的是「{{ currentMoodText }}」
            </p>
          </Transition>
        </div>

        <div class="diary__row">
          <label class="diary__label" for="diary-date">记录日期</label>
          <el-date-picker
            id="diary-date"
            v-model="diaryForm.diaryDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            :disabled-date="disabledDate"
            :clearable="false"
            class="diary__date"
          />
        </div>
      </section>

      <!-- 主要情绪 -->
      <section class="xy-card diary__card">
        <header class="diary__card-head">
          <h2 class="diary__card-title">主要情绪</h2>
          <p class="diary__card-hint">选一个最接近此刻感受的</p>
        </header>

        <div
          class="emotions"
          role="radiogroup"
          aria-label="主要情绪"
        >
          <div
            v-for="emotion in EMOTION_OPTIONS"
            :key="emotion.name"
            class="emotion"
            :class="{ 'is-selected': emotion.name === diaryForm.dominantEmotion }"
            :style="{ '--emotion-color': emotion.colorVar }"
            role="radio"
            tabindex="0"
            :aria-checked="emotion.name === diaryForm.dominantEmotion"
            @click="selectEmotion(emotion.name)"
            @keydown.enter.prevent="selectEmotion(emotion.name)"
            @keydown.space.prevent="selectEmotion(emotion.name)"
          >
            <el-image :src="emotion.url" class="emotion__image" alt="" />
            <span class="emotion__name">{{ emotion.name }}</span>
            <span class="emotion__check" aria-hidden="true">
              <el-icon><Select /></el-icon>
            </span>
          </div>
        </div>
      </section>

      <!-- 详细记录 -->
      <section class="xy-card diary__card">
        <header class="diary__card-head">
          <h2 class="diary__card-title">详细记录</h2>
          <p class="diary__card-hint">写下来的过程，本身就是在整理情绪</p>
        </header>

        <div class="field">
          <label class="diary__label" for="diary-triggers">情绪触发因素</label>
          <el-input
            id="diary-triggers"
            v-model="diaryForm.emotionTriggers"
            placeholder="今天发生了什么事，影响了你的情绪？"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
          />
        </div>

        <div class="field">
          <label class="diary__label" for="diary-content">今日感想</label>
          <el-input
            id="diary-content"
            v-model="diaryForm.diaryContent"
            placeholder="写下今天的感受、想法，或任何想记住的瞬间…"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
          />
        </div>

        <div class="indicators">
          <div class="field">
            <label class="diary__label" for="diary-sleep">睡眠质量</label>
            <el-select id="diary-sleep" v-model="diaryForm.sleepQuality" placeholder="请选择">
              <el-option label="很差" :value="1" />
              <el-option label="较差" :value="2" />
              <el-option label="一般" :value="3" />
              <el-option label="良好" :value="4" />
              <el-option label="优秀" :value="5" />
            </el-select>
          </div>
          <div class="field">
            <label class="diary__label" for="diary-stress">压力水平</label>
            <el-select id="diary-stress" v-model="diaryForm.stressLevel" placeholder="请选择">
              <el-option label="很低" :value="1" />
              <el-option label="较低" :value="2" />
              <el-option label="中等" :value="3" />
              <el-option label="较高" :value="4" />
              <el-option label="很高" :value="5" />
            </el-select>
          </div>
        </div>
      </section>

      <div class="diary__actions">
        <el-button :disabled="!hasContent || submitting" @click="handleReset">
          重置
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitForm"
        >
          提交记录
        </el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.diary {
  flex: 1;
}

// -----------------------------------------------------------------------------
// 头部
// -----------------------------------------------------------------------------
.diary__hero {
  padding: var(--xy-space-10) var(--xy-space-5);
  background: var(--xy-gradient-brand);
  color: #fff;

  @media (max-width: 640px) {
    padding: var(--xy-space-8) var(--xy-space-4);
  }

  &-inner {
    display: flex;
    align-items: center;
    gap: var(--xy-space-4);
    max-width: 860px;
    margin: 0 auto;
  }

  &-icon {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    padding: var(--xy-space-2);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: var(--xy-radius-md);
    background: rgba(255, 255, 255, 0.16);
  }

  &-title {
    font-size: var(--xy-text-2xl);
    font-weight: 700;
    color: #fff;
  }

  &-text {
    margin-top: var(--xy-space-1);
    font-size: var(--xy-text-base);
    color: rgba(255, 255, 255, 0.86);
  }
}

// -----------------------------------------------------------------------------
// 主体
// -----------------------------------------------------------------------------
.diary__body {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-5);
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: var(--xy-space-6) var(--xy-space-5);

  @media (max-width: 640px) {
    padding: var(--xy-space-4);
  }
}

.diary__card {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-5);
  padding: var(--xy-space-6);

  @media (max-width: 640px) {
    padding: var(--xy-space-4);
    gap: var(--xy-space-4);
  }

  &-head {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-1);
  }

  &-title {
    font-size: var(--xy-text-lg);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  &-hint {
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-500);
  }
}

// -----------------------------------------------------------------------------
// 评分
// -----------------------------------------------------------------------------
.mood {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-3);
  padding: var(--xy-space-5);
  border-radius: var(--xy-radius-md);
  background: var(--xy-surface-alt);

  &__readout {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    align-self: flex-start;
    padding: 4px 12px;
    border-radius: var(--xy-radius-full);
    background: var(--xy-accent-100);
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: var(--xy-accent-700);

    .el-icon {
      color: var(--xy-accent-500);
    }
  }

  :deep(.el-rate) {
    flex-wrap: wrap;
    row-gap: var(--xy-space-2);
  }
}

// -----------------------------------------------------------------------------
// 情绪选择
// -----------------------------------------------------------------------------
.emotions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--xy-space-3);

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.emotion {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--xy-space-2);
  padding: var(--xy-space-4) var(--xy-space-2);
  border: 2px solid var(--xy-border);
  border-radius: var(--xy-radius-md);
  background: var(--xy-surface);
  cursor: pointer;
  transition:
    border-color var(--xy-dur-fast) var(--xy-ease),
    background-color var(--xy-dur-fast) var(--xy-ease),
    transform var(--xy-dur) var(--xy-ease-out);

  &:hover {
    border-color: var(--emotion-color);
    transform: translateY(-2px);
  }

  // 选中：边框 + 浅底 + 角标，三重信号，不只靠颜色
  &.is-selected {
    border-color: var(--emotion-color);
    background: var(--xy-surface-alt);

    .emotion__name {
      color: var(--emotion-color);
      font-weight: 700;
    }

    .emotion__check {
      opacity: 1;
      transform: scale(1);
    }
  }

  &__image {
    width: 46px;
    height: 46px;
  }

  &__name {
    font-size: var(--xy-text-base);
    font-weight: 500;
    color: var(--xy-ink-700);
  }

  &__check {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--emotion-color);
    color: #fff;
    font-size: 12px;
    opacity: 0;
    transform: scale(0.6);
    transition:
      opacity var(--xy-dur-fast) var(--xy-ease),
      transform var(--xy-dur) var(--xy-ease-out);
  }
}

// -----------------------------------------------------------------------------
// 表单字段
// -----------------------------------------------------------------------------
.diary__label,
.form-label {
  display: block;
  margin-bottom: var(--xy-space-2);
  font-size: var(--xy-text-base);
  font-weight: 500;
  color: var(--xy-ink-700);
}

.field {
  display: flex;
  flex-direction: column;
}

.diary__row {
  display: flex;
  flex-direction: column;
}

.diary__date {
  width: 100%;
  max-width: 240px;
}

.indicators {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--xy-space-5);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: var(--xy-space-4);
  }

  :deep(.el-select) {
    width: 100%;
  }
}

// -----------------------------------------------------------------------------
// 操作区：移动端吸底，长表单不用滚到底
// -----------------------------------------------------------------------------
.diary__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--xy-space-3);
  padding: var(--xy-space-4) var(--xy-space-5);
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  background: var(--xy-surface);
  box-shadow: var(--xy-shadow-sm);

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  // 平板/手机都可能是触屏：按钮抬到 44px
  @media (max-width: 900px) {
    :deep(.el-button) {
      min-height: 44px;
    }
  }

  @media (max-width: 640px) {
    position: sticky;
    bottom: 0;
    border-radius: var(--xy-radius-md);
    padding: var(--xy-space-3) var(--xy-space-4);

    :deep(.el-button) {
      flex: 1;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--xy-dur) var(--xy-ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
