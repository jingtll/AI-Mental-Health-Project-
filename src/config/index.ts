export const fileBaseUrl = "http://159.75.169.224:1235"

/**
 * 品牌信息：全站唯一来源。
 *
 * 改造前「宁渡 / 小暖 / 心理健康AI助手 / 心理AI助手」四个名字散落在各页面，
 * 此处收敛为单一常量；新页面一律引用 brand.*，不得再硬编码品牌名。
 */
export const brand = {
  /** 品牌名（导航、侧栏、标题） */
  name: "心耘",
  /** 品牌全称 / 副标 */
  fullName: "心灵耕耘平台",
  /** AI 助手名（与用户对话的角色） */
  assistantName: "心耘AI助手",
  /** 助手一句话定位 */
  assistantTagline: "用心陪伴，陪你耕耘好心田",
  /** 首页主标题 */
  slogan: "一次温暖的对话",
  /** 首页高亮短语 */
  sloganHighlight: "化孤独为慰藉",
  /** 全站描述语 */
  description:
    "每个深夜，每个焦虑的时刻，我们都在这里。不必独自承受，让心与心的连接温暖您的每一天。",
  /** 后台副标题 */
  adminSubtitle: "管理后台",
  /** 页脚版权（年份自动取当前年） */
  copyright: `© ${new Date().getFullYear()} 心耘 · 心灵耕耘平台`,
} as const

/**
 * 会话默认标题前缀。
 * 新建会话首条消息落库时用它生成标题，例如「心耘AI助手 - 2026/9/12 14:30:00」。
 */
export const sessionTitlePrefix = brand.assistantName
