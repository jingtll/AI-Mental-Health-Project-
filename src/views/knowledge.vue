<script setup>
import { onMounted, ref, reactive } from "vue";
import PageHead from "@/components/PageHead.vue";
import TableSearch from "@/components/TableSearch.vue";
import {
  categoryTree,
  articlePage,
  getArticleDetail,
  changeArticleStatus,
  deleteArticle,
} from "@/api/admin";
import ArticleDialog from "@/components/ArticleDialog.vue";
import { ElMessageBox, ElMessage } from "element-plus";
const formItem = [
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
      {
        label: "草稿",
        value: 0,
      },
      {
        label: "已发布",
        value: 1,
      },
      {
        label: "已下线",
        value: 2,
      },
    ],
  },
];
//分页参数
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
});
const handleSearch = async (formData) => {
  console.log(formData, "查询参数");

  const params = {
    ...pagination,
    ...formData,
  };
  const { records, total } = await articlePage(params);
  tableData.value = records;
  pagination.total = total;
};
const handleChange = (page) => {
  pagination.currentPage = page;
  handleSearch();
};
//分类映射
const categoryMaps = reactive({});
//分类列表
const categories = ref([]);
//列表数据
const tableData = ref([]);
onMounted(async () => {
  const data = await categoryTree();
  console.log(data, "分类树");
  categories.value = data.map((item) => {
    categoryMaps[item.id] = item.categoryName;
    return {
      label: item.categoryName,
      value: item.id,
    };
  });
  formItem[1].options = categories.value;
  //获取列表
  handleSearch();
});
//新增文章和编辑弹窗
const dialogVisible = ref(false);
const currentArticle = ref(null);
const handleSuccess = () => {
  //刷新列表
  dialogVisible.value = false;
};
const handleEdit = (row) => {
  if (!row.id) {
    currentArticle.value = null;
    dialogVisible.value = true;
  } else {
    //编辑
    getArticleDetail(row.id).then((res) => {
      console.log(res, "文章详情");
      currentArticle.value = res;
      dialogVisible.value = true;
    });
  }
};
//发布
const handlePublish = (row) => {
  ElMessageBox.confirm(`确认发布文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定发布",
    cancelButtonText: "取消",
    type: "info",
  }).then(() => {
    changeArticleStatus(row.id, { status: 1 }).then((res) => {
      ElMessage.success("发布成功");
      handleSearch();
    });
  });
};
//下线
const handleUnpublish = (row) => {
  ElMessageBox.confirm(`确认下线文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定下线",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    changeArticleStatus(row.id, { status: 2 }).then((res) => {
      ElMessage.success("下线成功");
      handleSearch();
    });
  });
};
//删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "danger",
  }).then(() => {
    deleteArticle(row.id).then((res) => {
      ElMessage.success("删除成功");
      handleSearch();
    });
  });
};
</script>

<template>
  <div>
    <PageHead title="知识文章">
      <template #buttons>
        <el-button type="primary" @click="handleEdit({})">新增</el-button>
        <el-button type="primary">编辑</el-button>
      </template>
    </PageHead>
    <TableSearch :formItem="formItem" @search="handleSearch" />
    <el-table :data="tableData" style="width: 100%; margin-top: 25px">
      <el-table-column label="文章标题" fixed="left">
        <template #default="scope">
          <div style="display: flex; align-items: center">
            <el-icon><timer /></el-icon>
            <span>{{ scope.row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="200px">
        <template #default="scope">
          <div style="display: flex; align-items: center">
            <el-icon><timer /></el-icon>
            <span>{{ categoryMaps[scope.row.categoryId] }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="authorName" width="150px" label="作者" />
      <el-table-column prop="readCount" width="150px" label="阅读量" />
      <el-table-column prop="updatedAt" width="150px" label="发布时间" />
      <el-table-column label="操作" width="240px" fixed="right">
        <template #default="scope">
          <el-button text type="primary" @click="handleEdit(scope.row)"
            >编辑</el-button
          >
          <el-button
            v-if="scope.row.status === 0 || scope.row.status === 2"
            text
            type="success"
            @click="handlePublish(scope.row)"
            >发布</el-button
          >
          <el-button
            v-if="scope.row.status === 1"
            text
            type="warning"
            @click="handleUnpublish(scope.row)"
            >下线</el-button
          >
          <el-button text type="danger" @click="handleDelete(scope.row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      style="margin-top: 25px"
      :page-size="pagination.size"
      layout="prev,pager,next"
      :total="pagination.total"
      @change="handleChange"
    />
    <ArticleDialog
      v-model:modelValue="dialogVisible"
      :categories="categories"
      @success="handleSuccess"
      :article="currentArticle"
    />
  </div>
</template>

<style scoped></style>
