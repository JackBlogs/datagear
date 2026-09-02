<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAbout, type AboutInfo } from '@/api/public'

const { t } = useI18n()

const info = ref<AboutInfo>({
  name: 'DataGear',
  fullName: 'DataGear 数据可视化分析平台',
  version: '6.0.0',
  officialSite: 'http://www.datagear.tech',
  sourceCode: 'http://www.datagear.tech',
  license: 'LGPL-3.0',
})

onMounted(async () => {
  try {
    info.value = await getAbout()
  } catch {
    // 保持默认值
  }
})
</script>

<template>
  <div class="about-page page page-form h-full p-card no-border h-screen m-0 p-1">
    <form class="flex flex-column h-full">
      <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid mb-3">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">{{ info.fullName }}</div>
        </div>
        <div class="field grid mb-3">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('version') }}</label>
          <div class="field-input col-12 md:col-9">{{ info.version }}</div>
        </div>
        <div class="field grid mb-3">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('officialSite') }}</label>
          <div class="field-input col-12 md:col-9 text-primary">
            <a :href="info.officialSite" target="_blank" class="link text-primary">{{ info.officialSite }}</a>
          </div>
        </div>
        <div class="field grid mb-3">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('sourceCode') }}</label>
          <div class="field-input col-12 md:col-9 text-primary">
            <a :href="info.sourceCode" target="_blank" class="link text-primary">{{ info.sourceCode }}</a>
          </div>
        </div>
        <div class="field grid mb-3">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('license') }}</label>
          <div class="field-input col-12 md:col-9 text-primary">
            <a href="https://www.gnu.org/licenses/" target="_blank" class="link text-primary">{{ info.license }}</a>
          </div>
        </div>
        <div class="field grid mb-0">
          <div class="col-12 text-color-secondary text-sm overflow-auto">
<pre>
Copyright 2018-present datagear.tech

DataGear is free software: you can redistribute it and/or modify it under the terms of
the GNU Lesser General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version.

DataGear is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with DataGear.
If not, see &lt;https://www.gnu.org/licenses/&gt;.
</pre>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.about-page {
  padding: 1rem;
}
.link:hover {
  text-decoration: underline;
}
pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
