<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { formatProductPrice } from '@/domain/shop/product'
import { productImageUrl } from '@/features/shop/product-image'
import { useShopStore } from '@/features/shop/store/shop'
import { ROUTE_NAMES } from '@/router'
import '@/features/shop/shop.css'

const shop = useShopStore()
const { error, items, status } = storeToRefs(shop)

function load(force = false) {
  void shop.load({ force })
}

onMounted(() => load())
</script>

<template>
  <section class="shop-page" aria-labelledby="shop-title">
    <div class="shop-heading">
      <div>
        <p class="eyebrow">Round 2 · Typed vertical slice</p>
        <h1 id="shop-title">商品样板</h1>
        <p>6 个唯一商品来自旧 fixture，经运行时 parser 转换为严格 Domain model。</p>
      </div>
      <div class="shop-contract">
        <span>unknown</span>
        <span aria-hidden="true">→</span>
        <span>DTO</span>
        <span aria-hidden="true">→</span>
        <span>Product</span>
      </div>
    </div>

    <div v-if="status === 'idle' || status === 'loading'" class="shop-state" aria-live="polite">
      <p class="eyebrow">Loading</p>
      <h2>正在验证商品契约…</h2>
    </div>

    <div v-else-if="status === 'error'" class="shop-state shop-state-error" role="alert">
      <p class="eyebrow">Parse/API error</p>
      <h2>商品数据无法使用</h2>
      <p>{{ error?.message }}</p>
      <button type="button" @click="load(true)">重新加载</button>
    </div>

    <div v-else-if="status === 'empty'" class="shop-state">
      <p class="eyebrow">Empty</p>
      <h2>目前没有商品</h2>
    </div>

    <ul v-else class="product-grid" data-testid="product-grid">
      <li v-for="product in items" :key="product.id">
        <RouterLink
          class="product-card"
          :to="{ name: ROUTE_NAMES.shopDetail, params: { productId: product.id } }"
        >
          <div class="product-media">
            <img
              :src="productImageUrl(product.coverFile)"
              :alt="product.name"
              width="600"
              height="600"
              decoding="async"
            />
            <span v-if="product.isRecentLowPrice" class="product-badge">近期低价</span>
          </div>
          <div class="product-copy">
            <h2>{{ product.name }}</h2>
            <p v-if="product.discountLabel" class="product-discount">
              {{ product.discountLabel }}
            </p>
            <div class="product-price-row">
              <strong>{{ formatProductPrice(product.listPriceCents) }}</strong>
              <span>已售 {{ product.soldCount }}</span>
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
