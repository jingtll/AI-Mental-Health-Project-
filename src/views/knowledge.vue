<script setup lang="ts">
/**
 * 知识文章管理
 *
 * 相对改造前修了什么（逐条对应）：
 *  1. `PageHead` 的 `#buttons` 里有一个「编辑」按钮没有 `@click`，点了完全没反应，
 *     且表格行内已有「编辑」→ 删掉这个死按钮（新增按钮在请求期间禁用）。
 *  2. 窄屏 6 列表格会把布局撑破 → el-table 外层包 `.table-scroll`（overflow-x: auto），
 *     横向滚动而不是压扁列宽。
 *     标题列改 `min-width` 参与分配，作者/阅读量/发布时间/操作保持固定宽度。
 *  3. 「发布时间」直接渲染 `row.updatedAt`（ISO 串）→ 改用 `formatDate`。
 *  4. 标题列与分类列前面都挂了 `<el-icon><timer /></el-icon>`，语义错误且属于图标滥用
 *     → 去掉标题列的 timer，分类列改用 `el-tag` 展示分类名。
 *  5. 空表格没有任何引导 → 补 `#empty` 插槽（`.xy-empty`）。
 *  6. 请求期间没有 loading → el-table 加 `v-loading`。
 *  7. 分页没有容器、窄屏可能溢出 → `.table-pager` 容器 + `flex-wrap` + 横向滚动兜底。
 *  8. 请求失败时列表会一直空白且抛未捕获拒绝 → try/catch/finally 收敛，loading 必定结束；
 *     `onMounted` 里的分类接口失败也会中断整个挂载（控制台报 unhandled error 且列表不加载）
 *     → 分类失败不再阻塞列表。
 *  9. `PageHead` 补 `subtitle`，说明该页用途。
 * 10. 内联 `style="width/margin-top"` 改为类名（用间距令牌）。
 *
 * 注：`handleSearch` 的 `{...pagination, ...formData}` 参数拼装、`moodScreRange` 之类的
 * 接口约定一律未改动，只补了失败兜底。
 */
import { onMounted, ref, reactive } from "vue";
import PageHead from "@/components/PageHead.vue";
import TableSearch from "@/components/TableSearch.vue";
import type { SearchFormItem } from "@/components/TableSearch.vue";
import {
  categoryTree,
  articlePage,
  getArticleDetail,
  changeArticleStatus,
  deleteArticle,
} from "@/api/admin";
import ArticleDialog from "@/components/ArticleDialog.vue";
import { formatDate } from "@/utils/format";
import { ElMessageBox, ElMessage } from "element-plus";

interface ArticleRow {
  id: number | string;
  title?: string;
  categoryId?: number;
  authorName?: string;
  readCount?: number;
  updatedAt?: string;
  status?: number;
  [key: string]: unknown;
}

const formItem = ref<SearchFormItem[]>([
  {
    comp: "input",
    prop: "title",
    label: "文章标题",
    placeholder: "请输入文章标题",
  },
  {
    comp: "select",
    prop: "categoryId",
    label: "分类",
    placeholder: "请选择分类",
  },
  {
    comp: "select",
    prop: "status",
    label: "状态",
    placeholder: "请选择状态",
    options: [
      { label: "草稿", value: 0 },
      { label: "已发布", value: 1 },
      { label: "已下线", value: 2 },
    ],
  },
]);

//分页参数
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
});

//列表数据
const tableData = ref<ArticleRow[]>([]);
//列表请求状态（驱动 el-table 的 v-loading）
const loading = ref(false);

