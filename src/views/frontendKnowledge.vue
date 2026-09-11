<script setup lang="ts">
import { getKnowledgeList } from "@/api/frontend";
import { dayjs } from "element-plus";
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const iconUrl = new URL("@/assets/images/book.png", import.meta.url).href;

interface ArticleItem {
  id: number | string
  title?: string
  coverImage?: string
  categoryName?: string
  authorName?: string
  updatedAt?: string
  readCount?: number
  [key: string]: unknown
}

//推荐阅读列表
const recommendList = ref<ArticleItem[]>([]);
//右侧列表数据
const articleList = ref<ArticleItem[]>([]);
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
});
//获取列表数据
const getPageList = () => {
  const params = {
    sortField: "publishedAt",
    SortDirection: "desc",
    ...pagination,
  };
  getKnowledgeList(params).then((res) => {
    articleList.value = res.records as ArticleItem[];
    pagination.total = res.total;
  });
};
//获取封面图片
const getImage = (url?: string) => {
  return url
    ? "http://159.75.169.224:1235" + url
    : "data:image/webp;base64,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";
};
const handleChange = (page: number) => {
  pagination.currentPage = page;
  getPageList();
};
//跳转详情页面
const goToArticle = (id: number | string) => {
  router.push(`/knowledge/article/${id}`);
};
onMounted(() => {
  //获取推荐阅读列表
  const params = {
    sortField: "readCount",
    SortDirection: "desc",
    currentPage: 1,
    size: 5,
  };
  getPageList();
  getKnowledgeList(params).then((res) => {
    recommendList.value = res.records as ArticleItem[];
  });
});
</script>

<template>
  <div class="knowledge-container">
    <div class="header-section">
      <div class="header-content">
        <el-image :src="iconUrl" style="width: 60px; height: 60px"></el-image>
        <h1>知识库</h1>
      </div>
    </div>
    <div class="content">
      <!-- 左侧菜单 -->
      <div class="recommend-section">
        <div class="section-title">推荐阅读</div>
        <div class="recommend-list">
          <div
            v-for="item in recommendList"
            :key="item.id"
            class="recommend-item"
            @click="goToArticle(item.id)"
          >
            <h4>{{ item.title }}</h4>
            <p class="read-count">
              <el-icon><Histogram /></el-icon>
              阅读量：{{ item.readCount }}
            </p>
          </div>
        </div>
      </div>
      <!-- 右侧内容 -->
      <div class="article-list">
        <div
          v-for="item in articleList"
          :key="item.id"
          class="article-item"
          @click="goToArticle(item.id)"
        >
          <el-image
            :src="getImage(item.coverImage)"
            style="width: 240px; height: 150px"
          ></el-image>
          <div class="info">
            <div class="title">
              <h3>{{ item.title }}</h3>
              <el-tag Plain type="primary">{{ item.categoryName }}</el-tag>
            </div>
            <div style="margin-top: 10px">
              <div class="flex-box">
                <el-icon><Avatar /></el-icon>
                <span>{{ item.authorName }}</span>
              </div>
              <div class="flex-box">
                <el-icon><List /></el-icon>
                <span>{{ dayjs(item.updatedAt).format("YYYY-MM-DD") }}</span>
              </div>
            </div>
            <div style="margin-top: 10px">
              <div class="flex-box">
                <el-icon><Platform /></el-icon>
                <span>观看人数：{{ item.readCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        style="margin-top: 25px"
        :page-size="pagination.size"
        layout="prev,pager,next"
        :total="pagination.total"
        @change="handleChange"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.knowledge-container {
  background: linear-gradient(135deg, #fafbfc 0%, #f7f9fc 50%, #f2f6fa 100%);
  .flex-box {
    display: flex;
    align-items: center;
    span {
      margin-left: 10px;
    }
  }
  .header-section {
    background: linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%);
    color: white;
    padding: 48px;
    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
  .content {
    display: flex;
    gap: 20px;
    margin: 0 auto;
    width: 1200px;
    padding: 20px;
    .recommend-section {
      width: 280px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
      padding: 15px;
      height: 400px;
      .section-title {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .recommend-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        .recommend-item {
          border-left: 4px solid #f59e0b;
          padding-left: 10px;
          cursor: pointer;
          .read-count {
            margin-top: 15px;
            font-size: 12px;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 10px;
          }
        }
      }
    }
    .article-list {
      flex: 1;
      .article-item {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        padding: 15px;
        margin-bottom: 20px;
        display: flex;
        .info {
          margin-left: 20px;
          .title {
            display: flex;
            align-items: center;
            gap: 10px;
          }
        }
      }
    }
  }
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding-bottom: 30px;
  }
}
</style>
