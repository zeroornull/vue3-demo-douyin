<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import { formatProductPrice, parseProductId } from '@/domain/shop/product'
import { productImageUrl } from '@/features/shop/product-image'
import { useShopStore } from '@/features/shop/store/shop'
import { ROUTE_NAMES } from '@/router'
import '@/features/shop/shop.css'

const route = useRoute()
const shop = useShopStore()
const { error, status } = storeToRefs(shop)

const routeProductId = computed(() => {
  const param = route.params.productId
  return parseProductId(Array.isArray(param) ? param[0] : param)
})
const product = computed(() => {
  const id = routeProductId.value
  return id ? shop.findById(id) : undefined
})
const detailState = computed(() => {
  if (!routeProductId.value) return 'not-found'
  if (status.value === 'idle' || status.value === 'loading') return 'loading'
  if (status.value === 'error') return 'error'
  return product.value ? 'ready' : 'not-found'
})

function load(force = false) {
  void shop.load({ force })
}

watch(
  product,
  (value) => {
    if (value) shop.recordViewed(value.id)
  },
  { immediate: true },
)
onMounted(() => load())
</script>

<template>
  <section class="shop-detail" aria-labelledby="product-title">
    <RouterLink class="shop-back" :to="{ name: ROUTE_NAMES.shop }">← 返回商品列表</RouterLink>

    <div v-if="detailState === 'loading'" class="shop-state" aria-live="polite">
      <p class="eyebrow">Loading</p>
      <h1 id="product-title">正在加载可深链商品…</h1>
    </div>

    <div v-else-if="detailState === 'error'" class="shop-state shop-state-error" role="alert">
      <p class="eyebrow">Parse/API error</p>
      <h1 id="product-title">商品加载失败</h1>
      <p>{{ error?.message }}</p>
      <button type="button" @click="load(true)">重新加载</button>
    </div>

    <div v-else-if="detailState === 'not-found'" class="shop-state" data-testid="product-not-found">
      <p class="eyebrow">Not found</p>
      <h1 id="product-title">商品不存在</h1>
      <p>URL 中的 productId 无效，或 fixture 中没有对应商品。</p>
    </div>

    <template v-else-if="product">
      <div class="detail-hero">
        <div class="detail-cover">
          <img
            :src="productImageUrl(product.coverFile)"
            :alt="product.name"
            width="800"
            height="800"
            decoding="async"
          />
          <span class="detail-id">ID {{ product.id }}</span>
        </div>

        <div class="detail-copy">
          <p class="eyebrow">Deep-link safe product</p>
          <h1 id="product-title">{{ product.name }}</h1>
          <p class="detail-price">{{ formatProductPrice(product.listPriceCents) }}</p>
          <p class="detail-sale-price">
            样板优惠价 <strong>{{ formatProductPrice(product.salePriceCents) }}</strong>
          </p>
          <dl class="detail-facts">
            <div>
              <dt>已售</dt>
              <dd>{{ product.soldCount }}</dd>
            </div>
            <div>
              <dt>折扣</dt>
              <dd>{{ product.discountLabel || '无' }}</dd>
            </div>
            <div>
              <dt>近期低价</dt>
              <dd>{{ product.isRecentLowPrice ? '是' : '否' }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section class="detail-gallery" aria-labelledby="gallery-title">
        <div class="shop-heading">
          <div>
            <p class="eyebrow">Local verified assets</p>
            <h2 id="gallery-title">商品图片</h2>
          </div>
          <span>{{ product.imageFiles.length }} 张</span>
        </div>
        <ul>
          <li v-for="(image, index) in product.imageFiles" :key="image">
            <img
              :src="productImageUrl(image)"
              :alt="`${product.name} 图片 ${index + 1}`"
              width="600"
              height="600"
              decoding="async"
            />
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
