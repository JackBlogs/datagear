<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import CodeMirror from 'codemirror'
import 'codemirror/mode/sql/sql'
import 'codemirror/lib/codemirror.css'

/**
 * CodeMirror 5 编辑器封装（P2 useSqlEditor 的底层组件）。
 * 后端 SQL 补全（findTableNames/findColumns）后续接入 hint 插件。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    mode?: string
    lineNumbers?: boolean
  }>(),
  { mode: 'text/x-sql', lineNumbers: true },
)
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const el = ref<HTMLTextAreaElement>()
let editor: CodeMirror.Editor | null = null

onMounted(() => {
  if (!el.value) return
  editor = CodeMirror.fromTextArea(el.value, {
    mode: props.mode,
    lineNumbers: props.lineNumbers,
    value: props.modelValue,
    lineWrapping: true,
  })
  editor.on('change', () => {
    emit('update:modelValue', editor!.getValue())
  })
})

watch(
  () => props.modelValue,
  (v) => {
    if (editor && v !== editor.getValue()) editor.setValue(v)
  },
)

onBeforeUnmount(() => {
  // toTextArea 还原 textarea（@types/codemirror 未完整声明该方法，故断言 any）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(editor as any)?.toTextArea()
  editor = null
})
</script>

<template>
  <textarea ref="el" />
</template>
