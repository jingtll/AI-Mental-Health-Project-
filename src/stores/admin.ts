import { defineStore } from "pinia"
import { ref } from "vue"

/**
 * 后台侧栏折叠状态。
 *
 * 新增 setCollapse：布局壳在窄屏下需要「自动折叠」，若只靠 CSS 把侧栏压窄、
 * 而状态仍是展开，菜单文字会被裁掉一半。状态与视觉必须由同一个来源驱动。
 */
export const useAdminStore = defineStore("admin", () => {
  const isCollapse = ref(false)

  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
  }

  const setCollapse = (value: boolean) => {
    isCollapse.value = value
  }

  return {
    isCollapse,
    toggleCollapse,
    setCollapse,
  }
})