const handleSearch = async (formData?: Record<string, unknown>) => {
  loading.value = true;
  try {
    const params = {
      ...pagination,
      ...(formData || {}),
    };
    const { records, total } = await articlePage(params);
    tableData.value = records as ArticleRow[];
    pagination.total = total;
  } catch {
    // 请求失败：清空列表并退出 loading，由空状态插槽兜底（错误提示由请求层统一给出）
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleChange = (page: number) => {
  pagination.currentPage = page;
  handleSearch();
};

//分类映射
const categoryMaps = reactive<Record<number, string>>({});
//分类列表
const categories = ref<Array<{ label: string; value: number }>>([]);

onMounted(async () => {
  try {
    const data = await categoryTree();
    categories.value = data.map((item) => {
      categoryMaps[item.id] = item.categoryName;
      return { label: item.categoryName, value: item.id };
    });
    formItem.value[1].options = categories.value;
  } catch {
    // 分类接口失败不再让 onMounted 抛未捕获错误：分类筛选留空，列表照常加载
  }
  //获取列表
  handleSearch();
});

//新增文章和编辑弹窗
const dialogVisible = ref(false);
const currentArticle = ref<ArticleRow | null>(null);

const handleSuccess = () => {
  //关闭弹窗并刷新列表
  dialogVisible.value = false;
  handleSearch();
};

const handleEdit = (row: Partial<ArticleRow>) => {
  if (!row.id) {
    currentArticle.value = null;
    dialogVisible.value = true;
    return;
  }
  //编辑
  getArticleDetail(row.id).then((res) => {
    currentArticle.value = res as ArticleRow;
    dialogVisible.value = true;
  });
};

//发布
const handlePublish = (row: ArticleRow) => {
  ElMessageBox.confirm(`确认发布文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定发布",
    cancelButtonText: "取消",
    type: "info",
  }).then(() => {
    changeArticleStatus(row.id, { status: 1 }).then(() => {
      ElMessage.success("发布成功");
      handleSearch();
    });
  });
};

//下线
const handleUnpublish = (row: ArticleRow) => {
  ElMessageBox.confirm(`确认下线文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定下线",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    changeArticleStatus(row.id, { status: 2 }).then(() => {
      ElMessage.success("下线成功");
      handleSearch();
    });
  });
};

//删除
const handleDelete = (row: ArticleRow) => {
  ElMessageBox.confirm(`确认删除文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "error",
  }).then(() => {
    deleteArticle(row.id).then(() => {
      ElMessage.success("删除成功");
      handleSearch();
    });
  });
};
</script>

<template>
  <div class="knowledge-page">
    <PageHead
      title="知识文章"
      subtitle="维护前台心理知识库：新增与编辑文章、控制发布状态，以及删除。"
    >
      <template #buttons>
        <el-button type="primary" :disabled="loading" @click="handleEdit({})">
          新增
        </el-button>
      </template>
    </PageHead>
    <TableSearch :formItem="formItem" @search="handleSearch" />
    <div class="table-scroll">
      <el-table v-loading="loading" :data="tableData">
        <el-table-column label="文章标题" fixed="left" min-width="200">
          <template #default="scope">
            <span class="article-title" :title="String(scope.row.title ?? '')">
              {{ scope.row.title }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="160">
          <template #default="scope">
            <el-tag type="info" effect="plain">
              {{ categoryMaps[scope.row.categoryId] || "未分类" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="authorName" width="140" label="作者" />
        <el-table-column prop="readCount" width="120" label="阅读量" />
        <el-table-column label="发布时间" width="140">
          <template #default="scope">
            {{ formatDate(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <el-button text type="primary" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button
              v-if="scope.row.status === 0 || scope.row.status === 2"
              text
              type="success"
              @click="handlePublish(scope.row)"
            >
              发布
            </el-button>
            <el-button
              v-if="scope.row.status === 1"
              text
              type="warning"
              @click="handleUnpublish(scope.row)"
            >
              下线
            </el-button>
            <el-button text type="danger" @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="xy-empty">
            <el-icon class="xy-empty__icon"><Collection /></el-icon>
            <p class="xy-empty__text">
              还没有文章<br />点击右上角「新增」创建第一篇知识文章
            </p>
          </div>
        </template>
      </el-table>
    </div>
    <div class="table-pager">
      <el-pagination
        :page-size="pagination.size"
        layout="prev,pager,next"
        :total="pagination.total"
        @change="handleChange"
      />
    </div>
    <ArticleDialog
      v-model:modelValue="dialogVisible"
      :categories="categories"
      @success="handleSuccess"
      :article="currentArticle"
    />
  </div>
</template>

<style lang="scss" scoped>
.knowledge-page {
  .table-scroll {
    margin-top: var(--xy-space-5);
    // 窄屏横向滚动兜底：el-table 自身超出容器时会横向滚动（已设固定列），
    // 这里再包一层，确保表格永远不会把卡片撑破
    overflow-x: auto;

    :deep(.el-table) {
      width: 100%;
    }
  }

  .article-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
    color: var(--xy-ink-900);
  }

  .table-pager {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--xy-space-5);
    overflow-x: auto;

    // 全局已把 .el-pagination 设为 justify-content: end，这里只补换行，
    // 避免窄屏分页器越过卡片右边界
    :deep(.el-pagination) {
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }
}
</style>
