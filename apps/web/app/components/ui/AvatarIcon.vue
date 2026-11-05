<script setup lang="ts">
// Eight simple flat child faces, drawn in code (no external art, no licence issue).
const props = withDefaults(defineProps<{ id: string; size?: number }>(), { size: 56 })

interface Look {
  bg: string
  skin: string
  hair: string
  style: 'short' | 'long' | 'curly' | 'bun' | 'cap'
}

const LOOKS: Record<string, Look> = {
  'kid-1': { bg: '#cfe8d8', skin: '#f3cfae', hair: '#7a4a24', style: 'short' },
  'kid-2': { bg: '#fde3b0', skin: '#e9b48a', hair: '#2f2118', style: 'long' },
  'kid-3': { bg: '#cde4ee', skin: '#9a6644', hair: '#1f1712', style: 'curly' },
  'kid-4': { bg: '#f7d4cc', skin: '#f6d9c2', hair: '#d97a32', style: 'bun' },
  'kid-5': { bg: '#e2dcf2', skin: '#c58a5f', hair: '#3a2416', style: 'cap' },
  'kid-6': { bg: '#d9ecc4', skin: '#6f4630', hair: '#141010', style: 'short' },
  'kid-7': { bg: '#fbe7c6', skin: '#f0c7a0', hair: '#e2b84c', style: 'long' },
  'kid-8': { bg: '#d6e6f7', skin: '#b67a52', hair: '#4a2c1a', style: 'curly' },
}

const look = computed(() => LOOKS[props.id] ?? LOOKS['kid-1']!)
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true" class="shrink-0">
    <circle cx="32" cy="32" r="32" :fill="look.bg" />
    <!-- Long hair behind the face -->
    <path v-if="look.style === 'long'" d="M14 30c0-14 8-20 18-20s18 6 18 20v20H14z" :fill="look.hair" />
    <!-- Body -->
    <path d="M14 64c2-10 9-14 18-14s16 4 18 14z" fill="#167d8d" />
    <!-- Face -->
    <circle cx="32" cy="32" r="15" :fill="look.skin" />
    <circle cx="17.5" cy="33" r="3" :fill="look.skin" />
    <circle cx="46.5" cy="33" r="3" :fill="look.skin" />
    <!-- Hair on top -->
    <path v-if="look.style === 'short' || look.style === 'long'" d="M17 30c0-10 7-15 15-15s15 5 15 15c-4-5-10-7-15-7s-11 2-15 7z" :fill="look.hair" />
    <g v-else-if="look.style === 'curly'" :fill="look.hair">
      <circle cx="20" cy="24" r="6" /><circle cx="27" cy="18" r="6.5" /><circle cx="36" cy="17.5" r="6.5" /><circle cx="44" cy="23" r="6" />
    </g>
    <g v-else-if="look.style === 'bun'" :fill="look.hair">
      <circle cx="32" cy="12" r="6" />
      <path d="M17 30c0-10 7-15 15-15s15 5 15 15c-3-6-9-8-15-8s-12 2-15 8z" />
    </g>
    <g v-else>
      <path d="M17 27c0-8 7-13 15-13s15 5 15 13z" fill="#f2bb45" />
      <rect x="30" y="25" width="22" height="4" rx="2" fill="#f2bb45" />
    </g>
    <!-- Eyes, cheeks, smile -->
    <circle cx="26.5" cy="33" r="1.8" fill="#243c40" />
    <circle cx="37.5" cy="33" r="1.8" fill="#243c40" />
    <circle cx="23.5" cy="37.5" r="2.2" fill="#f19a8a" opacity=".55" />
    <circle cx="40.5" cy="37.5" r="2.2" fill="#f19a8a" opacity=".55" />
    <path d="M27.5 39.5q4.5 4 9 0" stroke="#243c40" stroke-width="1.8" fill="none" stroke-linecap="round" />
  </svg>
</template>
